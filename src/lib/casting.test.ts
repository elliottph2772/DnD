import { describe, expect, it } from 'vitest';
import {
  activeSlot,
  canCast,
  castableNames,
  castAt,
  casts,
  castingMod,
  longRest,
  needsNewPicks,
  ordinal,
  preparableNames,
  preparedLimit,
  prepares,
  refund,
  shortRest,
  slotRows,
  togglePrepared,
  upcastOptions,
} from './casting';
import { blankCharacter } from './world';
import type { Character } from '../types';

/** A level-3 character of the given class, built, with full health. */
const make = (cls: string, over: Partial<Character> = {}): Character => ({
  ...blankCharacter(),
  cls,
  level: 3,
  built: true,
  spellsAt: 3,
  maxHp: 20,
  hp: 20,
  scores: { STR: 10, DEX: 10, CON: 10, INT: 16, WIS: 16, CHA: 16 },
  ...over,
});

describe('slotRows', () => {
  it('gives a level-3 full caster four 1st and two 2nd', () => {
    expect(slotRows(make('Wizard'))).toEqual([
      { level: 1, total: 4, used: 0, left: 4 },
      { level: 2, total: 2, used: 0, left: 2 },
    ]);
  });

  it('gives a level-3 half caster three 1st and nothing else', () => {
    expect(slotRows(make('Paladin'))).toEqual([{ level: 1, total: 3, used: 0, left: 3 }]);
  });

  it('gives a level-3 warlock two 2nd-level pact slots and no 1st', () => {
    expect(slotRows(make('Warlock'))).toEqual([{ level: 2, total: 2, used: 0, left: 2 }]);
  });

  it('gives a non-caster nothing', () => {
    expect(slotRows(make('Fighter'))).toEqual([]);
  });

  it('subtracts what has been spent', () => {
    const rows = slotRows(make('Wizard', { slotsUsed: { '1': 3 } }));
    expect(rows[0]).toEqual({ level: 1, total: 4, used: 3, left: 1 });
  });

  it('never reports more spent than held, even after a slot table shrinks', () => {
    const rows = slotRows(make('Wizard', { slotsUsed: { '1': 99 } }));
    expect(rows[0]).toEqual({ level: 1, total: 4, used: 4, left: 0 });
  });

  it('reads the subclass label without tripping on the parentheses', () => {
    expect(slotRows(make('Wizard (School of Evocation)'))).toHaveLength(2);
  });
});

describe('casts', () => {
  it('knows who casts', () => {
    expect(casts(make('Wizard'))).toBe(true);
    expect(casts(make('Paladin'))).toBe(true);
    expect(casts(make('Barbarian'))).toBe(false);
    expect(casts(make('Rogue'))).toBe(false);
  });
});

describe('upcasting', () => {
  it('offers a 1st-level spell both its own slot and the 2nd', () => {
    expect(upcastOptions(make('Wizard'), 1)).toEqual([1, 2]);
  });

  it('offers a 2nd-level spell only the 2nd', () => {
    expect(upcastOptions(make('Wizard'), 2)).toEqual([2]);
  });

  it('drops a level once its slots are gone', () => {
    const spent = make('Wizard', { slotsUsed: { '1': 4 } });
    expect(upcastOptions(spent, 1)).toEqual([2]);
  });

  it('offers a cantrip nothing, because it needs no slot', () => {
    expect(upcastOptions(make('Wizard'), 0)).toEqual([]);
  });

  it('lets a warlock cast a 1st-level spell from its 2nd-level pact slot', () => {
    expect(upcastOptions(make('Warlock'), 1)).toEqual([2]);
  });
});

describe('canCast', () => {
  it('always allows a cantrip, even with every slot gone', () => {
    const dry = make('Wizard', { slotsUsed: { '1': 4, '2': 2 } });
    expect(canCast(dry, 0)).toBe(true);
  });

  it('refuses a levelled spell with nothing left at or above it', () => {
    const dry = make('Wizard', { slotsUsed: { '1': 4, '2': 2 } });
    expect(canCast(dry, 1)).toBe(false);
  });

  it('refuses a spell above the highest slot the character has', () => {
    expect(canCast(make('Wizard'), 3)).toBe(false);
  });
});

