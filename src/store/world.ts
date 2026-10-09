// The one store. It mirrors the prototype's state object so the ported logic
// reads the same, and it is the only thing components subscribe to: selecting
// a slice means an HP tick does not re-render the transcript.

import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { create } from 'zustand';
import * as agent from '../lib/agent';
import { MODULE_RULE, moduleBrief, moduleFor, moveTo } from '../lib/module';
import { instanceFor, ordered, type RosterEntry } from '../lib/roster';
import { clientId as readClientId, readCache, writeCache, writeCfg } from '../lib/cache';
import * as dbx from '../lib/db';
import { configFor } from '../lib/env';
import { currentRoute, type Route } from '../lib/route';
import {
  applyCondition,
  blankParty,
  blankWorld,
  conditionExpires,
  mergeChatRow,
  pendingChat,
  releaseCondition,
  shouldApplyWorld,
  tickRound,
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
  /** This browser, for ignoring the echo of its own writes. */
  clientId: string;
  /** Who this is, from anonymous auth. Owns the roster; holds seats. */
  userId: string;
  /** The characters this user owns, newest played first. */
  roster: RosterEntry[];
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
  /** Sit a roster character down in a seat. */
  claimSeat: (slot: number, characterId: string) => Promise<void>;
  refreshRoster: () => Promise<void>;
  /** Put a finished character on the roster; returns its new id. */
  addToRoster: (char: Character) => Promise<string | null>;
  updateRoster: (id: string, char: Character) => Promise<void>;
  removeFromRoster: (id: string) => Promise<void>;
  leaveSeat: () => Promise<void>;
  setMyCharacter: (patch: Partial<Character>) => void;
  declare: (text: string) => Promise<void>;
  writeWorld: (patch: Partial<World>) => Promise<void>;
  unlockGM: (passphrase: string) => Promise<boolean>;
  /** Drop the GM credential from this device. */
  lockGM: () => void;
  refreshCampaigns: () => Promise<void>;

  // ---- GM-only. Each goes through gm-agent; none writes `campaigns` directly.
  /** Which agent call is in flight, '' when idle. One at a time. */
  busy: string;
  /** The last thing the agent said back, success or failure. */
  note: string;
  /** Which model the agent turns use. */
  model: agent.ModelChoice;
  setModel: (model: agent.ModelChoice) => void;
  /** Runs one agent call, holding the busy label and surfacing any error. */
  runAgent: (
    label: string,
    call: (creds: agent.AgentCreds) => Promise<unknown>,
  ) => Promise<void>;
  advance: (declare?: string) => Promise<void>;
  /** Walk the party to another location in the campaign module. */
  moveParty: (to: string) => Promise<void>;
  generateBiome: (brief: string) => Promise<void>;
  forgeFoe: (brief: string) => Promise<void>;
  patchWorld: (patch: Partial<World>) => Promise<void>;
  patchSeat: (slot: number, patch: Partial<Character>) => Promise<void>;
  nudgeHp: (slot: number, by: number) => Promise<void>;
  applyConditionTo: (slot: number, name: string, label: string, rounds: number) => Promise<void>;
  releaseConditionOn: (slot: number, name: string) => Promise<void>;
  nextRound: () => Promise<void>;
  dropCampaign: (code: string) => Promise<void>;
}

const route0 = currentRoute();
const cfg0 = configFor(route0);

/**
 * Connect generation. `connect` awaits three pulls before it subscribes, so two
 * overlapping calls — a reconnect, or StrictMode's double-invoked effect — can
 * both be in flight. Only the newest may write state; an older one that lands
 * late must not clobber a live connection or report its own failure.
 */
let connectGen = 0;

/** Debounce per key, so a flurry of HP edits becomes one write. */
const timers = new Map<string, ReturnType<typeof setTimeout>>();
function debounce(key: string, fn: () => void, ms: number): void {
  const existing = timers.get(key);
  if (existing) clearTimeout(existing);
  timers.set(key, setTimeout(fn, ms));
}

