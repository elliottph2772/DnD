// The only file that talks to the gm-agent Edge Function.
//
// Every model call and every world mutation goes through here. `campaigns` is
// readable by the publishable key and writable by nothing else, so this is the
// sole write path for the world — the console included. The Anthropic key
// lives in Supabase secrets and never reaches the browser.

import type { Character, World } from '../types';

export type ModelChoice = 'opus' | 'sonnet' | 'haiku';

export type AgentAction =
  // credentials and lifecycle
  | 'create'
  | 'provision'
  | 'unlock'
  | 'verify'
  | 'delete'
  // model calls
  | 'advance'
  | 'biome'
  | 'foe'
  // non-AI writes
  | 'patch'
  | 'world';

export interface AgentCreds {
  gm_token?: string;
  gm_pass?: string;
}

export interface AgentRequest extends AgentCreds {
  action: AgentAction;
  code?: string;
  tone?: string;
  difficulty?: string;
  model?: ModelChoice;
  /** `advance`: the GM's own line, folded in with the pending declarations. */
  declare?: string;
  /** `biome`: an optional steer for the region. */
  brief?: string;
  /**
   * `advance`: the campaign module's slice for this turn. Split in two because
   * `module_core` never changes for a campaign and is prompt-cached server
   * side, while `module_here` moves with the party and must not be.
   */
  module_core?: string;
  module_here?: string;
  module_rule?: string;
  /** `patch`: whitelisted world keys and per-slot party fields. */
  world?: Partial<World>;
  party?: { slot: number; hp?: number; temp?: number; conditions?: string[]; cond?: Character['cond'] }[];
}

export interface AgentError {
  error: string;
}

export class AgentCallError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'AgentCallError';
    this.status = status;
  }
}

const endpoint = (sbUrl: string): string => `${sbUrl.replace(/\/+$/, '')}/functions/v1/gm-agent`;

/**
 * POST one action. The function authorises every action but `create`, `unlock`
 * and a first `provision` itself, so a token forged into a URL buys nothing.
 */
export async function callAgent<T>(sbUrl: string, body: AgentRequest): Promise<T> {
  const res = await fetch(endpoint(sbUrl), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

  let payload: unknown = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }

  if (!res.ok) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload
        ? String((payload as AgentError).error)
        : `gm-agent returned ${res.status}`;
    throw new AgentCallError(message, res.status);
  }
  return payload as T;
}

export interface Credentials {
  gm_token: string;
  gm_pass: string;
  /** True when the campaign already had credentials and these were re-read. */
  existing?: boolean;
}

/**
 * Mint a campaign: code, credentials, the world row and its four seats.
 * `world` is the seed — for a module campaign that is `seedWorldFrom`, which
 * the console builds because it is what holds the module data.
 */
export const createCampaign = (sbUrl: string, world: Partial<World>) =>
  callAgent<Credentials & { code: string }>(sbUrl, { action: 'create', world });

/** Re-read the credentials of a campaign you already own. */
export const provision = (sbUrl: string, code: string, creds: AgentCreds = {}) =>
  callAgent<Credentials>(sbUrl, { action: 'provision', code, ...creds });

/** Trade the three-word passphrase for the token. */
export const unlock = (sbUrl: string, code: string, gm_pass: string) =>
  callAgent<{ gm_token: string }>(sbUrl, { action: 'unlock', code, gm_pass });

/** Asked on every load before a single GM control is shown. */
export async function verify(sbUrl: string, code: string, creds: AgentCreds): Promise<boolean> {
  if (!code || (!creds.gm_token && !creds.gm_pass)) return false;
  try {
    await callAgent<{ ok: true }>(sbUrl, { action: 'verify', code, ...creds });
    return true;
  } catch {
    return false;
  }
}

/** Remove the campaign and its four character sheets. No undo. */
export const deleteCampaign = (sbUrl: string, code: string, creds: AgentCreds) =>
  callAgent<{ ok: true }>(sbUrl, { action: 'delete', code, ...creds });

/** Write the full world row. The console's replacement for its direct upsert. */
export const pushWorld = (sbUrl: string, code: string, world: World, creds: AgentCreds) =>
  callAgent<{ ok: true }>(sbUrl, { action: 'world', code, world, ...creds });

/** Non-AI edits: whitelisted world keys and per-slot party fields. */
export const patch = (
  sbUrl: string,
  code: string,
  body: Pick<AgentRequest, 'world' | 'party'>,
  creds: AgentCreds,
) => callAgent<{ ok: true }>(sbUrl, { action: 'patch', code, ...body, ...creds });

export interface AgentLine {
  speaker: string;
  text: string;
}

/** Advance the scene: the agent resolves pending declarations and narrates. */
export const advance = (
  sbUrl: string,
  code: string,
  body: Pick<
    AgentRequest,
    'declare' | 'tone' | 'difficulty' | 'model' | 'module_core' | 'module_here' | 'module_rule'
  >,
  creds: AgentCreds,
) =>
  callAgent<{ ok: true; kind: 'advance'; lines: AgentLine[]; consumed: number }>(sbUrl, {
    action: 'advance',
    code,
    ...body,
    ...creds,
  });

/** Generate a region and store it on the world. */
export const biome = (
  sbUrl: string,
  code: string,
  body: Pick<AgentRequest, 'brief' | 'tone' | 'model'>,
  creds: AgentCreds,
) =>
  callAgent<{ ok: true; kind: 'biome'; biome: Record<string, unknown> }>(sbUrl, {
    action: 'biome',
    code,
    ...body,
    ...creds,
  });

/** Forge a statblock and push it onto the bestiary. */
export const foe = (
  sbUrl: string,
  code: string,
  body: Pick<AgentRequest, 'brief' | 'tone' | 'difficulty' | 'model'>,
  creds: AgentCreds,
) =>
  callAgent<{ ok: true; kind: 'foe'; foe: Record<string, unknown> }>(sbUrl, {
    action: 'foe',
    code,
    ...body,
    ...creds,
  });
