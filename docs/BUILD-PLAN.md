# Build plan

The order of work, from a prototype to the product described in
"Where this is going" at the foot of this file. Each step should leave
something runnable.

Steps 1–7 are **done**. What follows them is sequenced so that the two
decisions which get expensive when deferred — who owns a character, and where
a campaign module lives — are made before anything is built on top of them.

---

## Done

1. **Scaffold.** Vite + React + TS. Hash routes `#gm` and `#play`. Env vars
   `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_HOSTED_BASE`.
   `design/nocturne-styles.css`. `src/data/*` as typed TS modules.
2. **Data layer.** `src/lib/db.ts`: connect, subscribe, pull, debounced world
   push, per-seat character push, conditional seat claim, chat insert, campaign
   list and delete. Per-campaign local cache.
3. **Server agent.** Migrations 0001–0003 applied, including the lockdown.
   `gm-agent` deployed with `ANTHROPIC_API_KEY` in Edge Function secrets.
   Models are the 5-series; `opus` is the default and the console can switch.
4. **Player flow.** Lobby → six-step wizard → sheet with Declare. All 13
   classes with full subclass lists, 10 race families, floating ability
   increases for Half-Elf and Variant Human.
5. **Casting.** Cantrips and spells at creation; cast, upcast, prepare, spell
   list, short and long rests, level-up prompt.
6. **Conditions.** GM picker with duration and rounds override, the round
   clock, expiry on `+1 round`, release by hand. Read-only on the player sheet.
7. **GM console.** Full-height three-column shell, party rail, transcript with
   quick actions, dice roller, and the Combat / Module / Biome / Bestiary /
   World / Sync tabs.

Campaign modules landed alongside 7: the `CampaignModule` schema, The Ashfall
Compact, the live-slice brief with prompt caching, and the Module tab.

---

## 8. Remote GM drawer

The last piece of the table itself. Verify on load, passphrase unlock, the four
drawer sections, everything through `patch` / `advance` / `biome` / `foe`.
Mobile: every target ≥ 44px.

Doing this before identity because it is self-contained and finishes the thing
that already works, rather than opening a new seam.

## 9. Identity — anonymous auth and the character roster

**The step that must not be deferred.** A character is currently owned by a
random `clientId` in `localStorage`: clear your browser and it is gone, and
nothing links a character to a person.

- **Anonymous auth.** Supabase hands out a real user id with no signup
  friction. Later, `linkIdentity` upgrades that same user to an email account
  *keeping everything they own* — so step 14 becomes a link, not a migration.
- **RLS on seats** so a seat is writable only by its holder, which is what the
  old step 10 was.
- **Split the table.** Today `characters` is really a seat with a character
  inlined, keyed `(campaign_id, slot)`. It becomes two things:
  - `characters` — the **roster**, owned by `user_id` and belonging to no
    campaign. Where a character is born.
  - `seats` — `(campaign_id, slot, character_id, claimed_by)`. The four chairs.

- **Invert the flow.** Today: claim a seat, then build a character into it.
  After: build characters on your account, then join a campaign and choose
  which one to bring. The wizard moves out of the campaign and into the
  roster; the campaign gets a "which character?" picker instead.

**Ruling needed, and the plan assumes this answer:** bringing a character into
a campaign **copies** it into that seat. From then the seat's copy is the live
one — its HP, slots, conditions, XP and level are that campaign's. The roster
entry stays as a reusable build. Without the copy, playing a second campaign
would overwrite the character in the first, and a character legitimately sits
at different levels in different games.

## 10. Deploy cutover

GitHub Pages currently serves the old prototype; CI already builds the rebuild
and the deploy job is gated behind manual dispatch. Drop the gate, set Pages to
"GitHub Actions", cut over.

After identity on purpose: anyone who plays before the roster exists would need
their characters migrated, and the cutover is what invites real players in.

## 11. Campaign library

