// Nocturne GM Agent — server-side agent turn.
// Deploy:  supabase functions deploy gm-agent --no-verify-jwt
// Secrets: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//
// Every action that changes the world requires proof of GM identity: either the
// campaign's gm_token or its passphrase. Players hold neither, so the players'
// build can read the world and write chat, but cannot make the agent move.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

// ------------------------------------------------------------------- secrets
const WORDS = "amber ashen barrow bell cairn cinder dusk ember fen frost glass hollow iron kiln lantern marrow moth nettle pitch quarry rime salt shroud sleet slate thorn tide vellum wane widow".split(" ");
const token = () => Array.from(crypto.getRandomValues(new Uint8Array(24)), b => b.toString(16).padStart(2, "0")).join("");
const passphrase = () => {
  const n = crypto.getRandomValues(new Uint32Array(3));
  return Array.from(n, x => WORDS[x % WORDS.length]).join("-");
};

async function authorize(code: string, gmToken: string, gmPass: string) {
  const { data } = await sb.from("campaign_secrets").select("gm_token, gm_pass").eq("campaign_id", code).maybeSingle();
  if (!data) return { ok: false, reason: "This campaign has no GM credentials yet — provision it from the console." };
  const t = (gmToken || "").trim(), p = (gmPass || "").trim().toLowerCase();
  if (t && t === data.gm_token) return { ok: true };
  if (p && p === data.gm_pass) return { ok: true, gm_token: data.gm_token };
  return { ok: false, reason: "Not the Game Master." };
}

// --------------------------------------------------------------------- agent
async function claude(system: string, user: string, maxTokens: number, model: string) {
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set on this function.");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: model === "sonnet" ? "claude-sonnet-4-5" : "claude-haiku-4-5",
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) throw new Error("Anthropic " + res.status + ": " + (await res.text()).slice(0, 400));
  const body = await res.json();
  return (body.content || []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("");
}

function parseJson(txt: string) {
  if (!txt) return null;
  let t = String(txt).trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) t = fence[1].trim();
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  if (a === -1 || b === -1) return null;
  try { return JSON.parse(t.slice(a, b + 1)); } catch { return null; }
}

// ------------------------------------------------------------------- prompts
const partyLevel = (party: any[]) =>
  Math.max(1, Math.round(party.reduce((a, c) => a + (Number(c?.level) || 1), 0) / Math.max(1, party.length)));

function gmSystem(tone: string, difficulty: string, lvl: number) {
  return [
    "You are the Game Master agent for a " + tone.toLowerCase() + " Dungeons & Dragons 5th-edition campaign.",
    "RULES: 5e-accurate. Real ability checks, saving throws, DCs, AC, attack rolls, damage dice, spell slots, conditions. State DCs and roll results explicitly. Never invent non-5e mechanics.",
    "PROSE: " + tone + ". Concrete, sensory, unsentimental. No purple filler, no rhetorical questions except a closing prompt to the players. Never break character. 120-220 words of narration per turn.",
    "EVOLUTION: enemies scale to party level " + lvl + " at " + difficulty + " difficulty; past choices in world memory must resurface; faction reputation shifts with actions; threat and corruption escalate; the recurring antagonist adapts to tactics the party has already used.",
    "MULTIPLE PLAYERS: the declaration block may contain several players speaking at once, each tagged with their character name. Resolve every declaration in the same turn, in a sensible order, and address each character by name.",
    "OUTPUT: reply with ONE JSON object and nothing else. Schema:",
    '{"scene":"short scene title","lines":[{"speaker":"GM|<ENEMY NAME>|<PLAYER NAME>","text":"one utterance, plain prose, no markdown, no stage directions in brackets"}],',
    '"party_updates":[{"name":"exact party member name","hp":int,"temp":int,"conditions":["..."],"xp":int,"level":int,"slots":["1st 3/4"],"notes":"what the GM now remembers about them"}],',
    "LEVELLING: award a level by sending that member's new level in party_updates when the fiction earns it — after a hard-won victory or a milestone, not every turn. Say so in the narration.",
    '"enemies":[{"name":"","hp":int,"maxHp":int,"ac":int,"initMod":int,"notes":""}],',
    '"journal":[{"title":"","text":""}],"quests":[{"title":"","status":"active|done|failed"}],',
    '"factions":[{"name":"","rep":-100..100}],"threat":0..100,"corruption":0..100,',
    '"antagonist":{"name":"","adaptation":"what it learned from the party this turn"}}',
    "Every field except lines is optional — send only what changed. The enemies array REPLACES the current field when present.",
    "Speaker tags must be UPPERCASE-safe plain names with no colons inside them.",
  ].join("\n");
}

