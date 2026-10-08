import { describe, expect, it } from 'vitest';
import {
  applyCondition,
  blankCharacter,
  blankParty,
  conditionExpires,
  dropExpired,
  mergeChatRow,
  newCode,
  pendingChat,
  releaseCondition,
  shouldApplyWorld,
  tickRound,
  worldRow,
  blankWorld,
} from './world';
import type { ChatLine } from '../types';

describe('shouldApplyWorld', () => {
  const me = 'me';

  it('ignores your own write coming back on the channel', () => {
    expect(shouldApplyWorld({ by: me }, { clientId: me, isGM: false })).toBe(false);
    expect(shouldApplyWorld({ by: me }, { clientId: me, isGM: true })).toBe(false);
  });

  it('lets a player apply every other row', () => {
    expect(shouldApplyWorld({ by: 'someone' }, { clientId: me, isGM: false })).toBe(true);
    expect(shouldApplyWorld({ by: 'gm-agent' }, { clientId: me, isGM: false })).toBe(true);
  });

  it('has the GM ignore other clients but accept the server agent', () => {
    // This is what lets the GM advance the scene from their phone.
    expect(shouldApplyWorld({ by: 'gm-agent' }, { clientId: me, isGM: true })).toBe(true);
    expect(shouldApplyWorld({ by: 'another-tab' }, { clientId: me, isGM: true })).toBe(false);
  });

  it('applies the initial pull for the GM too', () => {
    // Opening a saved campaign must pull its world, not push over it.
    expect(shouldApplyWorld({ by: 'another-tab' }, { clientId: me, isGM: true, force: true })).toBe(true);
  });

  it('is false for a missing row', () => {
    expect(shouldApplyWorld(null, { clientId: me, isGM: false })).toBe(false);
    expect(shouldApplyWorld(undefined, { clientId: me, isGM: false })).toBe(false);
  });
});

describe('chat and the cursor', () => {
  const lines: ChatLine[] = [
    { id: 1, speaker: 'Vex', text: 'I listen at the door' },
    { id: 2, speaker: 'Brann', text: 'I draw my axe' },
    { id: 3, speaker: 'Vex', text: 'Wait' },
  ];

  it('counts only declarations past the cursor as pending', () => {
    expect(pendingChat(lines, 0)).toHaveLength(3);
    expect(pendingChat(lines, 2)).toEqual([lines[2]]);
    expect(pendingChat(lines, 3)).toEqual([]);
  });

  it('drops a realtime row the agent already resolved', () => {
    expect(mergeChatRow([], { id: 2, speaker: 'Vex', text: 'late' }, 5)).toEqual([]);
  });

  it('never adds the same row twice', () => {
    const once = mergeChatRow([], lines[0], 0);
    expect(mergeChatRow(once, lines[0], 0)).toHaveLength(1);
  });

  it('ignores an empty row', () => {
    expect(mergeChatRow(lines, { id: 9, speaker: 'Vex', text: '' }, 0)).toBe(lines);
  });

  it('keeps the newest thirty', () => {
    let chat: ChatLine[] = [];
    for (let i = 1; i <= 40; i++) chat = mergeChatRow(chat, { id: i, speaker: 'x', text: 't' }, 0);
    expect(chat).toHaveLength(30);
    expect(chat[0].id).toBe(11);
    expect(chat[29].id).toBe(40);
  });
});

describe('the condition clock', () => {
  it('turns a duration into an absolute round', () => {
    expect(conditionExpires(4, 10)).toBe(14);
  });

  it('gives a zero-round duration no clock at all', () => {
    // Save ends, Concentration and Until removed are released by hand.
    expect(conditionExpires(4, 0)).toBe(0);
  });

  it('drops a condition when its round arrives, not before', () => {
    let c = blankCharacter();
    c = applyCondition(c, { name: 'Prone', label: '1 round', rounds: 1, expires: 5 });
    expect(dropExpired(c, 4).cond).toHaveLength(1);
    expect(dropExpired(c, 5).cond).toHaveLength(0);
    expect(dropExpired(c, 6).cond).toHaveLength(0);
  });

  it('never drops a condition with no clock', () => {
    let c = blankCharacter();
    c = applyCondition(c, { name: 'Petrified', label: 'Until removed', rounds: 0, expires: 0 });
    expect(dropExpired(c, 999).cond).toHaveLength(1);
  });

  it('advances the round and expires across the whole party', () => {
    const party = blankParty().map((c, i) =>
      i < 2 ? applyCondition(c, { name: 'Stunned', label: '1 round', rounds: 1, expires: 3 }) : c,
    );
    const after = tickRound(party, 2);
    expect(after.round).toBe(3);
    expect(after.party.every((c) => c.cond.length === 0)).toBe(true);
  });

  it('keeps conditions[] as a mirror of cond[] for the agent prompt', () => {
    let c = blankCharacter();
    c = applyCondition(c, { name: 'Poisoned', label: '1 minute', rounds: 10, expires: 11 });
    c = applyCondition(c, { name: 'Prone', label: '1 round', rounds: 1, expires: 2 });
    expect(c.conditions).toEqual(['Poisoned', 'Prone']);
    c = releaseCondition(c, 'Poisoned');
    expect(c.conditions).toEqual(['Prone']);
    expect(c.cond.map((x) => x.name)).toEqual(c.conditions);
  });

  it('re-applying a condition replaces it rather than stacking', () => {
    let c = blankCharacter();
    c = applyCondition(c, { name: 'Prone', label: '1 round', rounds: 1, expires: 2 });
    c = applyCondition(c, { name: 'Prone', label: '1 minute', rounds: 10, expires: 12 });
    expect(c.cond).toHaveLength(1);
    expect(c.cond[0].expires).toBe(12);
  });
});

describe('worldRow', () => {
  it('caps the feed, the journal and the bestiary', () => {
    const w = blankWorld('me');
    w.feed = Array.from({ length: 60 }, (_, i) => ({ speaker: 'GM', text: `line ${i}` }));
    w.journal = Array.from({ length: 30 }, (_, i) => ({ title: `t${i}`, text: 'x' }));
    w.bestiary = Array.from({ length: 12 }, (_, i) => ({ name: `foe ${i}` }));

    const row = worldRow(w, 'me');
    expect(row.feed).toHaveLength(40);
    expect(row.feed[0].text).toBe('line 20');
    expect(row.journal).toHaveLength(20);
    expect(row.bestiary).toHaveLength(8);
  });

  it('stamps the writer', () => {
    expect(worldRow(blankWorld('old'), 'new').by).toBe('new');
  });
});

describe('newCode', () => {
  it('is eight characters from an alphabet with no lookalikes', () => {
    for (let i = 0; i < 200; i++) {
      const code = newCode();
      expect(code).toHaveLength(8);
      expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/);
      // 0/O and 1/I are the pairs people mishear reading a code aloud.
      expect(code).not.toMatch(/[01OI]/);
    }
  });
});

describe('blankCharacter', () => {
  it('starts where the wizard commits: level 3, unbuilt, no picks made', () => {
    const c = blankCharacter();
    expect(c.level).toBe(3);
    expect(c.xp).toBe(900);
    expect(c.ac).toBe(10);
    expect(c.built).toBe(false);
    // spellsAt !== level is what puts a new character in front of the list.
    expect(c.spellsAt).toBe(0);
    expect(c.scores).toEqual({ STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 });
  });

  it('hands out four independent seats', () => {
    const party = blankParty();
    party[0].name = 'Vex';
    expect(party[1].name).toBe('');
  });
});
