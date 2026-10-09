// The 13 D&D 5e classes, their subclasses, and the proficiencies character
// creation needs. A plain typed data module, like spells.ts and rules.ts.
//
// Subclass coverage is the full published set for each class, with the book it
// came from. `at` is the level the class chooses its subclass — Cleric,
// Sorcerer and Warlock decide at 1st, Druid and Wizard at 2nd, the rest at 3rd.
// The wizard starts characters at level 3, so every class picks one.
//
// Casting is NOT described here: `CASTER` in rules.ts owns that, keyed by the
// same class names. Keep the keys in step.

import type { Ability } from './rules';

export type Source = 'PHB' | 'DMG' | 'SCAG' | 'XGtE' | 'TCoE' | 'EGtW' | 'VRGtR' | 'FToD' | 'BGG' | 'DSotDQ';

export interface Subclass {
  name: string;
  /** One line, in the prototype's voice: what it plays like, not its lore. */
  desc: string;
  source: Source;
}

/**
 * How a class computes AC with its starting kit.
 *  - `armor`  : base AC plus DEX, capped by `maxDex` (medium armour caps at 2)
 *  - `con`/`wis`: unarmoured defence — 10 + DEX + that ability's modifier
 */
export interface ArmorProfile {
  kind: 'armor' | 'con' | 'wis';
  base?: number;
  maxDex?: number;
  shield?: boolean;
  label: string;
}

export interface ClassDef {
  name: string;
  /** Hit die size: 6, 8, 10 or 12. */
  hd: number;
  desc: string;
  /** The two saving throws every member of the class is proficient in. */
  saves: readonly [Ability, Ability];
  /** Ability the class leans on, for the wizard's hint text. */
  primary: readonly Ability[];
  /** How many skills the class picks at 1st level. */
  skillCount: number;
  /** The list it picks from. `'any'` means any skill (Bard). */
  skillList: readonly string[] | 'any';
  armor: ArmorProfile;
  /** What the class's starting equipment pack contains. */
  kit: string;
  /** The level this class chooses its subclass. */
  at: number;
  /** What this class calls its subclass feature, e.g. "Divine Domain". */
  subLabel: string;
  subs: readonly Subclass[];
}

const ALL_SKILLS = [
  'Acrobatics', 'Animal Handling', 'Arcana', 'Athletics', 'Deception', 'History',
  'Insight', 'Intimidation', 'Investigation', 'Medicine', 'Nature', 'Perception',
  'Performance', 'Persuasion', 'Religion', 'Sleight of Hand', 'Stealth', 'Survival',
] as const;

export const SKILLS: readonly string[] = ALL_SKILLS;

/** Which ability each skill is checked against — used for the sheet later. */
export const SKILL_ABILITY: Record<string, Ability> = {
  Acrobatics: 'DEX', 'Animal Handling': 'WIS', Arcana: 'INT', Athletics: 'STR',
  Deception: 'CHA', History: 'INT', Insight: 'WIS', Intimidation: 'CHA',
  Investigation: 'INT', Medicine: 'WIS', Nature: 'INT', Perception: 'WIS',
  Performance: 'CHA', Persuasion: 'CHA', Religion: 'INT', 'Sleight of Hand': 'DEX',
  Stealth: 'DEX', Survival: 'WIS',
};

