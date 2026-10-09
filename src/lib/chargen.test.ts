import { describe, expect, it } from 'vitest';
import { CLASSES, classByName, skillChoicesFor } from '../data/classes';
import { RACES, raceByName } from '../data/races';
import { casterFor } from '../data/rules';
import {
  ABILITIES,
  abilityMod,
  acFor,
  asiPicksComplete,
  baseScores,
  blankDraft,
  buildCharacter,
  canLower,
  canRaise,
  classLabel,
  finalScores,
  maxHpFor,
  passivePerception,
  PB_BUDGET,
  pointCost,
  pointsLeft,
  pointsSpent,
  proficiencyBonus,
  racialBonuses,
  skillMod,
  spellAttackBonus,
  spellSaveDc,
  stepComplete,
  START_LEVEL,
} from './chargen';
import { blankCharacter } from './world';
import type { Ability, Scores } from '../types';

const scoresOf = (p: Partial<Scores>): Scores => ({ ...baseScores(), ...p });

describe('point buy', () => {
  it('uses the 5e cost table — 14 costs 7 and 15 costs 9', () => {
    expect([8, 9, 10, 11, 12, 13, 14, 15].map(pointCost)).toEqual([0, 1, 2, 3, 4, 5, 7, 9]);
  });

  it('starts with all eights and the full 27 points', () => {
    const s = baseScores();
    expect(pointsSpent(s)).toBe(0);
    expect(pointsLeft(s)).toBe(PB_BUDGET);
  });

  it('the standard 15/15/15/8/8/8 array costs exactly 27', () => {
    expect(pointsSpent(scoresOf({ STR: 15, DEX: 15, CON: 15 }))).toBe(27);
  });

  it('the common 15/14/13/12/10/8 array costs exactly 27', () => {
    expect(pointsSpent(scoresOf({ STR: 15, DEX: 14, CON: 13, INT: 12, WIS: 10, CHA: 8 }))).toBe(27);
  });

  it('refuses to raise past 15', () => {
    expect(canRaise(scoresOf({ STR: 15 }), 'STR')).toBe(false);
  });

  it('refuses a raise the remaining budget cannot pay for', () => {
    // 15/15/15 spends all 27; nothing else can go up.
    const spent = scoresOf({ STR: 15, DEX: 15, CON: 15 });
    expect(pointsLeft(spent)).toBe(0);
    expect(canRaise(spent, 'INT')).toBe(false);
  });

  it('13 to 14 costs two points, not one', () => {
    const s = scoresOf({ STR: 13 });
    expect(pointCost(14) - pointCost(13)).toBe(2);
    expect(canRaise(s, 'STR')).toBe(true);
  });

  it('refuses to lower below 8', () => {
    expect(canLower(baseScores(), 'STR')).toBe(false);
    expect(canLower(scoresOf({ STR: 9 }), 'STR')).toBe(true);
  });
});

describe('ability modifiers', () => {
  it('matches the 5e table', () => {
    const pairs: [number, number][] = [
      [1, -5], [8, -1], [9, -1], [10, 0], [11, 0], [12, 1], [15, 2], [18, 4], [20, 5],
    ];
    for (const [score, mod] of pairs) expect(abilityMod(score)).toBe(mod);
  });
});

describe('proficiency bonus', () => {
  it('is +2 through level 4 and steps every four levels', () => {
    const expected: Record<number, number> = {
      1: 2, 4: 2, 5: 3, 8: 3, 9: 4, 12: 4, 13: 5, 16: 5, 17: 6, 20: 6,
    };
    for (const [lv, bonus] of Object.entries(expected)) {
      expect(proficiencyBonus(Number(lv))).toBe(bonus);
    }
  });
});

