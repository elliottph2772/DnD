import { describe, expect, it } from 'vitest';
import {
  CONDITIONS,
  DURATIONS,
  baseClass,
  cantripsFor,
  casterFor,
  listFor,
  maxSpellLevel,
  pickCountFor,
  restoresOnShort,
  slotsFor,
  spellByName,
} from './rules';
import { SPELLS } from './spells';

// These are the numbers a session is actually played on. A silent change here
// is a wrong ruling at the table, so they are pinned against the PHB.

describe('baseClass', () => {
  it('strips the subclass', () => {
    expect(baseClass('Wizard (School of Evocation)')).toBe('Wizard');
    expect(baseClass('Fighter')).toBe('Fighter');
    expect(baseClass('')).toBe('');
  });
});

describe('casterFor', () => {
  it('reads through a subclass', () => {
    expect(casterFor('Wizard (School of Evocation)')).toMatchObject({ kind: 'book', ability: 'INT' });
  });

  it('calls non-casters none', () => {
    for (const cls of ['Barbarian', 'Fighter', 'Monk', 'Rogue']) {
      expect(casterFor(cls).kind).toBe('none');
    }
  });

  it('falls back to none for an unknown class', () => {
    expect(casterFor('Artificer').kind).toBe('none');
  });
});

describe('slotsFor', () => {
  it('matches the full-caster table', () => {
    expect(slotsFor('Wizard', 1)).toEqual({ '1': 2 });
    expect(slotsFor('Wizard', 3)).toEqual({ '1': 4, '2': 2 });
    expect(slotsFor('Cleric', 5)).toEqual({ '1': 4, '2': 3, '3': 2 });
    expect(slotsFor('Bard', 20)).toEqual({
      '1': 4, '2': 3, '3': 3, '4': 3, '5': 3, '6': 2, '7': 2, '8': 1, '9': 1,
    });
  });

  it('matches the half-caster table', () => {
    expect(slotsFor('Paladin', 1)).toEqual({});
    expect(slotsFor('Paladin', 2)).toEqual({ '1': 2 });
    expect(slotsFor('Ranger', 5)).toEqual({ '1': 4, '2': 2 });
    // A half-caster tops out at 5th-level slots, two of them.
    expect(slotsFor('Paladin', 20)).toEqual({ '1': 4, '2': 3, '3': 3, '4': 3, '5': 2 });
    expect(maxSpellLevel('Paladin', 20)).toBe(5);
  });

  it('gives a warlock pact slots at one level only', () => {
    expect(slotsFor('Warlock', 1)).toEqual({ '1': 1 });
    expect(slotsFor('Warlock', 3)).toEqual({ '2': 2 });
    expect(slotsFor('Warlock', 11)).toEqual({ '5': 3 });
    expect(slotsFor('Warlock', 20)).toEqual({ '5': 4 });
  });

  it('gives non-casters nothing', () => {
    expect(slotsFor('Fighter', 10)).toEqual({});
  });

  it('clamps out-of-range levels instead of throwing', () => {
    expect(slotsFor('Wizard', 0)).toEqual({ '1': 2 });
    expect(slotsFor('Wizard', 99)).toEqual(slotsFor('Wizard', 20));
  });
});

describe('cantripsFor', () => {
  it('steps at 4th and 10th', () => {
    expect(cantripsFor('Wizard', 3)).toBe(3);
    expect(cantripsFor('Wizard', 4)).toBe(4);
    expect(cantripsFor('Wizard', 10)).toBe(5);
    expect(cantripsFor('Sorcerer', 1)).toBe(4);
    expect(cantripsFor('Sorcerer', 10)).toBe(6);
  });

  it('gives half-casters and non-casters none', () => {
    expect(cantripsFor('Paladin', 20)).toBe(0);
    expect(cantripsFor('Ranger', 20)).toBe(0);
    expect(cantripsFor('Fighter', 20)).toBe(0);
  });
});

