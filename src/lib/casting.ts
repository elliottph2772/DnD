// Spending and recovering spell slots, and the prepared-spell rules.
// Pure functions over a Character — no React, no store, no I/O.
//
// Slot counts themselves live in src/data/rules.ts. This module only decides
// what is left, what a spell may be cast with, and what a rest gives back.

import {
  casterFor,
  listFor,
  pickCountFor,
  restoresOnShort,
  slotsFor,
  type SlotTable,
} from '../data/rules';
import { abilityMod } from './chargen';
import type { Character } from '../types';

/** One slot level: how many the character has, and how many are gone. */
export interface SlotRow {
  level: number;
  total: number;
  used: number;
  left: number;
}

/** Every slot level the character has, lowest first. */
export function slotRows(character: Character): SlotRow[] {
  const total: SlotTable = slotsFor(character.cls, character.level);
  return Object.keys(total)
    .map(Number)
    .sort((a, b) => a - b)
    .map((level) => {
      const have = total[String(level)] ?? 0;
      // A level award can shrink a slot row; never report more spent than held.
      const used = Math.min(Number(character.slotsUsed?.[String(level)] ?? 0), have);
      return { level, total: have, used, left: have - used };
    });
}

/** Does this character cast at all? */
export const casts = (character: Character): boolean =>
  casterFor(character.cls).kind !== 'none';

/**
 * The slot levels that could carry a spell of this level — its own level and
 * anything higher that still has a slot left. A cantrip needs no slot and
 * comes back empty.
 */
export function upcastOptions(character: Character, spellLevel: number): number[] {
  if (spellLevel <= 0) return [];
  return slotRows(character)
    .filter((row) => row.level >= spellLevel && row.left > 0)
    .map((row) => row.level);
}

/** Can this spell be cast right now? Cantrips always can. */
export function canCast(character: Character, spellLevel: number): boolean {
  if (spellLevel <= 0) return true;
  return upcastOptions(character, spellLevel).length > 0;
}

/**
 * Spend one slot of the given level. Returns the character unchanged when
 * there is nothing to spend, so a double-tap cannot drive a slot negative.
 */
export function castAt(character: Character, slotLevel: number): Character {
  if (slotLevel <= 0) return character;
  const row = slotRows(character).find((r) => r.level === slotLevel);
  if (!row || row.left <= 0) return character;
  return {
    ...character,
    slotsUsed: { ...character.slotsUsed, [String(slotLevel)]: row.used + 1 },
  };
}

/** Hand one slot of that level back — used when the GM reverses a cast. */
export function refund(character: Character, slotLevel: number): Character {
  const key = String(slotLevel);
  const used = Number(character.slotsUsed?.[key] ?? 0);
  if (used <= 0) return character;
  return { ...character, slotsUsed: { ...character.slotsUsed, [key]: used - 1 } };
}

/**
 * A short rest. Only pact magic comes back — every other caster keeps its
 * spent slots until a long rest.
 */
export function shortRest(character: Character): Character {
  if (!restoresOnShort(character.cls)) return character;
  return { ...character, slotsUsed: {} };
}

/** A long rest: every slot back, hit points full, temporary hit points gone. */
export function longRest(character: Character): Character {
  return {
    ...character,
    slotsUsed: {},
    hp: character.maxHp,
    temp: 0,
  };
}

/** The casting ability's modifier, or 0 for a class that does not cast. */
export function castingMod(character: Character): number {
  const caster = casterFor(character.cls);
  if (!caster.ability) return 0;
  return abilityMod(character.scores[caster.ability]);
}

/**
 * How many spells a prepared caster may hold ready. Known casters and wizards
 * answer with their full list, since those are fixed rather than prepared
 * each morning.
 */
export function preparedLimit(character: Character): number {
  const caster = casterFor(character.cls);
  if (caster.kind === 'none') return 0;
  // A known caster's list is fixed: everything it knows is ready to cast.
  if (caster.kind === 'known') return character.spells.length;
  // A wizard prepares INT modifier + wizard level out of its spellbook. That
  // is NOT the size of the book — pickCountFor answers with the book size for
  // a `book` caster (6 at 1st, 2 more a level), which is how many spells it
  // has written down, not how many it can hold ready.
  if (caster.kind === 'book') {
    return Math.max(1, castingMod(character) + character.level);
  }
  return pickCountFor(character.cls, character.level, castingMod(character));
}

/** A prepared caster or a wizard chooses which spells are ready each day. */
export const prepares = (character: Character): boolean => {
  const kind = casterFor(character.cls).kind;
  return kind === 'prepared' || kind === 'book';
};

/**
 * The spells that may be prepared from. A wizard prepares out of its own
 * spellbook; a cleric or druid prepares from the whole class list.
 */
export function preparableNames(character: Character): string[] {
  const caster = casterFor(character.cls);
  // A wizard prepares out of the book it has actually written.
  if (caster.kind === 'book') return [...character.spells];
  // A cleric, druid, paladin or artificer knows its whole class list and
  // prepares from all of it, up to its highest slot level.
  if (caster.kind === 'prepared') {
    return listFor(character.cls, character.level).map((spell) => spell.name);
  }
  return [];
}

/** Toggle one spell in the prepared list, refusing to go over the limit. */
export function togglePrepared(character: Character, name: string): Character {
  const has = character.prepared.includes(name);
  if (has) {
    return { ...character, prepared: character.prepared.filter((n) => n !== name) };
  }
  if (character.prepared.length >= preparedLimit(character)) return character;
  return { ...character, prepared: [...character.prepared, name] };
}

/**
 * The spells the sheet will actually let you cast: the prepared list for a
 * caster that prepares, the known list for everyone else, plus cantrips.
 */
export function castableNames(character: Character): string[] {
  if (!casts(character)) return [];
  const leveled = prepares(character) ? character.prepared : character.spells;
  return [...character.cantrips, ...leveled];
}

/**
 * True when the agent has awarded a level since the picks were made, which
 * puts the player back in front of the spell list.
 */
export const needsNewPicks = (character: Character): boolean =>
  casts(character) && character.built && character.spellsAt !== character.level;

/** "1st", "2nd", "3rd"… for slot labels. */
export function ordinal(n: number): string {
  const names = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'];
  return names[n] || `${n}th`;
}

/**
 * The slot a spell will actually be cast with, given the level the player
 * picked. When that level is no longer available — they spent the last one —
 * this falls to the lowest slot that still works, and returns 0 when none do.
 *
 * The sheet drives both the select's value and the cast from this, so what is
 * displayed and what is spent cannot drift apart. BUILD-PLAN records the
 * prototype bug where exactly that drift happened on the condition select.
 */
export function activeSlot(character: Character, spellLevel: number, preferred: number): number {
  const options = upcastOptions(character, spellLevel);
  if (options.length === 0) return 0;
  return options.includes(preferred) ? preferred : options[0];
}
