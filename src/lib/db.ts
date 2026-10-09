// The only file that touches Supabase. Components never call `supabase.from`.
//
// Under the locked-down policies this client can: read `campaigns`, read all
// `seats` and write its own, read and write its own `characters` (the roster),
// and read and insert `chat`. Every world write goes through gm-agent — see
// lib/agent.ts.
//
// Since migration 0004 the client signs in anonymously, so `auth.uid()` is a
// real identity the database checks rather than a string the client asserts.
// A seat claim is now enforced by RLS, not by trust.

import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js';
import type { CampaignSummary, Character, ChatLine, SeatRow, World } from '../types';
import type { RosterEntry } from './roster';
import { blankCharacter } from './world';

let client: SupabaseClient | null = null;
let clientFor = '';

/** One client per URL+key pair, reused across connects. */
export function db(sbUrl: string, sbKey: string): SupabaseClient {
  const fingerprint = `${sbUrl}|${sbKey}`;
  if (!client || clientFor !== fingerprint) {
    // persistSession is the default and is wanted: the anonymous user must
    // survive a reload, or every refresh would strand the roster behind a new
    // identity that owns nothing.
    client = createClient(sbUrl, sbKey);
    clientFor = fingerprint;
  }
  return client;
}

/**
 * The user id this browser acts as, signing in anonymously the first time.
 *
 * Anonymous is deliberate: a character has to belong to someone before it can
 * follow them between campaigns, but asking for an email before anyone has
 * rolled a character is the wrong trade. `linkIdentity` later upgrades this
 * same user to a real account keeping everything it owns.
 */
export async function signIn(sb: SupabaseClient): Promise<string> {
  const existing = await sb.auth.getSession();
  const have = existing.data.session?.user?.id;
  if (have) return have;

  const { data, error } = await sb.auth.signInAnonymously();
  if (error) throw error;
  const id = data.user?.id;
  if (!id) throw new Error('Signed in but got no user back.');
  return id;
}

export interface SyncHandlers {
  onWorld: (world: World, force?: boolean) => void;
  onSeat: (row: SeatRow) => void;
  onChat: (row: ChatLine) => void;
}

// ------------------------------------------------------------------- reads

export async function pullWorld(sb: SupabaseClient, code: string): Promise<World | null> {
  const { data, error } = await sb.from('campaigns').select('world').eq('id', code).maybeSingle();
  if (error) throw error;
  return (data?.world as World) ?? null;
}

export async function pullSeats(sb: SupabaseClient, code: string): Promise<SeatRow[]> {
  const { data, error } = await sb.from('seats').select('*').eq('campaign_id', code);
  if (error) throw error;
  return (data ?? []) as SeatRow[];
}

/**
 * The newest 30 declarations past the cursor. The cursor is passed in from the
 * freshly-read world row rather than read back out of state: reading state
 * here would race the update the world pull just queued, and already-resolved
 * declarations would reappear as pending.
 */
export async function pullChat(sb: SupabaseClient, code: string, cursor: number): Promise<ChatLine[]> {
  const { data, error } = await sb
    .from('chat')
    .select('id, speaker, text, kind')
    .eq('campaign_id', code)
    .eq('kind', 'player')
    .order('id', { ascending: false })
    .limit(30);
  if (error) throw error;
  const cur = Number(cursor || 0);
  return (data ?? [])
    .slice()
    .reverse()
    .filter((x) => x.id > cur)
    .map((x) => ({ id: x.id as number, speaker: x.speaker as string, text: x.text as string }));
}

export async function listCampaigns(sb: SupabaseClient): Promise<CampaignSummary[]> {
  const { data, error } = await sb
    .from('campaigns')
    .select('id, updated_at')
    .order('updated_at', { ascending: false })
    .limit(60);
  if (error) throw error;
  return (data ?? []).map((x) => ({ id: x.id as string, when: x.updated_at as string }));
}

// -------------------------------------------------------------- realtime

/** One channel per campaign: the world row, its four seats, and new chat. */
export function subscribe(sb: SupabaseClient, code: string, handlers: SyncHandlers): RealtimeChannel {
  const topic = `nocturne-${code}`;
  // supabase-js caches channels by topic. Reconnecting to the same campaign
  // would hand back the instance that is already subscribed, and attaching
  // handlers to a subscribed channel throws. unsubscribe() alone does not
  // evict it from that cache — only removeChannel does.
  for (const existing of sb.getChannels()) {
    if (existing.topic === topic || existing.topic === `realtime:${topic}`) {
      void sb.removeChannel(existing);
    }
  }

  return sb
    .channel(topic)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'campaigns', filter: `id=eq.${code}` },
      (p) => {
        const world = (p.new as { world?: World } | null)?.world;
        if (world) handlers.onWorld(world);
      },
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'seats', filter: `campaign_id=eq.${code}` },
      (p) => handlers.onSeat(p.new as SeatRow),
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat', filter: `campaign_id=eq.${code}` },
      (p) => {
        const row = p.new as { id: number; speaker: string; text: string };
        handlers.onChat({ id: row.id, speaker: row.speaker, text: row.text });
      },
    )
    .subscribe();
}