describe('pickCountFor', () => {
  it('reads the spells-known tables', () => {
    expect(pickCountFor('Bard', 3)).toBe(6);
    expect(pickCountFor('Sorcerer', 3)).toBe(4);
    expect(pickCountFor('Warlock', 3)).toBe(4);
    expect(pickCountFor('Ranger', 1)).toBe(0);
    expect(pickCountFor('Ranger', 2)).toBe(2);
  });

  it('grows a wizard spellbook by two a level', () => {
    expect(pickCountFor('Wizard', 1)).toBe(6);
    expect(pickCountFor('Wizard', 3)).toBe(10);
    expect(pickCountFor('Wizard', 20)).toBe(44);
  });

  it('prepares ability mod + level, halved for a paladin', () => {
    expect(pickCountFor('Cleric', 3, 3)).toBe(6);
    expect(pickCountFor('Druid', 5, 2)).toBe(7);
    expect(pickCountFor('Paladin', 6, 3)).toBe(6);
  });

  it('never prepares fewer than one', () => {
    expect(pickCountFor('Cleric', 1, -4)).toBe(1);
    expect(pickCountFor('Paladin', 2, -5)).toBe(1);
  });

  it('gives non-casters nothing', () => {
    expect(pickCountFor('Rogue', 20, 5)).toBe(0);
  });
});

describe('maxSpellLevel', () => {
  it('reports the highest slot held', () => {
    expect(maxSpellLevel('Wizard', 3)).toBe(2);
    expect(maxSpellLevel('Wizard', 20)).toBe(9);
    expect(maxSpellLevel('Warlock', 11)).toBe(5);
    expect(maxSpellLevel('Paladin', 1)).toBe(0);
    expect(maxSpellLevel('Fighter', 20)).toBe(0);
  });
});

describe('listFor', () => {
  it('returns only cantrips at spell level 0', () => {
    const list = listFor('Wizard', 3, 0);
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((s) => s.level === 0)).toBe(true);
    expect(list.every((s) => s.classes.includes('W'))).toBe(true);
  });

  it('caps leveled spells at the highest slot the character holds', () => {
    const list = listFor('Wizard', 3);
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((s) => s.level > 0 && s.level <= 2)).toBe(true);
  });

  it('honours an explicit cap', () => {
    expect(listFor('Cleric', 20, 1).every((s) => s.level === 1)).toBe(true);
    expect(listFor('Cleric', 20, 3).every((s) => s.level > 0 && s.level <= 3)).toBe(true);
  });

  it('gives non-casters an empty list', () => {
    expect(listFor('Fighter', 20)).toEqual([]);
  });
});

describe('spellByName', () => {
  it('finds a spell and types its fields', () => {
    const fireball = spellByName('Fireball');
    expect(fireball).toMatchObject({ name: 'Fireball', level: 3, school: 'Evocation' });
    expect(fireball?.classes).toContain('W');
  });

  it('returns null for an unknown name', () => {
    expect(spellByName('Power Word Nope')).toBeNull();
  });
});

describe('restoresOnShort', () => {
  it('is true only for the warlock', () => {
    expect(restoresOnShort('Warlock')).toBe(true);
    expect(restoresOnShort('Wizard')).toBe(false);
    expect(restoresOnShort('Fighter')).toBe(false);
  });
});

describe('the data tables themselves', () => {
  it('holds the 14 PHB conditions plus six exhaustion levels', () => {
    expect(CONDITIONS).toHaveLength(20);
    expect(CONDITIONS.filter((c) => c.name.startsWith('Exhaustion'))).toHaveLength(6);
    expect(CONDITIONS.every((c) => c.name && c.text)).toBe(true);
  });

  it('keeps the duration vocabulary and its round counts', () => {
    const byLabel = new Map(DURATIONS.map((d) => [d.label, d]));
    expect(byLabel.get('1 minute')?.rounds).toBe(10);
    expect(byLabel.get('10 minutes')?.rounds).toBe(100);
    expect(byLabel.get('1 hour')?.rounds).toBe(600);
    expect(byLabel.get('8 hours')?.rounds).toBe(4800);
    // These three do not tick down; they are released by hand.
    expect(byLabel.get('Save ends')?.rounds).toBe(0);
    expect(byLabel.get('Concentration')?.rounds).toBe(0);
    expect(byLabel.get('Until removed')?.rounds).toBe(0);
  });

  it('parses every spell row', () => {
    expect(SPELLS.length).toBeGreaterThan(300);
    expect(SPELLS.every((s) => s.name.length > 0)).toBe(true);
    expect(SPELLS.every((s) => s.level >= 0 && s.level <= 9)).toBe(true);
    expect(SPELLS.every((s) => s.classes.length > 0)).toBe(true);
    // Class codes must stay inside the set rules.ts matches against.
    const codes = new Set(['B', 'C', 'D', 'P', 'R', 'S', 'K', 'W']);
    expect(SPELLS.every((s) => s.classes.every((c) => codes.has(c)))).toBe(true);
  });
});
