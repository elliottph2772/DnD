// The one store. It mirrors the prototype's state object so the ported logic
// reads the same, and it is the only thing components subscribe to: selecting
// a slice means an HP tick does not re-render the transcript.

import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { create } from 'zustand';
import * as agent from '../lib/agent';
import { clientId as readClientId, readCache, writeCache, writeCfg } from '../lib/cache';
import * as dbx from '../lib/db';
import { configFor } from '../lib/env';
import { currentRoute, type Route } from '../lib/route';
import {
  blankParty,
  blankWorld,
  mergeChatRow,
  pendingChat,
  shouldApplyWorld,
  worldRow,
} from '../lib/world';
import type { CampaignSummary, Character, ChatLine, ConnState, SeatRow, World } from '../types';

const CLIENT_ID = readClientId();

interface Cached {
  world: World;
  party: Character[];
}

export interface WorldState {
  // identity and configuration
  clientId: string;
  route: Route;
  sbUrl: string;
  sbKey: string;
  hostedBase: string;

  // connection
  conn: ConnState;
  status: string;
  code: string;
  channel: RealtimeChannel | null;

  // credentials
  gmToken: string;
  /** Server-confirmed. Nothing GM-ish renders until this is true. */
  isGM: boolean;

  // the table
  world: World;
  party: Character[];
  claims: Record<number, string>;
  /** Which seat this client holds; 0 = none. */
  slot: number;
  claiming: number;
  chat: ChatLine[];
  campaigns: CampaignSummary[];

  // actions
  connect: (code?: string) => Promise<void>;
  disconnect: () => void;
  applyWorld: (world: World, force?: boolean) => void;
  applySeat: (row: SeatRow) => void;
  applyChatRow: (row: ChatLine) => void;
  pending: () => ChatLine[];
  claimSeat: (slot: number) => Promise<void>;
  leaveSeat: () => Promise<void>;
  setMyCharacter: (patch: Partial<Character>) => void;
  declare: (text: string) => Promise<void>;
  writeWorld: (patch: Partial<World>) => Promise<void>;
  unlockGM: (passphrase: string) => Promise<boolean>;
  refreshCampaigns: () => Promise<void>;
}

const route0 = currentRoute();
const cfg0 = configFor(route0);

/** Debounce per key, so a flurry of HP edits becomes one write. */
const timers = new Map<string, ReturnType<typeof setTimeout>>();
function debounce(key: string, fn: () => void, ms: number): void {
  const existing = timers.get(key);
  if (existing) clearTimeout(existing);
  timers.set(key, setTimeout(fn, ms));
}

