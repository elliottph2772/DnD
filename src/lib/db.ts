// The only file that touches Supabase. Components never call `supabase.from`.
//
// Under the locked-down policies this client can: read `campaigns`, read and
// write `characters` (its own seat), and read and insert `chat`. Every world
// write goes through gm-agent — see lib/agent.ts.

import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js';
import type { CampaignSummary, Character, ChatLine, SeatRow, World } from '../types';
import { blankCharacter } from './world';

let client: SupabaseClient | null = null;
let clientFor = '';

/** One client per URL+key pair, reused across connects. */
export function db(sbUrl: string, sbKey: string): SupabaseClient {
  const fingerprint = `${sbUrl}|${sbKey}`;
  if (!client || clientFor !== fingerprint) {
    client = createClient(sbUrl, sbKey);
    clientFor = fingerprint;
  }
  return client;
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
  const { data, error } = await sb.from('characters').select('*').eq('campaign_id', code);
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
  return sb
    .channel(`nocturne-${code}`)
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
      { event: '*', schema: 'public', table: 'characters', filter: `campaign_id=eq.${code}` },
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

/** Write one seat. A player only ever writes their own. */
export async function pushSeat(
  sb: SupabaseClient,
  code: string,
  slot: number,
  char: Character | null,
  clientId: string,
): Promise<void> {
  const { error } = await sb.from('characters').upsert(
    {
      campaign_id: code,
      slot,
      data: { by: clientId, char },
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'campaign_id,slot' },
  );
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
  clientId: string,
): Promise<ClaimResult> {
  const stamp = new Date().toISOString();

  const current = await sb
    .from('characters')
    .select('claimed_by')
    .eq('campaign_id', code)
    .eq('slot', slot)
    .maybeSingle();
  if (current.error) throw current.error;

  if (!current.data) {
    // No row yet (a campaign made before `create` seeded all four).
    const ins = await sb
      .from('characters')
      .insert({
        campaign_id: code,
        slot,
        claimed_by: clientId,
        data: { by: clientId, char: blankCharacter() },
        updated_at: stamp,
      })
      .select('slot');
    if (!ins.error && ins.data?.length) return { ok: true };
  } else if (current.data.claimed_by === clientId) {
    return { ok: true };
  }

  const claim = await sb
    .from('characters')
    .update({ claimed_by: clientId, updated_at: stamp })
    .eq('campaign_id', code)
    .eq('slot', slot)
    .is('claimed_by', null)
    .select('slot');
  if (claim.error) throw claim.error;
  if (claim.data?.length) return { ok: true };

  const who = await sb
    .from('characters')
    .select('claimed_by')
    .eq('campaign_id', code)
    .eq('slot', slot)
    .maybeSingle();
  if (who.data?.claimed_by === clientId) return { ok: true };
  return { ok: false, takenBy: who.data?.claimed_by ?? 'taken' };
}

/** Leave a seat: release the claim and blank the sheet. */
export async function freeSeat(
  sb: SupabaseClient,
  code: string,
  slot: number,
  clientId: string,
): Promise<void> {
  const { error } = await sb.from('characters').upsert(
    {
      campaign_id: code,
      slot,
      claimed_by: null,
      data: { by: clientId, char: blankCharacter() },
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'campaign_id,slot' },
  );
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