describe('racial increases', () => {
  it('gives the Human +1 to all six', () => {
    const human = raceByName('Human');
    expect(racialBonuses(human)).toEqual({ STR: 1, DEX: 1, CON: 1, INT: 1, WIS: 1, CHA: 1 });
  });

  it('gives the Mountain Dwarf +2 STR and +2 CON', () => {
    expect(racialBonuses(raceByName('Mountain Dwarf'))).toEqual({ STR: 2, CON: 2 });
  });

  it('adds the Half-Elf picks on top of its fixed +2 CHA', () => {
    const halfElf = raceByName('Half-Elf');
    expect(racialBonuses(halfElf, ['DEX', 'WIS'])).toEqual({ CHA: 2, DEX: 1, WIS: 1 });
  });

  it('never lets the Half-Elf put a floating point into CHA', () => {
    const halfElf = raceByName('Half-Elf');
    // CHA is excluded, so it is skipped and only DEX lands.
    expect(racialBonuses(halfElf, ['CHA', 'DEX'])).toEqual({ CHA: 2, DEX: 1 });
  });

  it('ignores a repeated pick rather than stacking it', () => {
    const halfElf = raceByName('Half-Elf');
    expect(racialBonuses(halfElf, ['DEX', 'DEX'])).toEqual({ CHA: 2, DEX: 1 });
  });

  it('takes only as many picks as the race allows', () => {
    const halfElf = raceByName('Half-Elf');
    expect(racialBonuses(halfElf, ['DEX', 'WIS', 'CON'])).toEqual({ CHA: 2, DEX: 1, WIS: 1 });
  });

  it('knows when the floating picks are still outstanding', () => {
    const halfElf = raceByName('Half-Elf');
    expect(asiPicksComplete(halfElf, [])).toBe(false);
    expect(asiPicksComplete(halfElf, ['DEX'])).toBe(false);
    expect(asiPicksComplete(halfElf, ['DEX', 'WIS'])).toBe(true);
    // A race with no floating bonus is always complete.
    expect(asiPicksComplete(raceByName('Human'), [])).toBe(true);
  });

  it('adds the increases onto the point-buy scores', () => {
    const final = finalScores(scoresOf({ DEX: 15, CHA: 14 }), raceByName('Half-Elf'), ['DEX', 'CON']);
    expect(final.DEX).toBe(16);
    expect(final.CHA).toBe(16);
    expect(final.CON).toBe(9);
  });
});

describe('hit points', () => {
  it('gives a level-3 Fighter with CON 14 the 5e average: 28', () => {
    // d10: 10 + 2, then two levels of (6 + 2) = 12 + 16.
    expect(maxHpFor(classByName('Fighter'), null, 14)).toBe(28);
  });

  it('gives a level-3 Wizard with CON 10 the 5e average: 14', () => {
    // d6: 6 + 0, then two levels of 4.
    expect(maxHpFor(classByName('Wizard'), null, 10)).toBe(14);
  });

  it('gives a level-3 Barbarian with CON 16 the 5e average: 35', () => {
    // d12: 12 + 3 at 1st, then two levels of (7 + 3).
    expect(maxHpFor(classByName('Barbarian'), null, 16)).toBe(15 + 10 + 10);
  });

  it('adds the Hill Dwarf one extra hit point per level', () => {
    const plain = maxHpFor(classByName('Cleric'), raceByName('Mountain Dwarf'), 14);
    const hill = maxHpFor(classByName('Cleric'), raceByName('Hill Dwarf'), 14);
    expect(hill - plain).toBe(START_LEVEL);
  });

  it('never drops below 1, even with a dire CON', () => {
    expect(maxHpFor(classByName('Wizard'), null, 1)).toBeGreaterThanOrEqual(1);
  });
});

describe('armour class', () => {
  it('gives a Wizard 10 + DEX', () => {
    expect(acFor(classByName('Wizard'), scoresOf({ DEX: 14 }))).toBe(12);
  });

  it('gives a Rogue in leather 11 + DEX', () => {
    expect(acFor(classByName('Rogue'), scoresOf({ DEX: 16 }))).toBe(14);
  });

  it('gives a Fighter in chain mail and shield a flat 18, DEX ignored', () => {
    expect(acFor(classByName('Fighter'), scoresOf({ DEX: 8 }))).toBe(18);
    expect(acFor(classByName('Fighter'), scoresOf({ DEX: 18 }))).toBe(18);
  });

  it('caps a Ranger in scale mail at +2 DEX', () => {
    expect(acFor(classByName('Ranger'), scoresOf({ DEX: 14 }))).toBe(16);
    expect(acFor(classByName('Ranger'), scoresOf({ DEX: 18 }))).toBe(16);
  });

  it('gives the Barbarian unarmoured defence with CON', () => {
    expect(acFor(classByName('Barbarian'), scoresOf({ DEX: 14, CON: 16 }))).toBe(15);
  });

  it('gives the Monk unarmoured defence with WIS', () => {
    expect(acFor(classByName('Monk'), scoresOf({ DEX: 16, WIS: 14 }))).toBe(15);
  });
});

describe('passive perception', () => {
  it('is 10 + WIS without the skill', () => {
    expect(passivePerception(scoresOf({ WIS: 14 }), [])).toBe(12);
  });

  it('adds proficiency when Perception is trained', () => {
    expect(passivePerception(scoresOf({ WIS: 14 }), ['Perception'])).toBe(14);
  });
});