const biomeSystem = (tone: string, lvl: number) =>
  "You generate " + tone.toLowerCase() + " D&D 5e regions of extreme specificity — named, weathered, inhabited, dangerous. No generic fantasy. Traversal hazards use real 5e skills and DCs tuned to party level " + lvl + ".\nReturn ONE JSON object, nothing else:\n" +
  '{"name":"","terrain":"2-3 sentences","weather":"short phrase","sensory":"2-3 sentences of sound and smell","flora_fauna":"2-3 sentences","inhabitants":"2-3 sentences on factions and residents","hazards":[{"name":"","dc":"DC 15 Survival","text":""}],"points_of_interest":[{"name":"","text":""}],"loot":["",""],"map":{"grid":["12 rows of exactly 20 monospace characters each"],"legend":[{"sym":"^","meaning":"crag"}]}}' +
  "\nThe map grid must be exactly 12 strings of exactly 20 characters, drawn from a small symbol set that the legend explains.";

const foeSystem = (tone: string, lvl: number, diff: string) =>
  "You write " + tone.toLowerCase() + " D&D 5e statblocks, balanced for a party of level " + lvl + " at " + diff + " difficulty. Legendary actions only for genuine bosses.\nReturn ONE JSON object, nothing else:\n" +
  '{"name":"","kind":"Medium aberration, chaotic evil","cr":"3","ac":15,"hp":58,"speed":"30 ft., climb 20 ft.","stats":{"STR":16,"DEX":14,"CON":15,"INT":6,"WIS":13,"CHA":8},"traits":[{"name":"","text":""}],"actions":[{"name":"","text":""}],"tactics":"how it fights and what it does when losing"}';

// --------------------------------------------------------------------- merge
function mergeWorld(world: any, d: any) {
  const w = { ...world };
  if (d.scene) w.scene = d.scene;
  if (typeof d.threat === "number") w.threat = Math.max(0, Math.min(100, d.threat));
  if (typeof d.corruption === "number") w.corruption = Math.max(0, Math.min(100, d.corruption));
  if (d.antagonist?.name) w.antagonist = d.antagonist;
  if (Array.isArray(d.enemies)) {
    w.enemies = d.enemies.map((e: any) => ({
      name: e.name, ac: e.ac || 12, maxHp: e.maxHp || e.hp || 10,
      hp: typeof e.hp === "number" ? e.hp : (e.maxHp || 10),
      initMod: e.initMod || 0, notes: e.notes || "",
    }));
    w.order = [];
  }
  if (Array.isArray(d.journal) && d.journal.length) w.journal = (w.journal || []).concat(d.journal).slice(-20);
  if (Array.isArray(d.quests) && d.quests.length) {
    const q = (w.quests || []).slice();
    d.quests.forEach((nq: any) => {
      const i = q.findIndex((x: any) => x.title === nq.title);
      if (i >= 0) q[i] = nq; else q.push(nq);
    });
    w.quests = q;
  }
  if (Array.isArray(d.factions) && d.factions.length) {
    const f = (w.factions || []).slice();
    d.factions.forEach((nf: any) => {
      const i = f.findIndex((x: any) => x.name === nf.name);
      if (i >= 0) f[i] = nf; else f.push(nf);
    });
    w.factions = f;
  }
  return w;
}

async function applyPartyUpdates(code: string, updates: any[]) {
  if (!Array.isArray(updates) || !updates.length) return;
  const { data } = await sb.from("characters").select("slot, data").eq("campaign_id", code);
  for (const row of data || []) {
    const ch = row.data?.char;
    if (!ch?.name) continue;
    const u = updates.find((x: any) => x?.name && String(x.name).toLowerCase() === String(ch.name).toLowerCase());
    if (!u) continue;
    const n = { ...ch };
    const maxHp = Number(n.maxHp) || 0;
    if (typeof u.hp === "number") n.hp = Math.max(0, maxHp ? Math.min(maxHp, u.hp) : u.hp);
    if (typeof u.temp === "number") n.temp = u.temp;
    if (typeof u.xp === "number") n.xp = u.xp;
    // A level award puts casters back in front of the spell list: the sheet
    // compares level against spellsAt and prompts when they differ.
    if (typeof u.level === "number" && u.level >= 1 && u.level <= 20) n.level = u.level;
    if (Array.isArray(u.conditions)) n.conditions = u.conditions;
    if (Array.isArray(u.slots)) n.slots = u.slots;
    if (u.notes) n.notes = u.notes;
    await sb.from("characters")
      .update({ data: { by: "gm-agent", char: n }, updated_at: new Date().toISOString() })
      .eq("campaign_id", code).eq("slot", row.slot);
  }
}

