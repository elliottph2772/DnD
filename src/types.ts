// The shared shapes, straight from docs/ARCHITECTURE.md. The jsonb columns are
// typed here once and nowhere else.

export type Ability = 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA';

export type Scores = Record<Ability, number>;

export interface FeedLine {
  speaker: string;
  text: string;
}

export interface ChatLine {
  id: number;
  speaker: string;
  text: string;
}

export interface Quest {
  title: string;
  status: 'active' | 'done' | 'failed';
}

export interface JournalEntry {
  title: string;
  text: string;
}

export interface Faction {
  name: string;
  /** -100 … 100 */
  rep: number;
}

export interface Antagonist {
  name: string;
  adaptation: string;
}

export interface Enemy {
  name: string;
  hp: number;
  maxHp: number;
  ac: number;
  initMod: number;
  notes: string;
}

export interface Combatant {
  name: string;
  init: number;
  foe: boolean;
}

export interface Biome {
  name: string;
  summary?: string;
  [key: string]: unknown;
}

export interface Statblock {
  name: string;
  [key: string]: unknown;
}

/** An active condition on a character. */
export interface ActiveCondition {
  name: string;
  label: string;
  rounds: number;
  /** Absolute round number it drops on; 0 = no clock, released by hand. */
  expires: number;
}

export interface Character {
  name: string;
  /** Includes the subclass: "Wizard (School of Evocation)". */
  cls: string;
  race: string;
  background: string;
  /** Free-text list, as the prototype stores it. */
  skills: string;
  level: number;
  /** Final scores, after racial bonuses. */
  scores: Scores;
  hp: number;
  maxHp: number;
  temp: number;
  ac: number;
  initMod: number;
  pp: number;
  xp: number;
  inventory: string;
  notes: string;
  features: string[];
  built: boolean;

  // casting
  cantrips: string[];
  spells: string[];
  prepared: string[];
  /** `{ "1": 2 }` means two 1st-level slots spent. */
  slotsUsed: Record<string, number>;
  /** The level the picks were last made at; `!== level` prompts a re-pick. */
  spellsAt: number;

  // conditions
  cond: ActiveCondition[];
  /** Mirror of `cond[].name`, for the agent prompt. */
  conditions: string[];
}

/** The `campaigns.world` jsonb column. */
export interface World {
  /** clientId of the last writer, or "gm-agent". */
  by: string;
  campaign: string;
  scene: string;
  /** Last 40 transcript lines. */
  feed: FeedLine[];
  /** 0–100 */
  threat: number;
  /** 0–100 */
  corruption: number;
  biome: Biome | null;
  quests: Quest[];
  /** Last 20. */
  journal: JournalEntry[];
  factions: Faction[];
  antagonist: Antagonist;
  enemies: Enemy[];
  /** Initiative order. */
  order: Combatant[];
  round: number;
  turnIdx: number;
  /** Last 8. */
  bestiary: Statblock[];
  /** Highest chat.id already resolved into a turn. */
  chat_cursor: number;
  turn_at?: string;
}

/** The `characters` row. */
export interface SeatRow {
  campaign_id: string;
  slot: number;
  claimed_by: string | null;
  data: { by: string; char: Character | null };
  updated_at: string;
}

export interface CampaignSummary {
  id: string;
  when: string;
}

export type ConnState = 'idle' | 'connecting' | 'live' | 'error';
