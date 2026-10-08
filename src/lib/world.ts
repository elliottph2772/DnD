// Pure world and character helpers. No Supabase, no React — everything here
// is a function of its arguments, which is what makes the rules testable.

import type { ActiveCondition, Character, ChatLine, World } from '../types';

/** An unclaimed, unbuilt seat. Level 3 and 900 xp, as the wizard commits. */
export const blankCharacter = (): Character => ({
  name: '',
  cls: '',
  level: 3,
  ac: 10,
  hp: 0,
  maxHp: 0,
  temp: 0,
  initMod: 0,
  pp: 10,
  xp: 900,
  built: false,
  race: '',
  background: '',
  skills: '',
  scores: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
  conditions: [],
  features: [],
  inventory: '',
  notes: '',
  // spellsAt records the level the picks were made at, so a level award from
  // the agent puts the character back in front of the spell list.
  cantrips: [],
  spells: [],
  prepared: [],
  slotsUsed: {},
  spellsAt: 0,
  cond: [],
});

export const blankParty = (): Character[] => [
  blankCharacter(),
  blankCharacter(),
  blankCharacter(),
  blankCharacter(),
];

/** A world row for a campaign nobody has played yet. */
export const blankWorld = (by: string, campaign = 'A new campaign'): World => ({
  by,
  campaign,
  scene: '',
  feed: [],
  threat: 0,
  corruption: 0,
  biome: null,
  quests: [],
  journal: [],
  factions: [],
  antagonist: { name: '', adaptation: '' },
  enemies: [],
  order: [],
  round: 1,
  turnIdx: 0,
  bestiary: [],
  chat_cursor: 0,
});

/**
 * Campaign codes come from the server so two tables cannot race onto one code
 * and a guesser cannot squat a memorable word. Eight characters from an
 * alphabet with no 0/O or 1/I to misread aloud.
 */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function newCode(length = 8): string {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

/**
 * Trim a world down to what the column stores: the feed and journal are
 * capped, the bestiary keeps its last eight.
 */
export function worldRow(world: World, by: string): World {
  return {
    ...world,
    by,
    feed: (world.feed || []).slice(-40),
    journal: (world.journal || []).slice(-20),
    bestiary: (world.bestiary || []).slice(0, 8),
    chat_cursor: Number(world.chat_cursor || 0),
  };
}

/**
 * Should this client apply an inbound world row?
 *
 * Your own writes come back on the channel and are ignored. The GM console is
 * the author of the world, so it ignores everyone else's rows too — except
 * turns resolved by the server agent, which is what lets the GM advance the
 * scene from their phone, and the initial pull on connect.
 */
export function shouldApplyWorld(
  incoming: Pick<World, 'by'> | null | undefined,
  opts: { clientId: string; isGM: boolean; force?: boolean },
): boolean {
  if (!incoming) return false;
  if (incoming.by === opts.clientId) return false;
  if (opts.force) return true;
  if (!opts.isGM) return true;
  return incoming.by === 'gm-agent';
}

/**
 * Declarations still awaiting the GM: everything newer than the cursor the
 * world row carries. Advancing a turn folds these in and moves the cursor.
 */
export function pendingChat(chat: ChatLine[], cursor: number): ChatLine[] {
  const cur = Number(cursor || 0);
  return chat.filter((line) => line.id > cur);
}

/**
 * Fold one realtime chat row into the local list: never behind the cursor,
 * never twice, newest 30 kept.
 */
export function mergeChatRow(chat: ChatLine[], row: ChatLine, cursor: number): ChatLine[] {
  if (!row || !row.text) return chat;
  if (row.id <= Number(cursor || 0)) return chat;
  if (chat.some((x) => x.id === row.id)) return chat;
  return chat.concat([{ id: row.id, speaker: row.speaker, text: row.text }]).slice(-30);
}

/** `expires` is an absolute round number; 0 means it never ticks down. */
export const conditionExpires = (round: number, rounds: number): number =>
  rounds > 0 ? round + rounds : 0;

/**
 * Advance the round clock by one and drop every condition whose absolute
 * expiry has arrived. Conditions with `expires === 0` are released by hand.
 */
export function tickRound(party: Character[], round: number): { party: Character[]; round: number } {
  const next = round + 1;
  return {
    round: next,
    party: party.map((c) => dropExpired(c, next)),
  };
}

/** Drop this character's conditions that expire at or before `round`. */
export function dropExpired(character: Character, round: number): Character {
  const cond = (character.cond || []).filter((x) => !(x.expires > 0 && x.expires <= round));
  if (cond.length === (character.cond || []).length) return character;
  return { ...character, cond, conditions: cond.map((x) => x.name) };
}

/** Apply a condition, keeping `conditions` in step as the agent prompt's mirror. */
export function applyCondition(character: Character, cond: ActiveCondition): Character {
  const rest = (character.cond || []).filter((x) => x.name !== cond.name);
  const next = rest.concat([cond]);
  return { ...character, cond: next, conditions: next.map((x) => x.name) };
}

/** Release one condition early. */
export function releaseCondition(character: Character, name: string): Character {
  const cond = (character.cond || []).filter((x) => x.name !== name);
  return { ...character, cond, conditions: cond.map((x) => x.name) };
}
