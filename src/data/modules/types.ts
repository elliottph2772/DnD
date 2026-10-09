// A campaign module: a prebuilt campaign the agent runs as referee rather than
// inventing from nothing. A plain typed data module, like rules.ts and spells.ts.
//
// The shape exists to serve one constraint: the module must NEVER go to the
// model as one blob. `core` is short and rides every prompt (and is prompt
// cached, since it never changes); everything else is addressable and only the
// live slice is sent — the party's location, who is standing in it, and the
// threads currently in play.
//
// Authoring is markdown-flavoured prose in the `text` fields. The structure is
// what keeps a turn cheap.

/** Stable identifier within a module, e.g. "grennhal". Lower-case, hyphenated. */
export type Ref = string;

export interface ModuleFaction {
  name: string;
  /** Where the party starts with them, −100…100. */
  rep: number;
  /** One line for the core; what they want and who they hate. */
  text: string;
}

export interface ModuleNpc {
  id: Ref;
  name: string;
  /** "Bell-warden of Grennhal" — shown in the console list. */
  role: string;
  /** One line. Travels with any location they are standing in. */
  summary: string;
  /** The full brief: manner, history, how they speak. Sent when present. */
  text: string;
  /** What they are trying to get. The agent plays toward this. */
  wants: string;
  /** Withheld until the party earns it. Never sent until revealed. */
  secret?: string;
}

export interface ModuleExit {
  to: Ref;
  /** "North, along the salted road" */
  text: string;
}

export interface ModuleLocation {
  id: Ref;
  name: string;
  /** One line. Always available, so the agent knows the map exists. */
  summary: string;
  /** The full description. Sent only while the party is here. */
  text: string;
  /** NPCs standing here. */
  npcs: Ref[];
  exits: ModuleExit[];
  /** Things a check might turn up here. */
  secrets?: string[];
  /** Statblock ids that belong to this place. */
  foes?: Ref[];
}

export interface ModuleBranch {
  /** What the party might do. */
  choice: string;
  /** Where that leads. The agent follows this rather than inventing. */
  outcome: string;
}

export interface ModuleScene {
  id: Ref;
  title: string;
  /** Prose: when this should fire. The agent judges it. */
  trigger: string;
  text: string;
  branches: ModuleBranch[];
  /** Fires at most once; tracked in ModuleState.fired. */
  once?: boolean;
}

export interface ModuleFoe {
  id: Ref;
  name: string;
  kind: string;
  cr: string;
  ac: number;
  hp: number;
  speed: string;
  stats: Record<string, number>;
  traits?: { name: string; text: string }[];
  actions?: { name: string; text: string }[];
  tactics: string;
}

/** The short, always-on heart of the module. Keep it tight — it rides every turn. */
export interface ModuleCore {
  /** What is happening and why, in a few sentences. */
  premise: string;
  /** The rules of this world that the agent must hold to. */
  canon: string[];
  antagonist: { name: string; goal: string; adaptation: string };
  factions: ModuleFaction[];
}

export interface CampaignModule {
  id: Ref;
  title: string;
  version: string;
  author: string;
  /** The pitch, shown when choosing a module. */
  blurb: string;
  tone: string;
  difficulty: string;
  /** Intended level range, e.g. [3, 6]. */
  levels: [number, number];
  core: ModuleCore;
  locations: ModuleLocation[];
  npcs: ModuleNpc[];
  scenes: ModuleScene[];
  bestiary: ModuleFoe[];
  opening: {
    location: Ref;
    scene: string;
    /** The first thing the players read. */
    text: string;
  };
  /** Quests on the board at the start. */
  quests: { title: string; status: 'active' | 'done' | 'failed' }[];
}

/**
 * Per-campaign progress through a module. Lives on `world.module`, so it syncs
 * over realtime like everything else and the module itself stays immutable.
 */
export interface ModuleState {
  /** Which module this campaign is running. */
  id: Ref;
  /** Where the party is. */
  at: Ref;
  /** Scene ids that have already fired. */
  fired: Ref[];
  /** Location ids the party has reached. */
  seen: Ref[];
  /** Secrets and NPC secrets the party has earned, by `"<ref>:<index>"`. */
  revealed: string[];
}

export const blankModuleState = (id: Ref, at: Ref): ModuleState => ({
  id,
  at,
  fired: [],
  seen: [at],
  revealed: [],
});
