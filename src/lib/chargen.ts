// Character creation: point buy, racial increases, and every derived number on
// the finished sheet. Pure functions over the data modules — no React, no
// store, no I/O — so the 5e maths is testable on its own.
//
// Characters start at level 3, as the prototype does.

import { BACKGROUNDS, backgroundByName } from '../data/backgrounds';
import { classByName, SKILL_ABILITY, type ClassDef } from '../data/classes';
import { raceByName, type RaceDef } from '../data/races';
import { cantripsFor, casterFor, pickCountFor } from '../data/rules';
import type { Ability, Character, Scores } from '../types';

export const ABILITIES: readonly Ability[] = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];

/** Where the wizard starts every character. */
export const START_LEVEL = 3;
export const START_XP = 900;

// ------------------------------------------------------------- point buy
/** Point-buy costs, 8 through 15. Converted verbatim from the prototype. */
const PB_COST: Record<number, number> = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };

export const PB_BUDGET = 27;
export const PB_MIN = 8;
export const PB_MAX = 15;

export const pointCost = (score: number): number => PB_COST[score] ?? 0;

/** The base array every character starts point buy from. */
export const baseScores = (): Scores => ({ STR: 8, DEX: 8, CON: 8, INT: 8, WIS: 8, CHA: 8 });

/** Points already committed across all six abilities. */
export function pointsSpent(scores: Scores): number {
  return ABILITIES.reduce((sum, a) => sum + pointCost(scores[a]), 0);
}

export const pointsLeft = (scores: Scores): number => PB_BUDGET - pointsSpent(scores);

/** Can this ability go up by one without breaking the cap or the budget? */
export function canRaise(scores: Scores, ability: Ability): boolean {
  const next = scores[ability] + 1;
  if (next > PB_MAX) return false;
  return pointCost(next) - pointCost(scores[ability]) <= pointsLeft(scores);
}

export const canLower = (scores: Scores, ability: Ability): boolean => scores[ability] > PB_MIN;

// --------------------------------------------------------- racial bonuses
/**
 * The racial increases for a race, including whatever the player assigned to
 * its floating bonus. Unknown or over-long picks are ignored rather than
 * throwing — the wizard gates on `asiPicksComplete` before it commits.
 */
export function racialBonuses(race: RaceDef | null, picks: readonly Ability[] = []): Partial<Record<Ability, number>> {
  if (!race) return {};
  const out: Partial<Record<Ability, number>> = { ...race.asi };
  if (!race.pick) return out;

  const seen = new Set<Ability>();
  for (const ability of picks) {
    if (seen.size >= race.pick.count) break;
    if (seen.has(ability)) continue;
    if (race.pick.exclude?.includes(ability)) continue;
    seen.add(ability);
    out[ability] = (out[ability] ?? 0) + race.pick.amount;
  }
  return out;
}

/** Which abilities a race's floating bonus may be assigned to. */
export function asiPickOptions(race: RaceDef | null): readonly Ability[] {
  if (!race?.pick) return [];
  return ABILITIES.filter((a) => !race.pick!.exclude?.includes(a));
}

/** True when the race needs no floating picks, or the player has made them all. */
export function asiPicksComplete(race: RaceDef | null, picks: readonly Ability[]): boolean {
  if (!race?.pick) return true;
  const valid = new Set(picks.filter((a) => !race.pick!.exclude?.includes(a)));
  return valid.size === race.pick.count;
}

/** Point-buy scores plus racial increases. This is what lands on the sheet. */
export function finalScores(scores: Scores, race: RaceDef | null, picks: readonly Ability[] = []): Scores {
  const bonus = racialBonuses(race, picks);
  const out = { ...scores };
  for (const ability of ABILITIES) out[ability] = scores[ability] + (bonus[ability] ?? 0);
  return out;
}

// ------------------------------------------------------------- derived
export const abilityMod = (score: number): number => Math.floor((Number(score) - 10) / 2);