describe('castAt', () => {
  it('spends one slot of the chosen level', () => {
    const after = castAt(make('Wizard'), 1);
    expect(after.slotsUsed).toEqual({ '1': 1 });
  });

  it('spends the upcast slot, not the spell’s own level', () => {
    const after = castAt(make('Wizard'), 2);
    expect(after.slotsUsed).toEqual({ '2': 1 });
  });

  it('refuses to drive a slot negative when none are left', () => {
    const dry = make('Wizard', { slotsUsed: { '1': 4 } });
    expect(castAt(dry, 1)).toBe(dry);
  });

  it('ignores a cantrip', () => {
    const c = make('Wizard');
    expect(castAt(c, 0)).toBe(c);
  });
});

describe('refund', () => {
  it('hands a spent slot back', () => {
    const spent = make('Wizard', { slotsUsed: { '1': 2 } });
    expect(refund(spent, 1).slotsUsed).toEqual({ '1': 1 });
  });

  it('does nothing when none of that level were spent', () => {
    const c = make('Wizard');
    expect(refund(c, 1)).toBe(c);
  });
});

describe('rests', () => {
  it('gives a warlock its pact slots back on a short rest', () => {
    const spent = make('Warlock', { slotsUsed: { '2': 2 } });
    expect(shortRest(spent).slotsUsed).toEqual({});
  });

  it('gives a wizard nothing back on a short rest', () => {
    const spent = make('Wizard', { slotsUsed: { '1': 3 } });
    expect(shortRest(spent).slotsUsed).toEqual({ '1': 3 });
  });

  it('gives every slot back on a long rest, and fills hit points', () => {
    const hurt = make('Wizard', { slotsUsed: { '1': 4, '2': 2 }, hp: 3, temp: 5 });
    const rested = longRest(hurt);
    expect(rested.slotsUsed).toEqual({});
    expect(rested.hp).toBe(rested.maxHp);
    expect(rested.temp).toBe(0);
  });

  it('does not raise hit points past the maximum', () => {
    const rested = longRest(make('Wizard', { hp: 20, maxHp: 20 }));
    expect(rested.hp).toBe(20);
  });
});

describe('prepared spells', () => {
  it('knows which classes prepare', () => {
    expect(prepares(make('Cleric'))).toBe(true);
    expect(prepares(make('Wizard'))).toBe(true);
    expect(prepares(make('Bard'))).toBe(false);
    expect(prepares(make('Fighter'))).toBe(false);
  });

  it('limits a cleric to WIS mod + level', () => {
    // WIS 16 is +3, level 3 → 6.
    expect(preparedLimit(make('Cleric'))).toBe(6);
  });

  it('limits a paladin to CHA mod + half level', () => {
    // CHA 16 is +3, level 3 halves to 1 → 4.
    expect(preparedLimit(make('Paladin'))).toBe(4);
  });

  it('limits a wizard to INT mod + level, not the size of its spellbook', () => {
    // The book holds 6 + 2 per level — 10 at level 3 — but only INT mod (3)
    // plus level (3) may be prepared from it.
    const wiz = make('Wizard', { spells: Array.from({ length: 10 }, (_, i) => `s${i}`) });
    expect(wiz.spells).toHaveLength(10);
    expect(preparedLimit(wiz)).toBe(6);
  });

  it('lets a known caster hold everything it knows', () => {
    const bard = make('Bard', { spells: ['Charm Person', 'Healing Word'] });
    expect(preparedLimit(bard)).toBe(2);
  });

  it('prepares a wizard out of its own spellbook', () => {
    const wiz = make('Wizard', { spells: ['Shield', 'Magic Missile'] });
    expect(preparableNames(wiz)).toEqual(['Shield', 'Magic Missile']);
  });

  it('prepares a cleric out of the whole class list', () => {
    const names = preparableNames(make('Cleric'));
    expect(names.length).toBeGreaterThan(10);
    expect(names).toContain('Cure Wounds');
  });

  it('offers a known caster nothing to prepare', () => {
    expect(preparableNames(make('Bard'))).toEqual([]);
  });

  it('adds and removes a prepared spell', () => {
    const wiz = make('Wizard', { spells: ['Shield'], prepared: [] });
    const on = togglePrepared(wiz, 'Shield');
    expect(on.prepared).toEqual(['Shield']);
    expect(togglePrepared(on, 'Shield').prepared).toEqual([]);
  });

  it('refuses to prepare past the limit', () => {
    // CHA 16 Paladin at level 3 may prepare 4.
    const pal = make('Paladin', { prepared: ['a', 'b', 'c', 'd'] });
    expect(togglePrepared(pal, 'Bless')).toBe(pal);
  });
});