export const CLASSES: readonly ClassDef[] = [
  {
    name: 'Barbarian',
    hd: 12,
    desc: 'Rage, reckless attack, and a body that refuses to fall.',
    saves: ['STR', 'CON'],
    primary: ['STR', 'CON'],
    skillCount: 2,
    skillList: ['Animal Handling', 'Athletics', 'Intimidation', 'Nature', 'Perception', 'Survival'],
    armor: { kind: 'con', label: 'Unarmoured defence — 10 + DEX + CON' },
    kit: "Greataxe, two handaxes, four javelins, explorer's pack",
    at: 3,
    subLabel: 'Primal Path',
    subs: [
      { name: 'Path of the Berserker', desc: 'Frenzy: more attacks, at the cost of exhaustion.', source: 'PHB' },
      { name: 'Path of the Totem Warrior', desc: 'Bear, eagle or wolf spirit — resilience or speed.', source: 'PHB' },
      { name: 'Path of the Ancestral Guardian', desc: 'Your dead intercede; enemies who ignore you suffer.', source: 'XGtE' },
      { name: 'Path of the Storm Herald', desc: 'Rage radiates a desert, sea or tundra aura.', source: 'XGtE' },
      { name: 'Path of the Zealot', desc: 'Divine fury — you fight past death itself.', source: 'XGtE' },
      { name: 'Path of the Beast', desc: 'Grow a bite, claws or a tail when the rage takes you.', source: 'TCoE' },
      { name: 'Path of Wild Magic', desc: 'Rage leaks raw magic; roll for what it does.', source: 'TCoE' },
      { name: 'Path of the Giant', desc: 'Grow to Large and throw what you are holding.', source: 'BGG' },
    ],
  },
  {
    name: 'Bard',
    hd: 8,
    desc: 'Inspiration, spells, and skill at everything not quite yours.',
    saves: ['DEX', 'CHA'],
    primary: ['CHA'],
    skillCount: 3,
    skillList: 'any',
    armor: { kind: 'armor', base: 11, maxDex: 99, label: 'Leather armour — 11 + DEX' },
    kit: "Rapier, leather armour, dagger, lute, entertainer's pack",
    at: 3,
    subLabel: 'Bard College',
    subs: [
      { name: 'College of Lore', desc: 'Cutting words and the widest spell list at the table.', source: 'PHB' },
      { name: 'College of Valor', desc: 'Armour, weapons, and inspiration that lands as damage.', source: 'PHB' },
      { name: 'College of Glamour', desc: 'Fey charm — command a crowd mid-sentence.', source: 'XGtE' },
      { name: 'College of Swords', desc: 'Blade flourishes; a duelist who casts.', source: 'XGtE' },
      { name: 'College of Whispers', desc: 'Fear, blackmail, and stolen identities.', source: 'XGtE' },
      { name: 'College of Creation', desc: 'Sing objects into being; dancing items fight for you.', source: 'TCoE' },
      { name: 'College of Eloquence', desc: 'Never roll low on persuasion; unsettle with a word.', source: 'TCoE' },
      { name: 'College of Spirits', desc: 'Tales told from a deck; the dead supply the ending.', source: 'VRGtR' },
    ],
  },
  {
    name: 'Cleric',
    hd: 8,
    desc: 'Divine magic, heavy armour options, and the best healing.',
    saves: ['WIS', 'CHA'],
    primary: ['WIS'],
    skillCount: 2,
    skillList: ['History', 'Insight', 'Medicine', 'Persuasion', 'Religion'],
    armor: { kind: 'armor', base: 16, maxDex: 0, shield: true, label: 'Chain mail and shield — 18' },
    kit: "Chain mail, shield, mace, light crossbow with 20 bolts, holy symbol, priest's pack",
    at: 1,
    subLabel: 'Divine Domain',
    subs: [
      { name: 'Knowledge Domain', desc: 'Read thoughts, borrow skills, know the past.', source: 'PHB' },
      { name: 'Life Domain', desc: 'The strongest healer; every cure does more.', source: 'PHB' },
      { name: 'Light Domain', desc: 'Radiant burst damage and flare-blinded enemies.', source: 'PHB' },
      { name: 'Nature Domain', desc: 'Druid spells, charmed beasts, and heavy armour.', source: 'PHB' },
      { name: 'Tempest Domain', desc: 'Thunder, lightning, and maximised damage.', source: 'PHB' },
      { name: 'Trickery Domain', desc: 'Illusory duplicates and blessings of stealth.', source: 'PHB' },
      { name: 'War Domain', desc: 'Extra attacks and divine strike — a front-liner.', source: 'PHB' },
      { name: 'Death Domain', desc: 'Necrotic reaping that carries to a second target.', source: 'DMG' },
      { name: 'Arcana Domain', desc: 'Wizard spells and mastery over the arcane dead.', source: 'SCAG' },
      { name: 'Forge Domain', desc: 'Bless armour and weapons; fire and steel.', source: 'XGtE' },
      { name: 'Grave Domain', desc: 'You mark the dying; wounds close and enemies break.', source: 'XGtE' },
      { name: 'Order Domain', desc: 'Command obedience; allies strike when you heal them.', source: 'TCoE' },
      { name: 'Peace Domain', desc: 'Bind allies together so harm and help are shared.', source: 'TCoE' },
      { name: 'Twilight Domain', desc: 'Darkvision for the party and temporary HP each turn.', source: 'TCoE' },
    ],
  },
  {
    name: 'Druid',
    hd: 8,
    desc: "Wild shape, terrain control, and nature's whole toolkit.",
    saves: ['INT', 'WIS'],
    primary: ['WIS'],
    skillCount: 2,
    skillList: ['Arcana', 'Animal Handling', 'Insight', 'Medicine', 'Nature', 'Perception', 'Religion', 'Survival'],
    armor: { kind: 'armor', base: 11, maxDex: 99, shield: true, label: 'Leather and shield — 13 + DEX' },
    kit: "Leather armour, wooden shield, scimitar, druidic focus, explorer's pack",
    at: 2,
    subLabel: 'Druid Circle',
    subs: [
      { name: 'Circle of the Land', desc: 'More spells, better terrain magic, fewer wild shapes.', source: 'PHB' },
      { name: 'Circle of the Moon', desc: 'Fight as a beast — combat wild shape at real CR.', source: 'PHB' },
      { name: 'Circle of Dreams', desc: 'Fey healing and safe camps in hostile country.', source: 'XGtE' },
      { name: 'Circle of the Shepherd', desc: 'Summon spirits; your conjured allies endure.', source: 'XGtE' },
      { name: 'Circle of Spores', desc: 'Necrotic halo and a symbiotic, walking rot.', source: 'TCoE' },
      { name: 'Circle of Stars', desc: 'A starry form for healing, damage or knowledge.', source: 'TCoE' },
      { name: 'Circle of Wildfire', desc: 'A fire spirit companion; burn and regrow.', source: 'TCoE' },
    ],
  },
  {
    name: 'Fighter',
    hd: 10,
    desc: 'The most attacks, the best armour, and second wind.',
    saves: ['STR', 'CON'],
    primary: ['STR', 'DEX'],
    skillCount: 2,
    skillList: ['Acrobatics', 'Animal Handling', 'Athletics', 'History', 'Insight', 'Intimidation', 'Perception', 'Survival'],
    armor: { kind: 'armor', base: 16, maxDex: 0, shield: true, label: 'Chain mail and shield — 18' },
    kit: "Chain mail, shield, longsword, light crossbow with 20 bolts, dungeoneer's pack",
    at: 3,
    subLabel: 'Martial Archetype',
    subs: [
      { name: 'Champion', desc: 'Simple and brutal — crits on 19, then 18.', source: 'PHB' },
      { name: 'Battle Master', desc: 'Manoeuvres: trip, disarm, riposte, command allies.', source: 'PHB' },
      { name: 'Eldritch Knight', desc: 'Abjuration and evocation spells alongside the sword.', source: 'PHB' },
      { name: 'Purple Dragon Knight', desc: 'A banneret: rally allies and share your resolve.', source: 'SCAG' },
      { name: 'Arcane Archer', desc: 'Enchanted arrows that banish, ensnare or seek.', source: 'XGtE' },
      { name: 'Cavalier', desc: 'Hold the line; punish anything that walks past you.', source: 'XGtE' },
      { name: 'Samurai', desc: 'Fighting spirit — advantage on demand, temporary HP.', source: 'XGtE' },
      { name: 'Echo Knight', desc: 'A spectral double you swap places with mid-fight.', source: 'EGtW' },
      { name: 'Psi Warrior', desc: 'Telekinetic strikes, shields, and short flight.', source: 'TCoE' },
      { name: 'Rune Knight', desc: 'Giant runes on your gear; grow Large to swing.', source: 'TCoE' },
    ],
  },
  {
    name: 'Monk',
    hd: 8,
    desc: 'Unarmed flurries, ki, and movement nothing can pin down.',
    saves: ['STR', 'DEX'],
    primary: ['DEX', 'WIS'],
    skillCount: 2,
    skillList: ['Acrobatics', 'Athletics', 'History', 'Insight', 'Religion', 'Stealth'],
    armor: { kind: 'wis', label: 'Unarmoured defence — 10 + DEX + WIS' },
    kit: "Shortsword, ten darts, dungeoneer's pack",
    at: 3,
    subLabel: 'Monastic Tradition',
    subs: [
      { name: 'Way of the Open Hand', desc: 'Push, trip and stun; the purest martial artist.', source: 'PHB' },
      { name: 'Way of Shadow', desc: 'Darkness, silence, and teleporting between shadows.', source: 'PHB' },
      { name: 'Way of the Four Elements', desc: 'Elemental ki — spells bought with your own energy.', source: 'PHB' },
      { name: 'Way of the Long Death', desc: 'Feed on the dying; fear and unnatural endurance.', source: 'SCAG' },
      { name: 'Way of the Sun Soul', desc: 'Throw radiant light; a monk at range.', source: 'XGtE' },
      { name: 'Way of the Drunken Master', desc: 'Erratic movement; you disengage as you strike.', source: 'XGtE' },
      { name: 'Way of the Kensei', desc: 'Chosen weapons treated as monk weapons.', source: 'XGtE' },
      { name: 'Way of Mercy', desc: 'Hands that heal or harm behind a physician’s mask.', source: 'TCoE' },
      { name: 'Way of the Astral Self', desc: 'Spectral arms and face fight alongside your body.', source: 'TCoE' },
      { name: 'Way of the Ascendant Dragon', desc: 'Breath weapon and draconic flight on ki.', source: 'FToD' },
    ],
  },
  {
    name: 'Paladin',
    hd: 10,
    desc: "Smites, auras, and an oath that binds your party's fate.",
    saves: ['WIS', 'CHA'],
    primary: ['STR', 'CHA'],
    skillCount: 2,
    skillList: ['Athletics', 'Insight', 'Intimidation', 'Medicine', 'Persuasion', 'Religion'],
    armor: { kind: 'armor', base: 16, maxDex: 0, shield: true, label: 'Chain mail and shield — 18' },
    kit: "Chain mail, shield, longsword, five javelins, holy symbol, priest's pack",
    at: 3,
    subLabel: 'Sacred Oath',
    subs: [
      { name: 'Oath of Devotion', desc: 'Sacred weapon and protection from the unholy.', source: 'PHB' },
      { name: 'Oath of the Ancients', desc: 'Fey light; resistance to spell damage for allies.', source: 'PHB' },
      { name: 'Oath of Vengeance', desc: 'Hunt one enemy relentlessly, with advantage.', source: 'PHB' },
      { name: 'Oathbreaker', desc: 'A fallen paladin commanding the undead.', source: 'DMG' },
      { name: 'Oath of the Crown', desc: 'Bound to the law; pull enemies onto your shield.', source: 'SCAG' },
      { name: 'Oath of Conquest', desc: 'Fear as a weapon; break the will to fight.', source: 'XGtE' },
      { name: 'Oath of Redemption', desc: 'Absorb harm meant for others; offer mercy first.', source: 'XGtE' },
      { name: 'Oath of Glory', desc: 'Athletic excellence; speed and guidance for the party.', source: 'TCoE' },
      { name: 'Oath of the Watchers', desc: 'Against the planar and the alien; initiative and saves.', source: 'TCoE' },
    ],
  },
  {
    name: 'Ranger',
    hd: 10,
    desc: 'Tracking, terrain mastery, and a marked quarry.',
    saves: ['STR', 'DEX'],
    primary: ['DEX', 'WIS'],
    skillCount: 3,
    skillList: ['Animal Handling', 'Athletics', 'Insight', 'Investigation', 'Nature', 'Perception', 'Stealth', 'Survival'],
    armor: { kind: 'armor', base: 14, maxDex: 2, label: 'Scale mail — 14 + DEX (max 2)' },
    kit: "Scale mail, two shortswords, longbow with 20 arrows, explorer's pack",
    at: 3,
    subLabel: 'Ranger Archetype',
    subs: [
      { name: 'Hunter', desc: 'Extra damage against hordes or large single foes.', source: 'PHB' },
      { name: 'Beast Master', desc: 'A companion animal that fights beside you.', source: 'PHB' },
      { name: 'Gloom Stalker', desc: 'Ambush from darkness; invisible to darkvision.', source: 'XGtE' },
      { name: 'Horizon Walker', desc: 'Planar step; teleport past the front line.', source: 'XGtE' },
      { name: 'Monster Slayer', desc: "Read a creature's defences, then exploit them.", source: 'XGtE' },
      { name: 'Fey Wanderer', desc: 'Psychic damage and a charmed, unsettling grace.', source: 'TCoE' },
      { name: 'Swarmkeeper', desc: 'A bound swarm that bites, shoves and moves you.', source: 'TCoE' },
      { name: 'Drakewarden', desc: 'A drake companion that grows large enough to ride.', source: 'FToD' },
    ],
  },
  {
    name: 'Rogue',
    hd: 8,
    desc: 'Sneak attack, expertise, and escapes nobody plans for.',
    saves: ['DEX', 'INT'],
    primary: ['DEX'],
    skillCount: 4,
    skillList: ['Acrobatics', 'Athletics', 'Deception', 'Insight', 'Intimidation', 'Investigation', 'Perception', 'Performance', 'Persuasion', 'Sleight of Hand', 'Stealth'],
    armor: { kind: 'armor', base: 11, maxDex: 99, label: 'Leather armour — 11 + DEX' },
    kit: "Leather armour, rapier, shortbow with 20 arrows, two daggers, thieves' tools, burglar's pack",
    at: 3,
    subLabel: 'Roguish Archetype',
    subs: [
      { name: 'Thief', desc: 'Fast hands, second-story work, use any magic item.', source: 'PHB' },
      { name: 'Assassin', desc: 'Automatic crits on surprised targets; false identities.', source: 'PHB' },
      { name: 'Arcane Trickster', desc: 'Illusion and enchantment with a mage hand of your own.', source: 'PHB' },
      { name: 'Mastermind', desc: 'Help as a bonus action; command the battlefield.', source: 'XGtE' },
      { name: 'Swashbuckler', desc: 'Duel one-on-one; disengage every single turn.', source: 'XGtE' },
      { name: 'Inquisitive', desc: 'Read faces, find the tell, sneak attack without allies.', source: 'XGtE' },
      { name: 'Scout', desc: 'Mobility and wilderness skill; strike and withdraw.', source: 'XGtE' },
      { name: 'Phantom', desc: 'Steal skills from the dead; necrotic sneak attack.', source: 'TCoE' },
      { name: 'Soulknife', desc: 'Psychic blades from nothing, and silent telepathy.', source: 'TCoE' },
    ],
  },
  {
    name: 'Sorcerer',
    hd: 6,
    desc: 'Innate magic bent mid-cast by metamagic.',
    saves: ['CON', 'CHA'],
    primary: ['CHA'],
    skillCount: 2,
    skillList: ['Arcana', 'Deception', 'Insight', 'Intimidation', 'Persuasion', 'Religion'],
    armor: { kind: 'armor', base: 10, maxDex: 99, label: 'No armour — 10 + DEX' },
    kit: "Light crossbow with 20 bolts, two daggers, component pouch, dungeoneer's pack",
    at: 1,
    subLabel: 'Sorcerous Origin',
    subs: [
      { name: 'Draconic Bloodline', desc: 'Draconic resilience, elemental affinity, wings later.', source: 'PHB' },
      { name: 'Wild Magic', desc: 'Raw chaos — surges you cannot fully control.', source: 'PHB' },
      { name: 'Storm Sorcery', desc: 'Fly on the wind whenever you cast.', source: 'XGtE' },
      { name: 'Divine Soul', desc: 'Cleric spells on the sorcerer chassis.', source: 'XGtE' },
      { name: 'Shadow Magic', desc: 'A hound of ill omen; you cling to life at 0 HP.', source: 'XGtE' },
      { name: 'Aberrant Mind', desc: 'Psionic spells cast without components.', source: 'TCoE' },
      { name: 'Clockwork Soul', desc: 'Order imposed: cancel advantage, restore balance.', source: 'TCoE' },
      { name: 'Lunar Sorcery', desc: 'Phases of the moon swap which magic you favour.', source: 'DSotDQ' },
    ],
  },
  {
    name: 'Warlock',
    hd: 8,
    desc: "A patron's power, spent in short bursts and invocations.",
    saves: ['WIS', 'CHA'],
    primary: ['CHA'],
    skillCount: 2,
    skillList: ['Arcana', 'Deception', 'History', 'Intimidation', 'Investigation', 'Nature', 'Religion'],
    armor: { kind: 'armor', base: 11, maxDex: 99, label: 'Leather armour — 11 + DEX' },
    kit: "Leather armour, light crossbow with 20 bolts, two daggers, component pouch, scholar's pack",
    at: 1,
    subLabel: 'Otherworldly Patron',
    subs: [
      { name: 'The Archfey', desc: 'Fey presence — charm or frighten a whole room.', source: 'PHB' },
      { name: 'The Fiend', desc: "Temporary HP on every kill; dark one's blessing.", source: 'PHB' },
      { name: 'The Great Old One', desc: 'Telepathy, and minds that break under attention.', source: 'PHB' },
      { name: 'The Undying', desc: 'Death holds no claim; you persist past what should kill.', source: 'SCAG' },
      { name: 'The Celestial', desc: 'Healing light and radiant fire.', source: 'XGtE' },
      { name: 'The Hexblade', desc: 'A cursed weapon; the most martial warlock.', source: 'XGtE' },
      { name: 'The Fathomless', desc: 'Tentacles, deep water, and cold pressure.', source: 'TCoE' },
      { name: 'The Genie', desc: 'A vessel to live in and elemental wrath to spend.', source: 'TCoE' },
      { name: 'The Undead', desc: 'Speak as a corpse; horrifying form and undeath.', source: 'VRGtR' },
    ],
  },
  {
    name: 'Wizard',
    hd: 6,
    desc: 'The widest spellbook in the game, prepared and precise.',
    saves: ['INT', 'WIS'],
    primary: ['INT'],
    skillCount: 2,
    skillList: ['Arcana', 'History', 'Insight', 'Investigation', 'Medicine', 'Religion'],
    armor: { kind: 'armor', base: 10, maxDex: 99, label: 'No armour — 10 + DEX' },
    kit: "Quarterstaff, spellbook, component pouch, scholar's pack",
    at: 2,
    subLabel: 'Arcane Tradition',
    subs: [
      { name: 'School of Abjuration', desc: 'An arcane ward that soaks damage for you.', source: 'PHB' },
      { name: 'School of Conjuration', desc: 'Summon creatures, objects and terrain at will.', source: 'PHB' },
      { name: 'School of Divination', desc: 'Portent — replace two rolls a day with your own.', source: 'PHB' },
      { name: 'School of Enchantment', desc: 'Charm, hypnosis, and split enchantments.', source: 'PHB' },
      { name: 'School of Evocation', desc: 'Sculpt spells so allies stand inside your fireball.', source: 'PHB' },
      { name: 'School of Illusion', desc: 'Malleable illusions that behave as you improvise.', source: 'PHB' },
      { name: 'School of Necromancy', desc: 'Raise the dead; drain life to sustain your own.', source: 'PHB' },
      { name: 'School of Transmutation', desc: 'Reshape matter; a stone of transmuted power.', source: 'PHB' },
      { name: 'Bladesinging', desc: 'Sword and spell together — a mobile duelist mage.', source: 'SCAG' },
      { name: 'War Magic', desc: 'Arcane deflection and unbreakable concentration.', source: 'XGtE' },
      { name: 'Chronurgy Magic', desc: 'Stall a turn, cap a roll, hold a spell in a bead.', source: 'EGtW' },
      { name: 'Graviturgy Magic', desc: 'Crush, slow or fling with manipulated weight.', source: 'EGtW' },
      { name: 'Order of Scribes', desc: 'An awakened spellbook that swaps damage types.', source: 'TCoE' },
    ],
  },
  {
    name: 'Artificer',
    hd: 8,
    desc: 'Infusions, gadgets, and half-casting with tools.',
    saves: ['CON', 'INT'],
    primary: ['INT'],
    skillCount: 2,
    skillList: ['Arcana', 'History', 'Investigation', 'Medicine', 'Nature', 'Perception', 'Sleight of Hand'],
    armor: { kind: 'armor', base: 12, maxDex: 99, label: 'Studded leather — 12 + DEX' },
    kit: "Studded leather, light crossbow with 20 bolts, thieves' tools, tinker's tools, dungeoneer's pack",
    at: 3,
    subLabel: 'Artificer Specialist',
    subs: [
      { name: 'Alchemist', desc: 'Experimental elixirs and potent healing.', source: 'TCoE' },
      { name: 'Armorer', desc: 'Arcane power armour in guardian or infiltrator mode.', source: 'TCoE' },
      { name: 'Artillerist', desc: 'A summoned cannon: fire, force or protection.', source: 'TCoE' },
      { name: 'Battle Smith', desc: 'A steel defender companion and arcane jolt.', source: 'TCoE' },
    ],
  },
];

export const classByName = (name: string): ClassDef | null =>
  CLASSES.find((c) => c.name === name) ?? null;

/** The skills a class may choose from, with `'any'` expanded to all 18. */
export function skillChoicesFor(cls: ClassDef): readonly string[] {
  return cls.skillList === 'any' ? ALL_SKILLS : cls.skillList;
}
