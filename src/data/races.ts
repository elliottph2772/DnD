// The ten most-played D&D 5e race families, flattened to their subraces.
// A plain typed data module, like classes.ts and rules.ts.
//
// Ability score increases are the 2014 PHB values — fixed per race, except
// where the race genuinely chooses. Two do: Half-Elf (+2 CHA and +1 to two
// others) and Variant Human (+1 to two of its choice). That is `pick`, and it
// closes the "Half-Elf bonuses are fixed" item carried over in DECISIONS.md.
//
// More families can be added here without touching the wizard: it reads this
// list and the `pick` shape, and nothing else.

import type { Ability } from './rules';
import type { Source } from './classes';

export type Size = 'Small' | 'Medium';

/** A floating ability increase the player assigns. */
export interface AsiPick {
  /** How many different abilities get the bonus. */
  count: number;
  /** How much each chosen ability goes up by. */
  amount: number;
  /** Abilities that may not be chosen — usually the one already fixed. */
  exclude?: readonly Ability[];
}

export interface RaceDef {
  name: string;
  /** The parent race, for grouping subraces in the picker. */
  family: string;
  /** Fixed increases, applied to every member of the race. */
  asi: Partial<Record<Ability, number>>;
  /** A floating increase the player assigns, if the race has one. */
  pick?: AsiPick;
  /** The one-line summary shown under the name. */
  note: string;
  speed: number;
  size: Size;
  /** 0 means none. */
  darkvision: number;
  traits: readonly string[];
  source: Source;
}