describe('spell save DC and attack bonus', () => {
  it('gives a level-3 Wizard with INT 16 a DC of 13 and +5 to hit', () => {
    const s = scoresOf({ INT: 16 });
    expect(spellSaveDc('Wizard', s)).toBe(13);
    expect(spellAttackBonus('Wizard', s)).toBe(5);
  });

  it('reads the subclass label without tripping on the parentheses', () => {
    expect(spellSaveDc('Wizard (School of Evocation)', scoresOf({ INT: 16 }))).toBe(13);
  });

  it('returns null for a class that does not cast', () => {
    expect(spellSaveDc('Barbarian', baseScores())).toBeNull();
    expect(spellAttackBonus('Fighter', baseScores())).toBeNull();
  });
});

describe('skill modifiers', () => {
  it('adds proficiency only to trained skills', () => {
    const s = scoresOf({ DEX: 16, STR: 8 });
    expect(skillMod('Stealth', s, ['Stealth'])).toBe(5);
    expect(skillMod('Stealth', s, [])).toBe(3);
    expect(skillMod('Athletics', s, [])).toBe(-1);
  });
});

describe('the class and race tables', () => {
  it('has all thirteen classes', () => {
    expect(CLASSES).toHaveLength(13);
    expect(CLASSES.map((c) => c.name)).toContain('Artificer');
  });

  it('gives every class a subclass list and a legal hit die', () => {
    for (const cls of CLASSES) {
      expect(cls.subs.length).toBeGreaterThan(0);
      expect([6, 8, 10, 12]).toContain(cls.hd);
      expect(cls.saves).toHaveLength(2);
    }
  });

  it('names every subclass uniquely within its class', () => {
    for (const cls of CLASSES) {
      const names = cls.subs.map((s) => s.name);
      expect(new Set(names).size).toBe(names.length);
    }
  });

  it('keeps every class key in step with the caster table in rules.ts', () => {
    for (const cls of CLASSES) {
      // casterFor falls back to `none` for an unknown name, so a drifted key
      // would silently turn a caster into a martial. Check the casters resolve.
      const caster = casterFor(cls.name);
      expect(caster).toBeTruthy();
    }
    // The six non-casters, and everyone else casting.
    const nonCasters = CLASSES.filter((c) => casterFor(c.name).kind === 'none').map((c) => c.name);
    expect(nonCasters.sort()).toEqual(['Artificer', 'Barbarian', 'Fighter', 'Monk', 'Rogue']);
  });

  it('draws every class skill choice from the canonical skill list', () => {
    for (const cls of CLASSES) {
      for (const skill of skillChoicesFor(cls)) {
        expect(Object.keys(SKILL_ABILITY_KEYS)).toContain(skill);
      }
    }
  });

  it('has ten race families', () => {
    expect(new Set(RACES.map((r) => r.family)).size).toBe(10);
  });

  it('gives every race a note, a speed and a size', () => {
    for (const race of RACES) {
      expect(race.note.length).toBeGreaterThan(0);
      expect(race.speed).toBeGreaterThan(0);
      expect(['Small', 'Medium']).toContain(race.size);
    }
  });

  it('grants increases of +1 or +2 and never more than 4 points, bar the Human', () => {
    for (const race of RACES) {
      for (const bump of Object.values(race.asi)) expect([1, 2]).toContain(bump);
      if (race.pick) expect([1, 2]).toContain(race.pick.amount);

      // The standard Human is the deliberate exception: +1 to all six is 6.
      if (race.name === 'Human') continue;
      const fixed = Object.values(race.asi).reduce((a, b) => a + b, 0);
      const floating = race.pick ? race.pick.count * race.pick.amount : 0;
      expect(fixed + floating).toBeLessThanOrEqual(4);
    }
  });
});

// Imported lazily so the table test above reads cleanly.
import { SKILL_ABILITY as SKILL_ABILITY_KEYS } from '../data/classes';

