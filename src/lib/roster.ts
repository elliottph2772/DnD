// The roster: characters that belong to a person rather than to a chair.
//
// Pure functions over the shapes — no React, no store, no I/O — so the one
// rule that matters is testable on its own: bringing a character into a
// campaign COPIES it into the seat, and the seat's copy is the live one from
// then on. Without the copy, playing a second campaign would overwrite the
// character in the first, and a character legitimately sits at different
// levels in different games. docs/BUILD-PLAN.md step 9 records the ruling.

import { blankCharacter } from './world';
import type { Character } from '../types';

/** A row in `characters`: a character on someone's roster, in no campaign. */
export interface RosterEntry {
  id: string;
  owner: string;
  /** The build. Not the live state of any campaign it is playing. */
  data: Character;
  created_at: string;
  updated_at: string;
}

/**
 * The state that belongs to a campaign rather than to the character: hit
 * points, spent slots, and whatever is riding on them. Reset, never deleted —
 * `Character` has no optional fields here and a missing key would break every
 * component that reads it.
 */
const freshState = (maxHp: number): Pick<
  Character,
  'hp' | 'temp' | 'slotsUsed' | 'cond' | 'conditions'
> => ({
  hp: maxHp,
  temp: 0,
  slotsUsed: {},
  cond: [],
  conditions: [],
});

/**
 * The copy that sits down at the table. Starts at full health with nothing
 * spent and nothing riding on it, however the roster copy was last left.
 */
export function instanceFor(entry: RosterEntry): Character {
  return { ...entry.data, ...freshState(entry.data.maxHp) };
}

/**
 * What goes back on the roster when a character leaves a campaign — the build
 * as it was played, with that campaign's live state stripped off.
 *
 * Level and XP *do* travel: a character who earned a level earned it. Hit
 * points and spent slots do not, because they are a moment in one game.
 */
export function buildFrom(played: Character): Character {
  return { ...played, ...freshState(played.maxHp) };
}

/** A fresh, unbuilt character for the wizard to fill in. */
export const blankRosterCharacter = (): Character => blankCharacter();

/** Characters on this roster that are ready to play. */
export const playable = (roster: readonly RosterEntry[]): RosterEntry[] =>
  roster.filter((r) => r.data?.built);

/**
 * Is this roster character already sitting at this table? A character may play
 * many campaigns, but not two seats in the same one.
 */
export function seatedIn(
  characterId: string,
  seats: readonly { character_id: string | null }[],
): boolean {
  return seats.some((s) => s.character_id === characterId);
}

/** The label the roster list shows for an entry. */
export function describe(entry: RosterEntry): string {
  const c = entry.data;
  if (!c?.built) return 'Unfinished';
  return [c.cls, c.race, `level ${c.level}`].filter(Boolean).join(' · ');
}

/** Sort a roster newest-played first, with unfinished characters at the end. */
export function ordered(roster: readonly RosterEntry[]): RosterEntry[] {
  return [...roster].sort((a, b) => {
    if (Boolean(a.data?.built) !== Boolean(b.data?.built)) return a.data?.built ? -1 : 1;
    return (b.updated_at || '').localeCompare(a.updated_at || '');
  });
}
