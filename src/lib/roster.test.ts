import { describe, expect, it } from 'vitest';
import {
  buildFrom,
  describe as describeEntry,
  instanceFor,
  ordered,
  playable,
  seatedIn,
  type RosterEntry,
} from './roster';
import { blankCharacter } from './world';
import type { Character } from '../types';

const character = (over: Partial<Character> = {}): Character => ({
  ...blankCharacter(),
  name: 'Vellum',
  cls: 'Wizard (School of Evocation)',
  race: 'Half-Elf',
  level: 3,
  maxHp: 23,
  hp: 23,
  built: true,
  ...over,
});

const entry = (over: Partial<RosterEntry> = {}): RosterEntry => ({
  id: 'c1',
  owner: 'u1',
  data: character(),
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
  ...over,
});

describe('instanceFor — the copy that sits down at the table', () => {
  it('starts at full health with nothing spent', () => {
    const tired = entry({
      data: character({ hp: 4, temp: 6, slotsUsed: { '1': 3 }, conditions: ['Frightened'] }),
    });
    const sat = instanceFor(tired);
    expect(sat.hp).toBe(23);
    expect(sat.temp).toBe(0);
    expect(sat.slotsUsed).toEqual({});
    expect(sat.cond).toEqual([]);
    expect(sat.conditions).toEqual([]);
  });

  it('carries the build across untouched', () => {
    const sat = instanceFor(entry());
    expect(sat.name).toBe('Vellum');
    expect(sat.cls).toBe('Wizard (School of Evocation)');
    expect(sat.race).toBe('Half-Elf');
    expect(sat.level).toBe(3);
    expect(sat.built).toBe(true);
  });

  it('is a copy — playing it does not touch the roster entry', () => {
    const e = entry();
    const sat = instanceFor(e);
    sat.hp = 1;
    sat.level = 9;
    expect(e.data.hp).toBe(23);
    expect(e.data.level).toBe(3);
  });

  it('lets one character sit in two campaigns independently', () => {
    const e = entry();
    const atTableA = instanceFor(e);
    const atTableB = instanceFor(e);
    atTableA.hp = 2;
    atTableA.level = 5;
    // This is the whole reason for the copy: table B is unaffected.
    expect(atTableB.hp).toBe(23);
    expect(atTableB.level).toBe(3);
  });
});

describe('buildFrom — what goes home when a character leaves', () => {
  it('strips the campaign state off', () => {
    const played = character({ hp: 3, temp: 9, slotsUsed: { '2': 2 }, conditions: ['Poisoned'] });
    const home = buildFrom(played);
    expect(home.hp).toBe(home.maxHp);
    expect(home.temp).toBe(0);
    expect(home.slotsUsed).toEqual({});
    expect(home.conditions).toEqual([]);
  });

  it('keeps a level and the XP that earned it', () => {
    const played = character({ level: 5, xp: 6500, hp: 1 });
    const home = buildFrom(played);
    expect(home.level).toBe(5);
    expect(home.xp).toBe(6500);
  });

  it('keeps spells learned along the way', () => {
    const played = character({ spells: ['Fireball'], cantrips: ['Fire Bolt'], prepared: ['Fireball'] });
    const home = buildFrom(played);
    expect(home.spells).toEqual(['Fireball']);
    expect(home.cantrips).toEqual(['Fire Bolt']);
  });

  it('round-trips: home then back to a table is full health again', () => {
    const played = character({ hp: 2, level: 4, slotsUsed: { '1': 4 } });
    const sat = instanceFor(entry({ data: buildFrom(played) }));
    expect(sat.level).toBe(4);
    expect(sat.hp).toBe(sat.maxHp);
    expect(sat.slotsUsed).toEqual({});
  });
});

describe('playable', () => {
  it('leaves out characters the wizard never finished', () => {
    const roster = [
      entry({ id: 'a' }),
      entry({ id: 'b', data: character({ built: false }) }),
    ];
    expect(playable(roster).map((r) => r.id)).toEqual(['a']);
  });
});

describe('seatedIn', () => {
  it('knows when a character is already at this table', () => {
    const seats = [{ character_id: 'c1' }, { character_id: null }];
    expect(seatedIn('c1', seats)).toBe(true);
    expect(seatedIn('c2', seats)).toBe(false);
  });

  it('treats an empty table as having nobody in it', () => {
    expect(seatedIn('c1', [{ character_id: null }, { character_id: null }])).toBe(false);
  });
});

describe('describe', () => {
  it('summarises a built character', () => {
    expect(describeEntry(entry())).toBe('Wizard (School of Evocation) · Half-Elf · level 3');
  });

  it('says so when the wizard was never finished', () => {
    expect(describeEntry(entry({ data: character({ built: false }) }))).toBe('Unfinished');
  });
});

describe('ordered', () => {
  it('puts the most recently played first', () => {
    const roster = [
      entry({ id: 'old', updated_at: '2026-01-01T00:00:00Z' }),
      entry({ id: 'new', updated_at: '2026-10-01T00:00:00Z' }),
    ];
    expect(ordered(roster).map((r) => r.id)).toEqual(['new', 'old']);
  });

  it('sinks unfinished characters below finished ones', () => {
    const roster = [
      entry({ id: 'unfinished', data: character({ built: false }), updated_at: '2026-12-01T00:00:00Z' }),
      entry({ id: 'built', updated_at: '2026-01-01T00:00:00Z' }),
    ];
    expect(ordered(roster).map((r) => r.id)).toEqual(['built', 'unfinished']);
  });

  it('does not mutate what it was given', () => {
    const roster = [entry({ id: 'a' }), entry({ id: 'b', updated_at: '2026-12-01T00:00:00Z' })];
    const before = roster.map((r) => r.id);
    ordered(roster);
    expect(roster.map((r) => r.id)).toEqual(before);
  });
});