export const RACES: readonly RaceDef[] = [
  // ---------------------------------------------------------------- Human
  {
    name: 'Human',
    family: 'Human',
    asi: { STR: 1, DEX: 1, CON: 1, INT: 1, WIS: 1, CHA: 1 },
    note: '+1 to every score',
    speed: 30,
    size: 'Medium',
    darkvision: 0,
    traits: ['An extra language'],
    source: 'PHB',
  },
  {
    name: 'Variant Human',
    family: 'Human',
    asi: {},
    pick: { count: 2, amount: 1 },
    note: '+1 to two scores of your choice · a skill and a feat',
    speed: 30,
    size: 'Medium',
    darkvision: 0,
    traits: ['One skill proficiency of your choice', 'One feat at 1st level', 'An extra language'],
    source: 'PHB',
  },

  // ------------------------------------------------------------------ Elf
  {
    name: 'High Elf',
    family: 'Elf',
    asi: { DEX: 2, INT: 1 },
    note: '+2 DEX, +1 INT · a wizard cantrip',
    speed: 30,
    size: 'Medium',
    darkvision: 60,
    traits: ['One wizard cantrip, cast with INT', 'Advantage against being charmed; magic cannot put you to sleep', 'Trance — four hours of meditation replaces sleep'],
    source: 'PHB',
  },
  {
    name: 'Wood Elf',
    family: 'Elf',
    asi: { DEX: 2, WIS: 1 },
    note: '+2 DEX, +1 WIS · fast and hard to spot',
    speed: 35,
    size: 'Medium',
    darkvision: 60,
    traits: ['Mask of the Wild — hide even when only lightly obscured', 'Advantage against being charmed; magic cannot put you to sleep', 'Trance — four hours of meditation replaces sleep'],
    source: 'PHB',
  },
  {
    name: 'Drow',
    family: 'Elf',
    asi: { DEX: 2, CHA: 1 },
    note: '+2 DEX, +1 CHA · superior darkvision',
    speed: 30,
    size: 'Medium',
    darkvision: 120,
    traits: ['Dancing lights, then faerie fire and darkness as you level', 'Sunlight sensitivity — disadvantage in direct sun', 'Advantage against being charmed'],
    source: 'PHB',
  },

  // ----------------------------------------------------------------- Dwarf
  {
    name: 'Hill Dwarf',
    family: 'Dwarf',
    asi: { CON: 2, WIS: 1 },
    note: '+2 CON, +1 WIS · extra HP per level',
    speed: 25,
    size: 'Medium',
    darkvision: 60,
    traits: ['Dwarven Toughness — +1 hit point per level', 'Advantage on saves against poison, and resistance to poison damage', 'Speed is not reduced by heavy armour'],
    source: 'PHB',
  },
  {
    name: 'Mountain Dwarf',
    family: 'Dwarf',
    asi: { STR: 2, CON: 2 },
    note: '+2 STR, +2 CON · armour training',
    speed: 25,
    size: 'Medium',
    darkvision: 60,
    traits: ['Proficiency with light and medium armour', 'Advantage on saves against poison, and resistance to poison damage', 'Speed is not reduced by heavy armour'],
    source: 'PHB',
  },

  // -------------------------------------------------------------- Half-Elf
  {
    name: 'Half-Elf',
    family: 'Half-Elf',
    asi: { CHA: 2 },
    pick: { count: 2, amount: 1, exclude: ['CHA'] },
    note: '+2 CHA, and +1 to two other scores of your choice · two extra skills',
    speed: 30,
    size: 'Medium',
    darkvision: 60,
    traits: ['Two skill proficiencies of your choice', 'Advantage against being charmed; magic cannot put you to sleep'],
    source: 'PHB',
  },

  // -------------------------------------------------------------- Halfling
  {
    name: 'Lightfoot Halfling',
    family: 'Halfling',
    asi: { DEX: 2, CHA: 1 },
    note: '+2 DEX, +1 CHA · hide behind allies',
    speed: 25,
    size: 'Small',
    darkvision: 0,
    traits: ['Naturally Stealthy — hide behind a creature one size larger', 'Lucky — reroll a natural 1 on attacks, checks and saves', 'Brave — advantage against being frightened'],
    source: 'PHB',
  },
  {
    name: 'Stout Halfling',
    family: 'Halfling',
    asi: { DEX: 2, CON: 1 },
    note: '+2 DEX, +1 CON · poison resistance',
    speed: 25,
    size: 'Small',
    darkvision: 0,
    traits: ['Stout Resilience — advantage on poison saves, resistance to poison damage', 'Lucky — reroll a natural 1 on attacks, checks and saves', 'Brave — advantage against being frightened'],
    source: 'PHB',
  },

  // -------------------------------------------------------------- Half-Orc
  {
    name: 'Half-Orc',
    family: 'Half-Orc',
    asi: { STR: 2, CON: 1 },
    note: '+2 STR, +1 CON · relentless endurance',
    speed: 30,
    size: 'Medium',
    darkvision: 60,
    traits: ['Relentless Endurance — drop to 1 hit point instead of 0, once per long rest', 'Savage Attacks — an extra damage die on melee crits', 'Menacing — proficiency in Intimidation'],
    source: 'PHB',
  },

  // ----------------------------------------------------------- Dragonborn
  {
    name: 'Dragonborn',
    family: 'Dragonborn',
    asi: { STR: 2, CHA: 1 },
    note: '+2 STR, +1 CHA · breath weapon',
    speed: 30,
    size: 'Medium',
    darkvision: 0,
    traits: ['Breath weapon in a line or cone, by draconic ancestry', 'Resistance to your ancestry’s damage type'],
    source: 'PHB',
  },

  // -------------------------------------------------------------- Tiefling
  {
    name: 'Tiefling',
    family: 'Tiefling',
    asi: { CHA: 2, INT: 1 },
    note: '+2 CHA, +1 INT · fire resistance',
    speed: 30,
    size: 'Medium',
    darkvision: 60,
    traits: ['Thaumaturgy, then hellish rebuke and darkness as you level', 'Resistance to fire damage'],
    source: 'PHB',
  },

  // ----------------------------------------------------------------- Gnome
  {
    name: 'Forest Gnome',
    family: 'Gnome',
    asi: { INT: 2, DEX: 1 },
    note: '+2 INT, +1 DEX · minor illusion',
    speed: 25,
    size: 'Small',
    darkvision: 60,
    traits: ['Minor illusion, cast with INT', 'Speak with Small Beasts', 'Gnome Cunning — advantage on INT, WIS and CHA saves against magic'],
    source: 'PHB',
  },
  {
    name: 'Rock Gnome',
    family: 'Gnome',
    asi: { INT: 2, CON: 1 },
    note: '+2 INT, +1 CON · tinker',
    speed: 25,
    size: 'Small',
    darkvision: 60,
    traits: ["Tinker — build clockwork devices with artisan's tools", 'Artificer’s Lore — double proficiency on magic and device history', 'Gnome Cunning — advantage on INT, WIS and CHA saves against magic'],
    source: 'PHB',
  },

  // --------------------------------------------------------------- Aasimar
  {
    name: 'Protector Aasimar',
    family: 'Aasimar',
    asi: { CHA: 2, WIS: 1 },
    note: '+2 CHA, +1 WIS · radiant soul, spectral wings',
    speed: 30,
    size: 'Medium',
    darkvision: 60,
    traits: ['Radiant Soul — wings and radiant damage once per long rest', 'Healing Hands — heal a number of hit points equal to your level', 'Resistance to radiant and necrotic damage'],
    source: 'VRGtR',
  },
  {
    name: 'Scourge Aasimar',
    family: 'Aasimar',
    asi: { CHA: 2, CON: 1 },
    note: '+2 CHA, +1 CON · radiant consumption burns friend and foe',
    speed: 30,
    size: 'Medium',
    darkvision: 60,
    traits: ['Radiant Consumption — burning light damages everything near you', 'Healing Hands — heal a number of hit points equal to your level', 'Resistance to radiant and necrotic damage'],
    source: 'VRGtR',
  },
  {
    name: 'Fallen Aasimar',
    family: 'Aasimar',
    asi: { CHA: 2, STR: 1 },
    note: '+2 CHA, +1 STR · necrotic shroud frightens',
    speed: 30,
    size: 'Medium',
    darkvision: 60,
    traits: ['Necrotic Shroud — frighten those nearby and deal necrotic damage', 'Healing Hands — heal a number of hit points equal to your level', 'Resistance to radiant and necrotic damage'],
    source: 'VRGtR',
  },
];

export const raceByName = (name: string): RaceDef | null =>
  RACES.find((r) => r.name === name) ?? null;

/** The race list grouped by family, in declaration order. */
export function racesByFamily(): { family: string; races: RaceDef[] }[] {
  const out: { family: string; races: RaceDef[] }[] = [];
  for (const race of RACES) {
    const group = out.find((g) => g.family === race.family);
    if (group) group.races.push(race);
    else out.push({ family: race.family, races: [race] });
  }
  return out;
}