/** 5e proficiency bonus: +2 at levels 1–4, then +1 every four levels. */
export const proficiencyBonus = (level: number): number =>
  2 + Math.floor((Math.max(1, Math.min(20, level)) - 1) / 4);

/**
 * Average hit points: a full die at 1st level, then the die's average
 * (half + 1) at every level after, with the CON modifier each time.
 * Hill Dwarves add one more per level.
 */
export function maxHpFor(cls: ClassDef | null, race: RaceDef | null, con: number, level = START_LEVEL): number {
  if (!cls) return 1;
  const mod = abilityMod(con);
  const perLevel = Math.floor(cls.hd / 2) + 1 + mod;
  const base = cls.hd + mod + perLevel * (level - 1);
  const dwarfBonus = race?.name === 'Hill Dwarf' ? level : 0;
  return Math.max(1, base + dwarfBonus);
}

/** AC from the class's starting kit — armour, or an unarmoured defence. */
export function acFor(cls: ClassDef | null, scores: Scores): number {
  if (!cls) return 10;
  const dex = abilityMod(scores.DEX);
  const { armor } = cls;
  if (armor.kind === 'con') return 10 + dex + abilityMod(scores.CON);
  if (armor.kind === 'wis') return 10 + dex + abilityMod(scores.WIS);
  // Heavy armour (maxDex 0) ignores DEX altogether — a low DEX must not drag
  // chain mail below its own 16. Light and medium armour add the modifier,
  // which may legitimately be negative; medium caps the bonus at +2.
  const max = armor.maxDex ?? 99;
  const fromDex = max === 0 ? 0 : Math.min(dex, max);
  return (armor.base ?? 10) + fromDex + (armor.shield ? 2 : 0);
}