describe('castableNames', () => {
  it('gives a prepared caster its cantrips and prepared list', () => {
    const cleric = make('Cleric', {
      cantrips: ['Guidance'],
      spells: ['Bless', 'Cure Wounds'],
      prepared: ['Bless'],
    });
    expect(castableNames(cleric)).toEqual(['Guidance', 'Bless']);
  });

  it('gives a known caster its cantrips and everything it knows', () => {
    const bard = make('Bard', { cantrips: ['Vicious Mockery'], spells: ['Charm Person'] });
    expect(castableNames(bard)).toEqual(['Vicious Mockery', 'Charm Person']);
  });

  it('gives a non-caster nothing', () => {
    expect(castableNames(make('Fighter', { cantrips: ['x'] }))).toEqual([]);
  });
});

describe('castingMod', () => {
  it('reads the class’s own ability', () => {
    expect(castingMod(make('Wizard'))).toBe(3); // INT 16
    expect(castingMod(make('Cleric'))).toBe(3); // WIS 16
    expect(castingMod(make('Bard'))).toBe(3); // CHA 16
    expect(castingMod(make('Fighter'))).toBe(0);
  });
});

describe('needsNewPicks', () => {
  it('asks for new picks once the agent awards a level', () => {
    expect(needsNewPicks(make('Wizard', { level: 4, spellsAt: 3 }))).toBe(true);
  });

  it('stays quiet while the picks match the level', () => {
    expect(needsNewPicks(make('Wizard'))).toBe(false);
  });

  it('never asks a non-caster', () => {
    expect(needsNewPicks(make('Fighter', { level: 4, spellsAt: 3 }))).toBe(false);
  });

  it('never asks about a sheet that was never built', () => {
    expect(needsNewPicks(make('Wizard', { built: false, level: 4, spellsAt: 3 }))).toBe(false);
  });
});

describe('ordinal', () => {
  it('names the slot levels', () => {
    expect([1, 2, 3, 9].map(ordinal)).toEqual(['1st', '2nd', '3rd', '9th']);
  });
});

describe('activeSlot', () => {
  it('keeps the level the player picked while it is still available', () => {
    expect(activeSlot(make('Wizard'), 1, 1)).toBe(1);
    expect(activeSlot(make('Wizard'), 1, 2)).toBe(2);
  });

  it('falls to the next usable slot once the picked one is spent', () => {
    // This is the regression: the select showed "Upcast from 2nd" while the
    // state still said 1, so Cast spent a slot that was no longer there.
    const dry = make('Wizard', { slotsUsed: { '1': 4 } });
    expect(activeSlot(dry, 1, 1)).toBe(2);
  });

  it('returns 0 when nothing can carry the spell', () => {
    const dry = make('Wizard', { slotsUsed: { '1': 4, '2': 2 } });
    expect(activeSlot(dry, 1, 1)).toBe(0);
  });

  it('returns 0 for a cantrip, which needs no slot', () => {
    expect(activeSlot(make('Wizard'), 0, 0)).toBe(0);
  });
});