// -------------------------------------------------------------------- server
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Bad JSON" }, 400); }

  const action = String(body.action || "turn");
  const code = String(body.code || "").trim().toUpperCase();
  if (!code) return json({ error: "Missing campaign code" }, 400);

  // ---- provision: mint GM credentials once, at campaign creation
  if (action === "provision") {
    const { data: existing } = await sb.from("campaign_secrets").select("campaign_id").eq("campaign_id", code).maybeSingle();
    if (existing) {
      const auth = await authorize(code, body.gm_token, body.gm_pass);
      if (!auth.ok) return json({ error: "This campaign already has a Game Master. Use the GM link or passphrase." }, 409);
      const { data } = await sb.from("campaign_secrets").select("gm_token, gm_pass").eq("campaign_id", code).maybeSingle();
      return json({ gm_token: data!.gm_token, gm_pass: data!.gm_pass, existing: true });
    }
    const rec = { campaign_id: code, gm_token: token(), gm_pass: passphrase() };
    const { error } = await sb.from("campaign_secrets").insert(rec);
    if (error) return json({ error: error.message }, 500);
    return json({ gm_token: rec.gm_token, gm_pass: rec.gm_pass, existing: false });
  }

  // ---- unlock: trade the passphrase for the token
  if (action === "unlock") {
    const auth = await authorize(code, "", body.gm_pass);
    if (!auth.ok) return json({ error: auth.reason }, 403);
    return json({ gm_token: auth.gm_token });
  }

  // ---- verify: is this token really the GM's? The hosted page asks on every
  // load before it will show a single GM control. A token pasted into the URL
  // by a curious player fails here.
  if (action === "verify") {
    const auth = await authorize(code, body.gm_token, body.gm_pass);
    if (!auth.ok) return json({ error: auth.reason }, 403);
    return json({ ok: true });
  }

  // ---- everything below is a GM-only world mutation
  const auth = await authorize(code, body.gm_token, body.gm_pass);
  if (!auth.ok) return json({ error: auth.reason }, 403);

  const { data: camp, error: campErr } = await sb.from("campaigns").select("world").eq("id", code).maybeSingle();
  if (campErr) return json({ error: campErr.message }, 500);
  if (!camp) return json({ error: "Campaign " + code + " does not exist." }, 404);

  const world = camp.world || {};
  const { data: chars } = await sb.from("characters").select("slot, data").eq("campaign_id", code).order("slot");
  const party = (chars || []).map(r => r.data?.char).filter(Boolean);
  const lvl = partyLevel(party);
  const tone = String(body.tone || "Grim dark");
  const diff = String(body.difficulty || "Deadly");
  const model = String(body.model || "haiku");

  const worldBlob = JSON.stringify({
    campaign: world.campaign, scene: world.scene, threat: world.threat, corruption: world.corruption,
    party: party.map((p: any) => ({
      name: p.name, cls: p.cls, level: p.level, ac: p.ac, hp: p.hp + "/" + p.maxHp,
      scores: p.scores, conditions: p.conditions, features: p.features, notes: p.notes,
      cantrips: p.cantrips, prepared: p.prepared, slotsUsed: p.slotsUsed,
    })),
    enemies: (world.enemies || []).map((e: any) => ({ name: e.name, hp: e.hp + "/" + e.maxHp, ac: e.ac })),
    factions: world.factions, quests: world.quests, antagonist: world.antagonist,
    biome: world.biome ? { name: world.biome.name, terrain: world.biome.terrain } : null,
    memory: (world.journal || []).slice(-8),
  });

  try {
    // ---- biome ------------------------------------------------------------
    if (action === "biome") {
      const raw = await claude(biomeSystem(tone, lvl),
        "CAMPAIGN CONTEXT:\n" + worldBlob + "\n\nREGION BRIEF: " + (String(body.brief || "").trim() || "invent one that grows out of this campaign's own history and unresolved threads"),
        2600, model);
      const d = parseJson(raw);
      if (!d?.name) return json({ error: "The agent returned nothing usable." }, 502);
      const grid = Array.isArray(d.map?.grid) ? d.map.grid : [];
      const biome = { ...d, map: { grid, legend: Array.isArray(d.map?.legend) ? d.map.legend : [] } };
      const w = { ...world, biome, by: "gm-agent" };
      await sb.from("campaigns").update({ world: w, updated_at: new Date().toISOString() }).eq("id", code);
      return json({ ok: true, kind: "biome", biome });
    }

    // ---- foe --------------------------------------------------------------
    if (action === "foe") {
      const raw = await claude(foeSystem(tone, lvl, diff),
        "CAMPAIGN CONTEXT:\n" + worldBlob + "\n\nTHREAT BRIEF: " + (String(body.brief || "").trim() || "escalate the current scene with something the party has not learned to counter"),
        2000, model);
      const d = parseJson(raw);
      if (!d?.name) return json({ error: "The agent returned nothing usable." }, 502);
      const w = { ...world, bestiary: [d].concat(world.bestiary || []).slice(0, 8), by: "gm-agent" };
      await sb.from("campaigns").update({ world: w, updated_at: new Date().toISOString() }).eq("id", code);
      return json({ ok: true, kind: "foe", foe: d });
    }

    // ---- patch: GM world edits that need no model call (initiative, party
    // HP and conditions, journal, quest status). These run through the
    // function rather than the client's public key so that they, too, are
    // gated on GM credentials.
    if (action === "patch") {
      const ALLOW = ["scene", "threat", "corruption", "order", "round", "turnIdx", "journal", "quests", "enemies"];
      const patch = body.world_patch && typeof body.world_patch === "object" ? body.world_patch : {};
      const w: any = { ...world, by: "gm-agent" };
      for (const k of ALLOW) if (k in patch) w[k] = patch[k];
      if (typeof w.threat === "number") w.threat = Math.max(0, Math.min(100, w.threat));
      if (typeof w.corruption === "number") w.corruption = Math.max(0, Math.min(100, w.corruption));
      if (Array.isArray(w.journal)) w.journal = w.journal.slice(-20);
      await sb.from("campaigns").update({ world: w, updated_at: new Date().toISOString() }).eq("id", code);

      const pp = Array.isArray(body.party_patch) ? body.party_patch : [];
      for (const u of pp) {
        const slot = Number(u?.slot);
        if (!(slot >= 1 && slot <= 4)) continue;
        const { data: row } = await sb.from("characters").select("data").eq("campaign_id", code).eq("slot", slot).maybeSingle();
        const ch = row?.data?.char;
        if (!ch) continue;
        const n = { ...ch };
        const maxHp = Number(n.maxHp) || 0;
        if (typeof u.hp === "number") n.hp = Math.max(0, maxHp ? Math.min(maxHp, u.hp) : u.hp);
        if (typeof u.temp === "number") n.temp = u.temp;
        if (Array.isArray(u.conditions)) n.conditions = u.conditions;
        if (Array.isArray(u.cond)) n.cond = u.cond;
        if (u.slotsUsed && typeof u.slotsUsed === "object") n.slotsUsed = u.slotsUsed;
        if (Array.isArray(u.spells)) n.spells = u.spells;
        if (Array.isArray(u.prepared)) n.prepared = u.prepared;
        if (Array.isArray(u.cantrips)) n.cantrips = u.cantrips;
        if (typeof u.spellsAt === "number") n.spellsAt = u.spellsAt;
        await sb.from("characters")
          .update({ data: { by: "gm-agent", char: n }, updated_at: new Date().toISOString() })
          .eq("campaign_id", code).eq("slot", slot);
      }
      return json({ ok: true, kind: "patch" });
    }

    // ---- advance ----------------------------------------------------------
    const cursor = Number(world.chat_cursor || 0);
    const { data: msgs } = await sb.from("chat").select("id, speaker, text, kind")
      .eq("campaign_id", code).gt("id", cursor).order("id").limit(40);
    const fresh = (msgs || []).filter(m => m.kind === "player");
    const declared = [String(body.declare || "").trim(), fresh.map(m => m.speaker + ": " + m.text).join("\n")]
      .filter(Boolean).join("\n");

    const recent = (world.feed || []).slice(-10).map((l: any) => l.speaker + ": " + l.text).join("\n");
    const raw = await claude(gmSystem(tone, diff, lvl),
      "WORLD STATE:\n" + worldBlob + "\n\nRECENT TRANSCRIPT:\n" + recent +
      "\n\nPLAYERS DECLARE: " + (declared || "(no declaration — advance the scene, raise the pressure)") +
      "\n\nRespond with the JSON object.", 2400, model);
    const d = parseJson(raw);
    if (!d || !Array.isArray(d.lines)) return json({ error: "The agent returned nothing usable. Try advancing again." }, 502);

    const lines = d.lines.filter((l: any) => l?.text);
    const spoken = fresh.map(m => ({ speaker: m.speaker.toUpperCase(), text: m.text }));
    const merged = mergeWorld(world, d);
    merged.feed = (world.feed || []).concat(spoken, lines).slice(-40);
    merged.by = "gm-agent";
    merged.chat_cursor = (msgs || []).reduce((a, m) => Math.max(a, m.id), cursor);
    merged.turn_at = new Date().toISOString();

    await sb.from("campaigns").update({ world: merged, updated_at: new Date().toISOString() }).eq("id", code);
    await applyPartyUpdates(code, d.party_updates);
    return json({ ok: true, kind: "advance", lines, consumed: fresh.length });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