/** Every skill the character is proficient in: background plus class picks. */
export function skillsFor(background: string, classSkills: readonly string[]): string[] {
  const fromBg = (backgroundByName(background)?.skills ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const all = new Set<string>([...fromBg, ...classSkills]);
  return [...all];
}

/**
 * Passive Perception: 10 + WIS modifier, plus proficiency when the character
 * is proficient in Perception. The prototype used a flat 10 + WIS; adding
 * proficiency is the 5e-correct form.
 */
export function passivePerception(scores: Scores, skills: readonly string[], level = START_LEVEL): number {
  const prof = skills.includes('Perception') ? proficiencyBonus(level) : 0;
  return 10 + abilityMod(scores.WIS) + prof;
}

/** The spell save DC for a caster: 8 + proficiency + casting ability modifier. */
export function spellSaveDc(cls: string, scores: Scores, level = START_LEVEL): number | null {
  const caster = casterFor(cls);
  if (caster.kind === 'none' || !caster.ability) return null;
  return 8 + proficiencyBonus(level) + abilityMod(scores[caster.ability]);
}

/** The attack bonus for a caster's spell attacks. */
export function spellAttackBonus(cls: string, scores: Scores, level = START_LEVEL): number | null {
  const caster = casterFor(cls);
  if (caster.kind === 'none' || !caster.ability) return null;
  return proficiencyBonus(level) + abilityMod(scores[caster.ability]);
}

/** A skill's total modifier, for the sheet. */
export function skillMod(skill: string, scores: Scores, skills: readonly string[], level = START_LEVEL): number {
  const ability = SKILL_ABILITY[skill];
  const base = ability ? abilityMod(scores[ability]) : 0;
  return base + (skills.includes(skill) ? proficiencyBonus(level) : 0);
}

// ------------------------------------------------------------ the draft
/** Everything the six steps collect, before it becomes a Character. */
export interface Draft {
  cls: string;
  sub: string;
  race: string;
  /** Floating racial increases, in the order the player assigned them. */
  asiPicks: Ability[];
  background: string;
  /** Skills chosen from the class list. */
  classSkills: string[];
  name: string;
  scores: Scores;
  cantrips: string[];
  spells: string[];
}

export const blankDraft = (): Draft => ({
  cls: '',
  sub: '',
  race: '',
  asiPicks: [],
  background: '',
  classSkills: [],
  name: '',
  scores: baseScores(),
  cantrips: [],
  spells: [],
});

/** "Wizard" + "School of Evocation" → "Wizard (School of Evocation)". */
export const classLabel = (cls: string, sub: string): string => (sub ? `${cls} (${sub})` : cls);

/** How many cantrips and spells this draft still owes, for the step gate. */
export function spellQuota(draft: Draft): { cantrips: number; spells: number } {
  const label = classLabel(draft.cls, draft.sub);
  const caster = casterFor(label);
  if (caster.kind === 'none') return { cantrips: 0, spells: 0 };

  const scores = finalScores(draft.scores, raceByName(draft.race), draft.asiPicks);
  const mod = caster.ability ? abilityMod(scores[caster.ability]) : 0;
  return {
    cantrips: cantripsFor(label, START_LEVEL),
    spells: pickCountFor(label, START_LEVEL, mod),
  };
}

/** Which steps are satisfied. Index matches the step number, 1-based. */
export function stepComplete(draft: Draft, step: number): boolean {
  const cls = classByName(draft.cls);
  switch (step) {
    case 1:
      return Boolean(draft.cls && draft.sub) && draft.classSkills.length === (cls?.skillCount ?? 0);
    case 2:
      return Boolean(draft.race && draft.background) && asiPicksComplete(raceByName(draft.race), draft.asiPicks);
    case 3:
      return draft.name.trim().length > 0;
    case 4:
      return pointsLeft(draft.scores) === 0;
    case 5: {
      const quota = spellQuota(draft);
      return draft.cantrips.length === quota.cantrips && draft.spells.length === quota.spells;
    }
    default:
      return true;
  }
}

/** Does this draft's class cast at all? Step 5 is skipped when it does not. */
export const draftCasts = (draft: Draft): boolean =>
  casterFor(classLabel(draft.cls, draft.sub)).kind !== 'none';

/**
 * Turn a finished draft into the Character the store writes to its seat.
 * Mirrors the prototype's wizard commit, with the derived numbers corrected.
 */
export function buildCharacter(draft: Draft, previous: Character): Character {
  const cls = classByName(draft.cls);
  const race = raceByName(draft.race);
  const label = classLabel(draft.cls, draft.sub);
  const scores = finalScores(draft.scores, race, draft.asiPicks);
  const skills = skillsFor(draft.background, draft.classSkills);
  const maxHp = maxHpFor(cls, race, scores.CON);
  const dex = abilityMod(scores.DEX);

  const caster = casterFor(label);
  const mod = caster.ability ? abilityMod(scores[caster.ability]) : 0;
  // Known and prepared casters cast from their picks. A wizard's picks are the
  // spellbook; the prepared subset starts at INT mod + level of them.
  const prepared =
    caster.kind === 'book'
      ? draft.spells.slice(0, Math.max(1, mod + START_LEVEL))
      : draft.spells.slice();

  return {
    ...previous,
    name: draft.name.trim(),
    cls: label,
    race: draft.race,
    background: draft.background,
    skills: skills.join(', '),
    level: START_LEVEL,
    xp: START_XP,
    scores,
    hp: maxHp,
    maxHp,
    temp: 0,
    ac: acFor(cls, scores),
    initMod: dex,
    pp: passivePerception(scores, skills),
    inventory: [cls?.kit, backgroundByName(draft.background)?.gear].filter(Boolean).join(', '),
    features: race ? [...race.traits] : [],
    built: true,
    cantrips: draft.cantrips.slice(),
    spells: draft.spells.slice(),
    prepared,
    slotsUsed: {},
    spellsAt: START_LEVEL,
    cond: [],
    conditions: [],
  };
}

export { BACKGROUNDS };

/** What a wizard step gets to change the draft with. */
export type Patch = (next: Partial<Draft> | ((d: Draft) => Partial<Draft>)) => void;