export function unsubscribe(channel: RealtimeChannel | null): void {
  if (!channel) return;
  try {
    void channel.unsubscribe();
  } catch {
    /* already gone */
  }
}

// --------------------------------------------------------------- writes

/** Write one seat. RLS allows only the holder's own. */
export async function pushSeat(
  sb: SupabaseClient,
  code: string,
  slot: number,
  char: Character | null,
  clientId: string,
): Promise<void> {
  // An update, not an upsert: gm-agent creates the four seats at campaign
  // creation and 0004 revoked insert from clients, so an upsert's insert arm
  // would be refused rather than silently doing nothing.
  const { error } = await sb
    .from('seats')
    .update({ data: { by: clientId, char }, updated_at: new Date().toISOString() })
    .eq('campaign_id', code)
    .eq('slot', slot);
  if (error) throw error;
}

export type ClaimResult =
  | { ok: true }
  | { ok: false; takenBy: string };

/**
 * Claim a seat with a conditional write: the update only matches while
 * `claimed_by` is null, so two players pressing the same seat at the same
 * moment cannot both succeed. Re-reading afterwards distinguishes "someone
 * beat me to it" from "it was already mine".
 */
export async function claimSeat(
  sb: SupabaseClient,
  code: string,
  slot: number,
  userId: string,
  characterId: string,
  character: Character,
  clientId: string,
): Promise<ClaimResult> {
  const stamp = new Date().toISOString();

  // The claim and the character land in one write. The `is('claimed_by', null)`
  // filter is still here, but it is no longer the only thing stopping a race:
  // the "claim a free seat" policy carries the same condition, so the database
  // refuses a second claimer even if a client skipped this filter entirely.
  const claim = await sb
    .from('seats')
    .update({
      claimed_by: userId,
      character_id: characterId,
      data: { by: clientId, char: character },
      updated_at: stamp,
    })
    .eq('campaign_id', code)
    .eq('slot', slot)
    .is('claimed_by', null)
    .select('slot');
  if (claim.error) throw claim.error;
  if (claim.data?.length) return { ok: true };

  // Nothing matched: either somebody else holds it, or this user already does.
  const who = await sb
    .from('seats')
    .select('claimed_by')
    .eq('campaign_id', code)
    .eq('slot', slot)
    .maybeSingle();
  if (who.data?.claimed_by === userId) return { ok: true };
  return { ok: false, takenBy: who.data?.claimed_by ?? 'taken' };
}

/** Leave a seat: release the claim, unlink the character and blank the sheet. */
export async function freeSeat(
  sb: SupabaseClient,
  code: string,
  slot: number,
  clientId: string,
): Promise<void> {
  // An update, not an upsert: seats are created by gm-agent and clients have
  // had insert revoked since 0004.
  const { error } = await sb
    .from('seats')
    .update({
      claimed_by: null,
      character_id: null,
      data: { by: clientId, char: blankCharacter() },
      updated_at: new Date().toISOString(),
    })
    .eq('campaign_id', code)
    .eq('slot', slot);
  if (error) throw error;
}

// ---------------------------------------------------------------- roster

/** Every character this user owns. Private to them — RLS sees to that. */
export async function pullRoster(sb: SupabaseClient): Promise<RosterEntry[]> {
  const { data, error } = await sb
    .from('characters')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as RosterEntry[];
}

/** Put a new character on the roster and hand back the row. */
export async function createCharacter(
  sb: SupabaseClient,
  owner: string,
  char: Character,
): Promise<RosterEntry> {
  const { data, error } = await sb
    .from('characters')
    .insert({ owner, data: char })
    .select('*')
    .single();
  if (error) throw error;
  return data as RosterEntry;
}

/** Save a roster character. Only its owner can, and only their own. */
export async function saveCharacter(
  sb: SupabaseClient,
  id: string,
  char: Character,
): Promise<void> {
  const { error } = await sb
    .from('characters')
    .update({ data: char, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

/** Remove a character from the roster. Seats keep their copy. */
export async function deleteCharacter(sb: SupabaseClient, id: string): Promise<void> {
  const { error } = await sb.from('characters').delete().eq('id', id);
  if (error) throw error;
}

/** A player's declaration. Visible to everyone; nothing has happened yet. */
export async function sendChat(
  sb: SupabaseClient,
  code: string,
  slot: number,
  speaker: string,
  text: string,
): Promise<void> {
  const body = text.trim();
  if (!body) return;
  const { error } = await sb.from('chat').insert({
    campaign_id: code,
    slot: slot || null,
    speaker,
    text: body,
    kind: 'player',
  });
  if (error) throw error;
}
