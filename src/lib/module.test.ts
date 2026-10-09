import { describe, expect, it } from 'vitest';
import { ASHFALL, blankModuleState, MODULES, moduleById } from '../data/modules';
import {
  exitsFrom,
  fireScene,
  isRevealed,
  liveScenes,
  locationIn,
  moduleBrief,
  moduleFor,
  moveTo,
  npcIn,
  reveal,
  seedWorldFrom,
} from './module';

const start = () => blankModuleState(ASHFALL.id, ASHFALL.opening.location);

describe('the module registry', () => {
  it('resolves a module by id', () => {
    expect(moduleById('ashfall')?.title).toBe('The Ashfall Compact');
    expect(moduleById('nope')).toBeNull();
  });

  it('resolves the module a campaign is running', () => {
    expect(moduleFor(start())?.id).toBe('ashfall');
    expect(moduleFor(null)).toBeNull();
  });
});

describe('The Ashfall Compact is internally consistent', () => {
  for (const module of MODULES) {
    it(`${module.title}: every exit points at a real location`, () => {
      const ids = new Set(module.locations.map((l) => l.id));
      for (const loc of module.locations) {
        for (const exit of loc.exits) {
          expect(ids, `${loc.id} → ${exit.to}`).toContain(exit.to);
        }
      }
    });

    it(`${module.title}: every NPC placed in a location exists`, () => {
      const ids = new Set(module.npcs.map((n) => n.id));
      for (const loc of module.locations) {
        for (const npc of loc.npcs) expect(ids, `${loc.id} holds ${npc}`).toContain(npc);
      }
    });

    it(`${module.title}: every foe named by a location exists in the bestiary`, () => {
      const ids = new Set(module.bestiary.map((f) => f.id));
      for (const loc of module.locations) {
        for (const foe of loc.foes ?? []) expect(ids, `${loc.id} → ${foe}`).toContain(foe);
      }
    });

    it(`${module.title}: opens somewhere that exists`, () => {
      expect(locationIn(module, module.opening.location)).toBeTruthy();
    });

    it(`${module.title}: ids are unique within each collection`, () => {
      for (const list of [module.locations, module.npcs, module.scenes, module.bestiary]) {
        const ids = (list as { id: string }[]).map((x) => x.id);
        expect(new Set(ids).size).toBe(ids.length);
      }
    });

    it(`${module.title}: every location is reachable from the opening`, () => {
      const seen = new Set([module.opening.location]);
      const queue = [module.opening.location];
      while (queue.length) {
        const here = locationIn(module, queue.shift()!);
        for (const exit of here?.exits ?? []) {
          if (!seen.has(exit.to)) {
            seen.add(exit.to);
            queue.push(exit.to);
          }
        }
      }
      const stranded = module.locations.filter((l) => !seen.has(l.id)).map((l) => l.id);
      expect(stranded).toEqual([]);
    });

    it(`${module.title}: states canon the agent must hold to`, () => {
      expect(module.core.canon.length).toBeGreaterThan(0);
      expect(module.core.premise.length).toBeGreaterThan(80);
    });
  }
});

describe('moduleBrief', () => {
  it('always carries the premise, canon and the map', () => {
    const { core } = moduleBrief(ASHFALL, start());
    expect(core).toContain('PREMISE');
    expect(core).toContain('CANON');
    expect(core).toContain('The Tally');
    // Every location is listed by one line, so the agent knows the map exists.
    for (const l of ASHFALL.locations) expect(core).toContain(l.summary);
  });

  it('sends only the location the party is standing in, in full', () => {
    const { here } = moduleBrief(ASHFALL, start());
    const grennhal = locationIn(ASHFALL, 'grennhal')!;
    const waystation = locationIn(ASHFALL, 'waystation')!;
    expect(here).toContain(grennhal.text);
    // The waystation's full text must stay on the shelf — this is the whole
    // point of the split, and the thing that keeps a turn affordable.
    expect(here).not.toContain(waystation.text);
  });

  it('follows the party when they move', () => {
    const moved = moveTo(start(), 'waystation');
    const { here } = moduleBrief(ASHFALL, moved);
    expect(here).toContain('The Ashfall Waystation');
    expect(here).toContain(locationIn(ASHFALL, 'waystation')!.text);
  });

  it('names the NPCs standing here and what they want', () => {
    const { here } = moduleBrief(ASHFALL, start());
    const mara = npcIn(ASHFALL, 'mara')!;
    expect(here).toContain(mara.name);
    expect(here).toContain(mara.wants);
  });

  it('never leaks an unearned NPC secret', () => {
    const { here } = moduleBrief(ASHFALL, start());
    const mara = npcIn(ASHFALL, 'mara')!;
    expect(mara.secret).toBeTruthy();
    expect(here).not.toContain(mara.secret!);
    expect(here).toContain('holding something back');
  });

  it('hands the secret over once it is earned', () => {
    const earned = reveal(start(), 'mara', 0);
    const { here } = moduleBrief(ASHFALL, earned);
    expect(here).toContain(npcIn(ASHFALL, 'mara')!.secret!);
  });

  it('never leaks an unearned location secret, but says how many remain', () => {
    const grennhal = locationIn(ASHFALL, 'grennhal')!;
    const { here } = moduleBrief(ASHFALL, start());
    for (const s of grennhal.secrets ?? []) expect(here).not.toContain(s);
    expect(here).toContain(`${grennhal.secrets!.length} more things to find`);
  });

  it('shows an earned location secret and drops the remaining count', () => {
    const grennhal = locationIn(ASHFALL, 'grennhal')!;
    const earned = reveal(start(), 'grennhal', 0);
    const { here } = moduleBrief(ASHFALL, earned);
    expect(here).toContain(grennhal.secrets![0]);
    expect(here).toContain(`${grennhal.secrets!.length - 1} more things to find`);
  });

  it('offers the scenes that could still fire', () => {
    const { here } = moduleBrief(ASHFALL, start());
    expect(here).toContain('the-ledger');
    expect(here).toContain('SCENES THAT MAY FIRE');
  });

  it('withdraws a once-only scene after it has fired', () => {
    const after = fireScene(start(), 'the-ledger');
    const { here } = moduleBrief(ASHFALL, after);
    expect(here).not.toContain('the-ledger');
  });

  it('copes with a party standing somewhere the module never wrote', () => {
    const lost = { ...start(), at: 'the-moon' };
    const { here } = moduleBrief(ASHFALL, lost);
    expect(here).toContain('Improvise');
  });
});

