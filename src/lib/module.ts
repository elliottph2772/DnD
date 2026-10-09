// Running a campaign module: which slice of it reaches the agent this turn,
// and how the party's progress through it moves.
//
// The whole point is that a module NEVER goes to the model whole. `moduleBrief`
// assembles the live slice — the core, where the party is standing, who is
// there, and the scenes that could plausibly fire — and leaves the rest on the
// shelf. See the memory note on why: a 30k-token module sent every turn costs
// roughly three times the turn itself.

import type { World } from '../types';
import {
  blankModuleState,
  moduleById,
  type CampaignModule,
  type ModuleLocation,
  type ModuleNpc,
  type ModuleScene,
  type ModuleState,
  type Ref,
} from '../data/modules';

export const locationIn = (module: CampaignModule, id: Ref): ModuleLocation | null =>
  module.locations.find((l) => l.id === id) ?? null;

export const npcIn = (module: CampaignModule, id: Ref): ModuleNpc | null =>
  module.npcs.find((n) => n.id === id) ?? null;

export const sceneIn = (module: CampaignModule, id: Ref): ModuleScene | null =>
  module.scenes.find((s) => s.id === id) ?? null;

/** Has this secret been earned? Keyed `"<ref>:<index>"`. */
export const isRevealed = (state: ModuleState, ref: Ref, index: number): boolean =>
  state.revealed.includes(`${ref}:${index}`);

/** The scenes still eligible to fire: everything a `once` scene has not used up. */
export function liveScenes(module: CampaignModule, state: ModuleState): ModuleScene[] {
  return module.scenes.filter((s) => !(s.once && state.fired.includes(s.id)));
}

/** Where the party can go from here. */
export function exitsFrom(module: CampaignModule, state: ModuleState): ModuleLocation[] {
  const here = locationIn(module, state.at);
  if (!here) return [];
  return here.exits
    .map((e) => locationIn(module, e.to))
    .filter((l): l is ModuleLocation => Boolean(l));
}

/**
 * The slice of the module the agent gets this turn.
 *
 * Returned as two strings on purpose. `core` never changes for a campaign, so
 * it is the half worth prompt-caching; `here` changes as the party moves and
 * must not be cached with it.
 */
export function moduleBrief(
  module: CampaignModule,
  state: ModuleState,
): { core: string; here: string } {
  const core = [
    `MODULE: ${module.title} (v${module.version}) — ${module.tone}, levels ${module.levels[0]}–${module.levels[1]}.`,
    '',
    'PREMISE:',
    module.core.premise,
    '',
    'CANON — these are true and you may not contradict them:',
    ...module.core.canon.map((c) => `- ${c}`),
    '',
    `ANTAGONIST: ${module.core.antagonist.name}. Goal: ${module.core.antagonist.goal}`,
    `It adapts by: ${module.core.antagonist.adaptation}`,
    '',
    'FACTIONS:',
    ...module.core.factions.map((f) => `- ${f.name} (${f.rep}): ${f.text}`),
    '',
    'THE MAP:',
    ...module.locations.map((l) => `- ${l.id}: ${l.name} — ${l.summary}`),
  ].join('\n');

  const here = locationIn(module, state.at);
  if (!here) return { core, here: 'The party is somewhere not written in this module. Improvise.' };

  const present = here.npcs
    .map((id) => npcIn(module, id))
    .filter((n): n is ModuleNpc => Boolean(n));

  const earnedSecrets = (here.secrets ?? []).filter((_, i) => isRevealed(state, here.id, i));

  const scenes = liveScenes(module, state);

  const lines = [
    `THE PARTY IS AT: ${here.name} (${here.id})`,
    here.text,
    '',
    'WAYS OUT:',
    ...here.exits.map((e) => `- ${e.text} → ${locationIn(module, e.to)?.name ?? e.to}`),
  ];

  if (present.length) {
    lines.push('', 'HERE WITH THEM:');
    for (const npc of present) {
      lines.push(`- ${npc.name} (${npc.role}). ${npc.text} Wants: ${npc.wants}`);
      // A secret is withheld until earned — it must never leak into the prompt.
      if (npc.secret && isRevealed(state, npc.id, 0)) {
        lines.push(`  KNOWN TO THE PARTY: ${npc.secret}`);
      } else if (npc.secret) {
        lines.push('  (This one is holding something back. Do not reveal it unless earned.)');
      }
    }
  }

  if (earnedSecrets.length) {
    lines.push('', 'WHAT THEY HAVE ALREADY WORKED OUT HERE:');
    lines.push(...earnedSecrets.map((s) => `- ${s}`));
  }

  const unearned = (here.secrets ?? []).length - earnedSecrets.length;
  if (unearned > 0) {
    lines.push(
      '',
      `There are ${unearned} more things to find in this place. Give one up for a good idea or a good roll, not for asking.`,
    );
  }

  if (scenes.length) {
    lines.push('', 'SCENES THAT MAY FIRE — judge the trigger yourself:');
    for (const s of scenes) {
      lines.push(`- ${s.id} "${s.title}". Trigger: ${s.trigger}`);
      lines.push(`  ${s.text}`);
      for (const b of s.branches) lines.push(`  · If ${b.choice} → ${b.outcome}`);
    }
  }

  if (here.foes?.length) {
    const names = here.foes
      .map((id) => module.bestiary.find((f) => f.id === id)?.name)
      .filter(Boolean);
    if (names.length) lines.push('', `BELONGS HERE IF A FIGHT STARTS: ${names.join(', ')}`);
  }

  return { core, here: lines.join('\n') };
}