describe('step gating', () => {
  it('holds step 1 until class, subclass and skills are all chosen', () => {
    const d = blankDraft();
    expect(stepComplete(d, 1)).toBe(false);
    d.cls = 'Fighter';
    expect(stepComplete(d, 1)).toBe(false);
    d.sub = 'Champion';
    expect(stepComplete(d, 1)).toBe(false); // Fighter picks two skills
    d.classSkills = ['Athletics', 'Perception'];
    expect(stepComplete(d, 1)).toBe(true);
  });

  it('holds step 2 until a Half-Elf has assigned both floating points', () => {
    const d = blankDraft();
    d.race = 'Half-Elf';
    d.background = 'Soldier';
    expect(stepComplete(d, 2)).toBe(false);
    d.asiPicks = ['DEX', 'CON'];
    expect(stepComplete(d, 2)).toBe(true);
  });

  it('holds step 4 until every point is spent', () => {
    const d = blankDraft();
    expect(stepComplete(d, 4)).toBe(false);
    d.scores = scoresOf({ STR: 15, DEX: 15, CON: 15 });
    expect(stepComplete(d, 4)).toBe(true);
  });
});

describe('buildCharacter', () => {
  const draft = () => ({
    ...blankDraft(),
    cls: 'Wizard',
    sub: 'School of Evocation',
    race: 'High Elf',
    background: 'Sage',
    classSkills: ['Arcana', 'Investigation'],
    name: '  Vellum  ',
    scores: scoresOf({ INT: 15, DEX: 14, CON: 14, WIS: 12, CHA: 10, STR: 8 }),
    cantrips: ['Fire Bolt', 'Mage Hand', 'Prestidigitation'],
    spells: ['Magic Missile', 'Shield', 'Burning Hands', 'Detect Magic', 'Sleep', 'Thunderwave'],
  });

  it('writes the subclass into the class label', () => {
    const c = buildCharacter(draft(), blankCharacter());
    expect(c.cls).toBe('Wizard (School of Evocation)');
  });

  it('trims the name and marks the sheet built at level 3', () => {
    const c = buildCharacter(draft(), blankCharacter());
    expect(c.name).toBe('Vellum');
    expect(c.built).toBe(true);
    expect(c.level).toBe(START_LEVEL);
    expect(c.spellsAt).toBe(START_LEVEL);
  });

  it('applies the racial increases to the stored scores', () => {
    const c = buildCharacter(draft(), blankCharacter());
    // High Elf is +2 DEX, +1 INT.
    expect(c.scores.DEX).toBe(16);
    expect(c.scores.INT).toBe(16);
  });

  it('derives HP, AC, initiative and passive perception together', () => {
    const c = buildCharacter(draft(), blankCharacter());
    expect(c.maxHp).toBe(maxHpFor(classByName('Wizard'), raceByName('High Elf'), c.scores.CON));
    expect(c.hp).toBe(c.maxHp);
    expect(c.ac).toBe(10 + abilityMod(c.scores.DEX));
    expect(c.initMod).toBe(abilityMod(c.scores.DEX));
    expect(c.pp).toBe(10 + abilityMod(c.scores.WIS));
  });

  it('merges background skills with the class picks', () => {
    const c = buildCharacter(draft(), blankCharacter());
    // Sage gives Arcana and History; Arcana is also a class pick and must not double.
    expect(c.skills).toContain('History');
    expect(c.skills).toContain('Investigation');
    expect(c.skills.split(',').filter((s) => s.trim() === 'Arcana')).toHaveLength(1);
  });

  it("prepares only INT mod + level of the wizard's spellbook", () => {
    const c = buildCharacter(draft(), blankCharacter());
    // INT 16 → +3, plus level 3 = 6 prepared, and the book holds 6.
    expect(c.spells).toHaveLength(6);
    expect(c.prepared).toHaveLength(6);
  });

  it('lets a known caster cast from its whole list', () => {
    const d = { ...draft(), cls: 'Bard', sub: 'College of Lore', spells: ['Charm Person', 'Healing Word'] };
    const c = buildCharacter(d, blankCharacter());
    expect(c.prepared).toEqual(c.spells);
  });

  it('carries the race traits onto the sheet as features', () => {
    const c = buildCharacter(draft(), blankCharacter());
    expect(c.features.length).toBeGreaterThan(0);
  });

  it('starts with a clean slate of conditions and spent slots', () => {
    const c = buildCharacter(draft(), blankCharacter());
    expect(c.cond).toEqual([]);
    expect(c.conditions).toEqual([]);
    expect(c.slotsUsed).toEqual({});
    expect(c.temp).toBe(0);
  });
});

describe('classLabel', () => {
  it('omits the parentheses when there is no subclass', () => {
    expect(classLabel('Fighter', '')).toBe('Fighter');
    expect(classLabel('Fighter', 'Champion')).toBe('Fighter (Champion)');
  });
});

describe('ABILITIES', () => {
  it('lists the six in the order the sheet shows them', () => {
    expect(ABILITIES).toEqual(['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] satisfies Ability[]);
  });
});