export const useWorld = create<WorldState>((set, get) => ({
  clientId: CLIENT_ID,
  route: route0,
  sbUrl: cfg0.sbUrl,
  sbKey: cfg0.sbKey,
  hostedBase: cfg0.hostedBase,

  conn: 'idle',
  status: '',
  code: route0.code,
  channel: null,

  gmToken: route0.gmToken,
  isGM: false,

  world: blankWorld(CLIENT_ID),
  party: blankParty(),
  claims: {},
  slot: 0,
  claiming: 0,
  chat: [],
  campaigns: [],

  async connect(code) {
    const s = get();
    const cid = (code ?? s.code).trim().toUpperCase();
    if (!s.sbUrl || !s.sbKey) {
      set({ conn: 'error', status: 'Supabase URL and key are not configured for this build.' });
      return;
    }
    if (!cid) {
      set({ conn: 'error', status: 'No campaign code.' });
      return;
    }

    dbx.unsubscribe(s.channel);
    set({ conn: 'connecting', status: 'Connecting…', code: cid, channel: null });

    // Show the cached table immediately; the pull below replaces it.
    const cached = readCache<Cached>(cid);
    if (cached?.world) set({ world: cached.world, party: cached.party ?? blankParty() });

    let sb: SupabaseClient;
    try {
      sb = dbx.db(s.sbUrl, s.sbKey);
    } catch (e) {
      set({ conn: 'error', status: `Failed: ${(e as Error).message}` });
      return;
    }

    try {
      // Opening a campaign pulls, never pushes.
      const world = await dbx.pullWorld(sb, cid);
      if (world) get().applyWorld(world, true);

      const cursor = Number(world?.chat_cursor ?? 0);
      const seats = await dbx.pullSeats(sb, cid);
      seats.forEach((row) => get().applySeat(row));

      const chat = await dbx.pullChat(sb, cid, cursor).catch(() => [] as ChatLine[]);
      set({ chat });

      const channel = dbx.subscribe(sb, cid, {
        onWorld: (w, force) => get().applyWorld(w, force),
        onSeat: (row) => get().applySeat(row),
        onChat: (row) => get().applyChatRow(row),
      });

      set({ channel, conn: 'live', status: `Live · ${cid}` });
      writeCfg({ code: cid, slot: get().slot });

      // Credentials, then the campaign list — neither blocks the table.
      const token = get().gmToken;
      if (token) {
        void agent.verify(s.sbUrl, cid, { gm_token: token }).then((ok) => set({ isGM: ok }));
      }
      void get().refreshCampaigns();
    } catch (e) {
      const err = e as { message?: string; hint?: string };
      set({ conn: 'error', status: `Error: ${err.message || err.hint || 'unknown'}` });
    }
  },

  disconnect() {
    dbx.unsubscribe(get().channel);
    set({ channel: null, conn: 'idle', status: '' });
  },

  applyWorld(incoming, force) {
    const s = get();
    if (!shouldApplyWorld(incoming, { clientId: s.clientId, isGM: s.isGM, force })) return;
    const cursor = Number(incoming.chat_cursor || 0);
    set({
      world: { ...incoming, chat_cursor: Math.max(s.world.chat_cursor || 0, cursor) },
      // Declarations the agent has now resolved stop being pending.
      chat: s.chat.filter((x) => x.id > cursor),
    });
    writeCache(s.code, { world: get().world, party: get().party });
  },

  applySeat(row) {
    if (!row?.slot) return;
    const s = get();
    const claims = { ...s.claims, [row.slot]: row.claimed_by || '' };
    const data = row.data ?? { by: '', char: null };

    // Your own writes come back on the channel; take the claim, ignore the rest.
    if (data.by === s.clientId) {
      set({ claims });
      return;
    }

    // An empty row means that seat holds nobody — blank it locally, or a
    // character cached from an earlier campaign keeps sitting in it. Never
    // blank your own seat: your build may not have synced yet.
    if (!data.char) {
      if (row.slot === s.slot) {
        set({ claims });
        return;
      }
      set({ claims, party: s.party.map((p, i) => (i === row.slot - 1 ? blankParty()[i] : p)) });
      return;
    }

    set({ claims, party: s.party.map((p, i) => (i === row.slot - 1 ? data.char! : p)) });
    writeCache(s.code, { world: get().world, party: get().party });
  },

  applyChatRow(row) {
    const s = get();
    const chat = mergeChatRow(s.chat, row, s.world.chat_cursor);
    if (chat !== s.chat) set({ chat });
  },

  pending() {
    const s = get();
    return pendingChat(s.chat, s.world.chat_cursor);
  },

  async claimSeat(slot) {
    const s = get();
    if (s.conn !== 'live' || s.claiming) return;
    set({ claiming: slot, status: `Claiming seat ${slot}…` });
    try {
      const sb = dbx.db(s.sbUrl, s.sbKey);
      const result = await dbx.claimSeat(sb, s.code, slot, s.clientId);
      if (result.ok) {
        set({ claiming: 0, slot, status: `Live · ${s.code}` });
        writeCfg({ code: s.code, slot });
      } else {
        set((st) => ({
          claiming: 0,
          status: `Seat ${slot} was just taken — pick another`,
          claims: { ...st.claims, [slot]: result.takenBy },
        }));
      }
    } catch (e) {
      set({ claiming: 0, status: `Write failed: ${(e as Error).message}` });
    }
  },

  async leaveSeat() {
    const s = get();
    if (!s.slot || s.conn !== 'live') return;
    const slot = s.slot;
    set({ party: s.party.map((p, i) => (i === slot - 1 ? blankParty()[i] : p)), slot: 0 });
    writeCfg({ code: s.code, slot: 0 });
    try {
      await dbx.freeSeat(dbx.db(s.sbUrl, s.sbKey), s.code, slot, s.clientId);
    } catch (e) {
      set({ status: `Write failed: ${(e as Error).message}` });
    }
  },

  setMyCharacter(patch) {
    const s = get();
    const i = s.slot - 1;
    if (i < 0) return;
    const party = s.party.map((p, j) => (j === i ? { ...p, ...patch } : p));
    set({ party });
    writeCache(s.code, { world: s.world, party });
    debounce(
      `seat${i}`,
      () => {
        const now = get();
        void dbx
          .pushSeat(dbx.db(now.sbUrl, now.sbKey), now.code, i + 1, now.party[i], now.clientId)
          .catch((e: Error) => set({ status: `Write failed: ${e.message}` }));
      },
      450,
    );
  },

  async declare(text) {
    const s = get();
    if (s.conn !== 'live' || !text.trim()) return;
    const me = s.party[s.slot - 1];
    const who = me?.name || `Slot ${s.slot}`;
    try {
      await dbx.sendChat(dbx.db(s.sbUrl, s.sbKey), s.code, s.slot, who, text);
    } catch (e) {
      set({ status: `Write failed: ${(e as Error).message}` });
    }
  },

  async writeWorld(patch) {
    const s = get();
    if (!s.isGM) return;
    const next = worldRow({ ...s.world, ...patch }, s.clientId);
    set({ world: next });
    writeCache(s.code, { world: next, party: s.party });
    debounce(
      'world',
      () => {
        const now = get();
        void agent
          .pushWorld(now.sbUrl, now.code, now.world, { gm_token: now.gmToken })
          .catch((e: Error) => set({ status: `Write failed: ${e.message}` }));
      },
      500,
    );
  },

  async unlockGM(passphrase) {
    const s = get();
    try {
      const { gm_token } = await agent.unlock(s.sbUrl, s.code, passphrase.trim().toLowerCase());
      set({ gmToken: gm_token, isGM: true, status: 'Game Master' });
      writeCfg({ gmToken: gm_token });
      return true;
    } catch (e) {
      set({ status: (e as Error).message });
      return false;
    }
  },

  async refreshCampaigns() {
    const s = get();
    if (s.conn === 'idle') return;
    try {
      set({ campaigns: await dbx.listCampaigns(dbx.db(s.sbUrl, s.sbKey)) });
    } catch {
      // A failed list is not worth a visible error; the table still works.
    }
  },
}));