/** The standing instruction that makes a module work rather than box the agent in. */
export const MODULE_RULE = [
  'You are running a written campaign module. Its CANON is true and you may not contradict it.',
  'Where the party does something the module does not cover — and they will — improvise in keeping with its tone, and say what you invented in the journal so it becomes canon too.',
  'Never railroad. If they walk away from a scene, let them; the module is a place, not a script.',
  'Do not reveal a secret because a player asked. Reveal it for a good idea, a good roll, or a real cost.',
].join(' ');

/** Move the party, remembering where they have been. */
export function moveTo(state: ModuleState, to: Ref): ModuleState {
  if (state.at === to) return state;
  return {
    ...state,
    at: to,
    seen: state.seen.includes(to) ? state.seen : [...state.seen, to],
  };
}

/** Mark a scene as having happened, so a `once` scene does not repeat. */
export function fireScene(state: ModuleState, id: Ref): ModuleState {
  if (state.fired.includes(id)) return state;
  return { ...state, fired: [...state.fired, id] };
}

/** The party earned something. */
export function reveal(state: ModuleState, ref: Ref, index: number): ModuleState {
  const key = `${ref}:${index}`;
  if (state.revealed.includes(key)) return state;
  return { ...state, revealed: [...state.revealed, key] };
}

/** Resolve the module a campaign is running, if any. */
export const moduleFor = (state: ModuleState | null | undefined): CampaignModule | null =>
  state ? moduleById(state.id) : null;

/**
 * The world a campaign starts in when it is seeded from a module: the opening
 * scene on the board, the module's factions and antagonist in place, its
 * bestiary ready, and the party standing where the module says they start.
 *
 * The console builds this and hands it to gm-agent's `create`, because the
 * console is what holds the module data.
 */
export function seedWorldFrom(module: CampaignModule, campaign?: string): Partial<World> {
  const state = blankModuleState(module.id, module.opening.location);
  const open = locationIn(module, module.opening.location);

  return {
    campaign: campaign?.trim() || module.title,
    scene: module.opening.scene,
    feed: [{ speaker: 'GM', text: module.opening.text }],
    threat: 0,
    corruption: 0,
    quests: module.quests.map((q) => ({ ...q })),
    factions: module.core.factions.map((f) => ({ name: f.name, rep: f.rep })),
    antagonist: {
      name: module.core.antagonist.name,
      adaptation: module.core.antagonist.adaptation,
    },
    journal: [],
    // The module's foes are available to the GM from the first turn rather
    // than needing to be forged.
    bestiary: module.bestiary.map((f) => ({ ...f })) as World['bestiary'],
    enemies: [],
    order: [],
    round: 1,
    turnIdx: 0,
    chat_cursor: 0,
    module: state,
    ...(open ? {} : {}),
  };
}