Modules stop shipping in the browser bundle. `src/data/modules/ashfall.ts` is
readable by anyone with devtools today — fine while free and ours, fatal once a
module is inventory.

- Modules move to a `modules` table. `gm-agent` reads the one a campaign runs.
- The console fetches its slice through an endpoint that checks entitlement.
- **The `CampaignModule` type does not change.** Only delivery moves; the
  schema and `moduleBrief` port as they are.
- **Zip import.** A zip is the delivery artifact — hand someone a file, they
  unzip, the console imports it into the same shape. Nothing downstream knows
  which route a module arrived by.
- An `entitlements` table, written by hand for now. Step 14 adds the thing that
  writes it after a payment.

## 12. Battle map

The player view switches to a top-down field when combat starts.

Half of it exists: the biome generator already returns a 12×20 ASCII grid with
a legend, on `world.biome.map`. The gap is positional — `Combatant` is
`{name, init, foe}` with no coordinates.

**Settle before writing code:** does a player move their own token or the GM?
Does the agent place enemies? Is the grid authoritative for range and cover, or
decorative with the agent still adjudicating distance? These change the schema
in different directions.

## 13. Narrator

ElevenLabs TTS for the GM's voice. Last of the play features, because it
changes `FeedLine`'s shape and is easier to price once turn volume is known.

- `ELEVENLABS_API_KEY` in Edge Function secrets, never the browser.
- A **separate** `tts` function — different timeout and failure profile from
  `gm-agent`.
- Generate server-side **once** and cache in Storage, keyed by a hash of the
  line. Per-client generation multiplies cost by table size.
- `FeedLine` gains an optional `audio` field.
- Low-latency model, streamed. Browser autoplay is blocked until a user
  gesture, so the sheet needs a "Narrate" toggle tapped once per session.
- Per-speaker voices are nearly free once the plumbing exists: the agent
  already tags every line with a speaker.

## 14. Accounts and the storefront

Deliberately last. The product decisions are not made yet — one-off purchase or
subscription, does a player need to own a campaign or only the DM, what happens
to a campaign in progress on a refund — and building before deciding means
building twice.

- Email accounts, by linking the anonymous user from step 9.
- DM and player as a per-campaign role, not a per-account one. A person is a DM
  in their campaign and a player in a friend's.
- Payment, writing `entitlements`.
- The campaign dropdown at startup, listing what this account owns.

---

## Where this is going

A website you log in to as DM or player. Your characters live on your account
and can go on multiple campaigns. A DM buys a campaign; it appears in their
dropdown; they invite friends to play it.

Ashfall is the project's own first campaign. The ones after it are written by
Elliott — city names, NPC names, the vibe, enemies, situations — and built into
modules from that. The `wants` and `secret` fields on an NPC are what make them
play well.

A DM can always read everything they bought, exactly as with a published
module. What is protected is non-buyers.

---

## Open items

Still open:

- **"Start over"** to rebuild a character mid-game. Needs a ruling on what
  happens to XP, level and inventory first — and step 9 may answer it, since a
  roster character can simply be brought again.
- ~~The console's stacked path below 1100px was untuned~~ — the order now
  inverts so the transcript comes first rather than being pushed below four
  seats and a dice tray, the seats sit two or three across, and anything laid
  out across a column's width is re-capped. Worth a look on a real tablet; it
  was tuned by replaying the breakpoint rather than on the device.

Closed since the handoff:

- ~~Pickable Half-Elf ability bonuses~~ — done in the wizard, with Variant
  Human on the same mechanism.
- ~~Larger ▲/▼ targets on the point-buy step~~ — the steppers are 44px.
- ~~The condition duration select showing one thing while its state said
  another~~ — fixed by deriving the shown value rather than storing it. The
  same class of bug was found and fixed in the cast slot select, and both are
  covered by regression tests.
- ~~Verify that opening a saved campaign pulls rather than upserts~~ — `connect`
  pulls, and a generation guard stops a slow one clobbering a live connection.