describe('progress', () => {
  it('remembers everywhere the party has been', () => {
    let s = start();
    s = moveTo(s, 'salted-road');
    s = moveTo(s, 'black-spruce');
    s = moveTo(s, 'salted-road');
    expect(s.at).toBe('salted-road');
    expect(s.seen).toEqual(['grennhal', 'salted-road', 'black-spruce']);
  });

  it('is unchanged by moving to where it already is', () => {
    const s = start();
    expect(moveTo(s, s.at)).toBe(s);
  });

  it('fires a scene once and only once', () => {
    const once = fireScene(start(), 'the-ledger');
    expect(once.fired).toEqual(['the-ledger']);
    expect(fireScene(once, 'the-ledger')).toBe(once);
  });

  it('keeps once-only and repeatable scenes straight', () => {
    const after = fireScene(start(), 'the-ledger');
    const live = liveScenes(ASHFALL, after).map((s) => s.id);
    expect(live).not.toContain('the-ledger');
    // "the-second-trail" has no `once`, so it stays available.
    expect(live).toContain('the-second-trail');
  });

  it('records a revealed secret without duplicating it', () => {
    const once = reveal(start(), 'grennhal', 1);
    expect(isRevealed(once, 'grennhal', 1)).toBe(true);
    expect(isRevealed(once, 'grennhal', 0)).toBe(false);
    expect(reveal(once, 'grennhal', 1)).toBe(once);
  });
});

describe('exitsFrom', () => {
  it('lists where the party can go next', () => {
    expect(exitsFrom(ASHFALL, start()).map((l) => l.id)).toEqual(['salted-road']);
  });

  it('opens up on the road', () => {
    const onRoad = moveTo(start(), 'salted-road');
    expect(exitsFrom(ASHFALL, onRoad).map((l) => l.id).sort()).toEqual([
      'black-spruce',
      'drowned-dam',
      'grennhal',
    ]);
  });
});

describe('seedWorldFrom', () => {
  it('opens on the module\'s first scene, with its text already in the feed', () => {
    const w = seedWorldFrom(ASHFALL);
    expect(w.scene).toBe(ASHFALL.opening.scene);
    expect(w.feed).toHaveLength(1);
    expect(w.feed![0].speaker).toBe('GM');
    expect(w.feed![0].text).toBe(ASHFALL.opening.text);
  });

  it('stands the party where the module says they start', () => {
    const w = seedWorldFrom(ASHFALL);
    expect(w.module?.id).toBe('ashfall');
    expect(w.module?.at).toBe(ASHFALL.opening.location);
    expect(w.module?.seen).toEqual([ASHFALL.opening.location]);
    expect(w.module?.fired).toEqual([]);
  });

  it('puts the module\'s factions and antagonist on the board', () => {
    const w = seedWorldFrom(ASHFALL);
    expect(w.factions?.map((f) => f.name)).toEqual(
      ASHFALL.core.factions.map((f) => f.name),
    );
    expect(w.antagonist?.name).toBe('The Tally');
  });

  it('hands the GM the module bestiary from turn one', () => {
    const w = seedWorldFrom(ASHFALL);
    expect(w.bestiary).toHaveLength(ASHFALL.bestiary.length);
  });

  it('carries the opening quests across', () => {
    const w = seedWorldFrom(ASHFALL);
    expect(w.quests).toHaveLength(ASHFALL.quests.length);
    expect(w.quests?.every((q) => q.status === 'active')).toBe(true);
  });

  it('takes the module title unless the GM names it something else', () => {
    expect(seedWorldFrom(ASHFALL).campaign).toBe(ASHFALL.title);
    expect(seedWorldFrom(ASHFALL, '  Tuesday Group  ').campaign).toBe('Tuesday Group');
  });

  it('starts clean — no enemies, no initiative, round one', () => {
    const w = seedWorldFrom(ASHFALL);
    expect(w.enemies).toEqual([]);
    expect(w.order).toEqual([]);
    expect(w.round).toBe(1);
    expect(w.chat_cursor).toBe(0);
  });

  it('copies rather than sharing the module\'s own arrays', () => {
    const w = seedWorldFrom(ASHFALL);
    w.quests![0].status = 'done';
    expect(ASHFALL.quests[0].status).toBe('active');
  });
});