export const useWorld = create<WorldState>((set, get) => ({
  clientId: CLIENT_ID,
  userId: '',
  roster: [],
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
  busy: '',
  note: '',
  model: 'opus',

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

    const gen = ++connectGen;
    const stale = () => gen !== connectGen;

    dbx.unsubscribe(s.channel);
    set({ conn: 'connecting', status: 'Connecting…', code: cid, channel: null });

    // Show the cached table immediately; the pull below replaces it.
    const cached = readCache<Cached>(cid);
    if (cached?.world) set({ world: cached.world, party: cached.party ?? blankParty() });

    let sb: SupabaseClient;
    try {
      sb = dbx.db(s.sbUrl, s.sbKey);
      // Identity first: every seat write is now checked against auth.uid(),
      // so without this the table is readable but nothing can be claimed.
      const userId = await dbx.signIn(sb);
      if (stale()) return;
      set({ userId });
    } catch (e) {
      set({ conn: 'error', status: `Failed: ${(e as Error).message}` });
      return;
    }

    try {
      // Opening a campaign pulls, never pushes.
      const world = await dbx.pullWorld(sb, cid);
      if (stale()) return;
      if (world) get().applyWorld(world, true);

      const cursor = Number(world?.chat_cursor ?? 0);
      const seats = await dbx.pullSeats(sb, cid);
      if (stale()) return;
      seats.forEach((row) => get().applySeat(row));

      // A reload arrives with no slot, and the writeCfg below would then store
      // 0 over the seat this client had. The claim itself is in the database,
      // and clientId survives a reload, so take the seat back from the rows we
      // just pulled rather than dropping the player into the lobby.
      const me = get().userId;
      const mine = seats.find((row) => row.claimed_by && row.claimed_by === me);
      if (mine) set({ slot: mine.slot });

      const chat = await dbx.pullChat(sb, cid, cursor).catch(() => [] as ChatLine[]);
      if (stale()) return;
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
      void get().refreshRoster();
    } catch (e) {
      if (stale()) return;
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

    // Your own writes come back on the channel. Ignoring them stops a slow
    // echo clobbering an edit made since — but only when there is something
    // to clobber. With the slot still empty the echo is the only copy there
    // is, which is the case after a reload: clientId survives in
    // localStorage, so a seat claimed earlier would otherwise stay blank.
    const localChar = s.party[row.slot - 1];
    if (data.by === s.clientId && localChar?.built) {
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

  async claimSeat(slot, characterId) {
    const s = get();
    if (s.conn !== 'live' || s.claiming) return;
    const entry = s.roster.find((r) => r.id === characterId);
    if (!entry) {
      set({ status: 'Pick a character first.' });
      return;
    }
    set({ claiming: slot, status: `Claiming seat ${slot}…` });
    try {
      const sb = dbx.db(s.sbUrl, s.sbKey);
      // The copy that sits down — full health, nothing spent. See lib/roster.ts
      // for why a seat holds a copy rather than the roster row itself.
      const result = await dbx.claimSeat(
        sb,
        s.code,
        slot,
        s.userId,
        characterId,
        instanceFor(entry),
        s.clientId,
      );
      if (result.ok) {
        // Seat the character locally too. The write echoes back over realtime
        // tagged with this clientId, and applySeat ignores its own echo on
        // purpose — so without this the seat would be held but empty until
        // some unrelated write happened to refresh it.
        const sat = instanceFor(entry);
        set((st) => ({
          claiming: 0,
          slot,
          status: `Live · ${s.code}`,
          party: st.party.map((p, i) => (i === slot - 1 ? sat : p)),
        }));
        writeCfg({ code: s.code, slot });
        writeCache(s.code, { world: get().world, party: get().party });
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

  /**
   * Forget the credential on this device — for handing the phone across the
   * table. The token is cleared from state, from the stored config and from
   * the URL, so a reload does not quietly restore it.
   */
  lockGM() {
    set({ gmToken: '', isGM: false, status: `Live · ${get().code}` });
    writeCfg({ gmToken: '' });
    if (typeof window !== 'undefined') {
      const clean = window.location.hash.replace(/[&?](t|gm)=[^&]*/gi, '');
      window.history.replaceState(null, '', clean || '#play');
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

  setModel(model) {
    set({ model });
    writeCfg({ model });
  },

  // Every agent call funnels through here: one at a time, with the busy label
  // and the note the console shows. The world comes back over realtime, so
  // nothing here writes `world` itself.
  async runAgent(label, call) {
    const s = get();
    if (!s.isGM || s.busy) return;
    set({ busy: label, note: '' });
    try {
      await call({ gm_token: s.gmToken });
      set({ busy: '', note: '' });
    } catch (e) {
      set({ busy: '', note: (e as Error).message });
    }
  },

  async advance(declare = '') {
    const s = get();
    // When the campaign is running a module, send its live slice — never the
    // whole module. lib/module.ts decides what that slice is.
    const module = moduleFor(s.world.module);
    const brief = module && s.world.module ? moduleBrief(module, s.world.module) : null;
    await get().runAgent('Advancing…', (creds) =>
      agent.advance(
        s.sbUrl,
        s.code,
        {
          declare,
          model: s.model,
          tone: module?.tone,
          difficulty: module?.difficulty,
          ...(brief ? { module_core: brief.core, module_here: brief.here, module_rule: MODULE_RULE } : {}),
        },
        creds,
      ),
    );
  },

  async moveParty(to) {
    const s = get();
    if (!s.isGM || !s.world.module) return;
    const next = moveTo(s.world.module, to);
    if (next === s.world.module) return;
    const module = moduleFor(next);
    const place = module?.locations.find((l) => l.id === to);
    await get().patchWorld({
      module: next,
      ...(place ? { scene: place.name } : {}),
    });
  },

  async generateBiome(brief) {
    const s = get();
    await get().runAgent('Surveying…', (creds) =>
      agent.biome(s.sbUrl, s.code, { brief, model: s.model }, creds),
    );
  },

  async forgeFoe(brief) {
    const s = get();
    await get().runAgent('Forging…', (creds) =>
      agent.foe(s.sbUrl, s.code, { brief, model: s.model }, creds),
    );
  },

  /**
   * A non-AI world edit. Optimistic locally so the console feels immediate;
   * gm-agent is still the only thing that writes the row.
   */
  async patchWorld(patch) {
    const s = get();
    if (!s.isGM) return;
    set({ world: { ...s.world, ...patch, by: 'gm-agent' } });
    try {
      await agent.patch(s.sbUrl, s.code, { world: patch }, { gm_token: s.gmToken });
    } catch (e) {
      set({ note: (e as Error).message });
    }
  },

  /** A non-AI edit to one seat's character. */
  async patchSeat(slot, patch) {
    const s = get();
    if (!s.isGM || slot < 1 || slot > 4) return;
    const current = s.party[slot - 1];
    if (!current) return;
    const next = { ...current, ...patch };
    set({ party: s.party.map((p, i) => (i === slot - 1 ? next : p)) });
    writeCache(s.code, { world: s.world, party: get().party });
    try {
      await agent.patch(
        s.sbUrl,
        s.code,
        { party: [{ slot, hp: next.hp, temp: next.temp, conditions: next.conditions, cond: next.cond }] },
        { gm_token: s.gmToken },
      );
    } catch (e) {
      set({ note: (e as Error).message });
    }
  },

  async nudgeHp(slot, by) {
    const s = get();
    const current = s.party[slot - 1];
    if (!current) return;
    const hp = Math.max(0, Math.min(current.maxHp || 0, current.hp + by));
    await get().patchSeat(slot, { hp });
  },

  async applyConditionTo(slot, name, label, rounds) {
    const s = get();
    const current = s.party[slot - 1];
    if (!current) return;
    const next = applyCondition(current, {
      name,
      label,
      rounds,
      expires: conditionExpires(s.world.round, rounds),
    });
    await get().patchSeat(slot, { cond: next.cond, conditions: next.conditions });
  },

  async releaseConditionOn(slot, name) {
    const s = get();
    const current = s.party[slot - 1];
    if (!current) return;
    const next = releaseCondition(current, name);
    await get().patchSeat(slot, { cond: next.cond, conditions: next.conditions });
  },

  /** +1 round, and every condition whose clock has run out drops off. */
  async nextRound() {
    const s = get();
    if (!s.isGM) return;
    const { party, round } = tickRound(s.party, s.world.round);
    set({ party, world: { ...s.world, round, by: 'gm-agent' } });
    try {
      await agent.patch(
        s.sbUrl,
        s.code,
        {
          world: { round },
          party: party.map((c, i) => ({ slot: i + 1, cond: c.cond, conditions: c.conditions })),
        },
        { gm_token: s.gmToken },
      );
    } catch (e) {
      set({ note: (e as Error).message });
    }
  },

  async dropCampaign(code) {
    const s = get();
    if (!s.isGM || !code) return;
    set({ busy: `Deleting ${code}…` });
    try {
      await agent.deleteCampaign(s.sbUrl, code, { gm_token: s.gmToken });
      set({ busy: '', note: `${code} is gone.` });
      await get().refreshCampaigns();
      // Deleting the campaign you are sitting in leaves nothing to show.
      if (code === s.code) get().disconnect();
    } catch (e) {
      set({ busy: '', note: (e as Error).message });
    }
  },

  async refreshRoster() {
    const s = get();
    if (!s.userId) return;
    try {
      set({ roster: ordered(await dbx.pullRoster(dbx.db(s.sbUrl, s.sbKey))) });
    } catch {
      // A roster that fails to load is not worth an error banner; the table
      // still works and the next connect tries again.
    }
  },

  async addToRoster(char) {
    const s = get();
    if (!s.userId) return null;
    try {
      const made = await dbx.createCharacter(dbx.db(s.sbUrl, s.sbKey), s.userId, char);
      set({ roster: ordered([made, ...s.roster]) });
      return made.id;
    } catch (e) {
      set({ status: `Could not save: ${(e as Error).message}` });
      return null;
    }
  },

  async updateRoster(id, char) {
    const s = get();
    set({
      roster: ordered(s.roster.map((r) => (r.id === id ? { ...r, data: char } : r))),
    });
    try {
      await dbx.saveCharacter(dbx.db(s.sbUrl, s.sbKey), id, char);
    } catch (e) {
      set({ status: `Could not save: ${(e as Error).message}` });
    }
  },

  async removeFromRoster(id) {
    const s = get();
    set({ roster: s.roster.filter((r) => r.id !== id) });
    try {
      await dbx.deleteCharacter(dbx.db(s.sbUrl, s.sbKey), id);
    } catch (e) {
      set({ status: `Could not delete: ${(e as Error).message}` });
    }
  },
}));
