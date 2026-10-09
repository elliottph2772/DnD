# Decisions

Settled 2026-10-08, before any rebuild code was written. These are closed —
reopen one only with a reason, and amend this file when you do.

## Project shape

| Decision | Choice | Why |
|---|---|---|
| Approach | Clean rebuild: Vite + React + TypeScript, following BUILD-PLAN 1–10 | The prototype is reference, not production. Behaviour and look stay as the prototype has them. |
| Repo | One repo, `elliottph2772/DnD`, public | Keeps the hosted base `https://elliottph2772.github.io/DnD/`, so invite links already handed out still resolve. Pages on a private repo needs Pro. |
| Branches | `main` = source · `gh-pages` = what Pages serves | Pages served `main`/root, which is also where Vite's `index.html` has to live. Moving deployment to its own branch frees the root and keeps the old build live during the rebuild. |
| Folder | `~/WebstormProjects/D&D Game Master Console` | Asked for literally. Quote paths in every shell command. |
| State | Zustand store + `src/lib/db.ts` | Mirrors the prototype's single state object; slice selectors keep an HP tick from re-rendering the transcript. |
| Styling | `design/nocturne-styles.css` tokens + CSS Modules per component | The design file stays the single source of truth; UI-SPEC's hex→token table maps straight onto it. |
| Routing | Hash routing, `u=`/`k=` honoured as overrides | No Pages 404 rewrite to maintain, and old links keep working. `t=` is the GM param; the prototype's `gm=` is still accepted. |
| Tests | Vitest over the 5e rules and the pure sync logic only | A wrong slot table ruins a session. No component or E2E tests. |
| CI | One workflow: lint → test → build on every push; Pages deploy manual until cutover | The live page must not break while the rebuild is in progress. |

## Security

The lockdown is **on**. `campaigns` is read-only to the publishable key
(`supabase/migrations/0003_lockdown.sql`, applied 2026-10-08); every world
write goes through `gm-agent` with a `gm_token`.

Three consequences, all deliberate:

1. **The console has no direct write path and no `window.claude`.** It is served
   from the same public page as the player view, so it had no privileged
   position left to protect. All its model calls and world writes go through
   the function.
2. **Creating a campaign is a server action.** Nothing holding the publishable
   key can insert into `campaigns` any more, so `gm-agent` gains `create`
   (mints the code and credentials, seeds the world row and all four seats) and
   `delete` (removes both halves under GM auth). `provision` alone was never
   enough — it only ever wrote `campaign_secrets`.
3. **`patch`'s whitelist is not sufficient for the console.** It covers
   `scene, threat, corruption, order, round, turnIdx, journal, quests, enemies`
   but not `campaign, feed, biome, factions, antagonist, bestiary,
   chat_cursor`. A `world` action takes a full world row from an authenticated
   GM — the credential-gated equivalent of the console's old direct upsert.

Campaign codes are **server-generated**, eight characters from an alphabet with
no `0/O` or `1/I`, so a guesser cannot squat a memorable word. Codes are no
longer typed by hand on creation; opening an existing campaign by code still
works.

**Deferred:** BUILD-PLAN step 10 (anonymous auth + a `claimed_by = auth.uid()`
policy). `characters` stays anon-writable, so a player with devtools can edit
another player's sheet. That is a trust question among four friends at one
table, not a stranger problem. Revisit if the table ever opens up.

**Console access:** the console route is deployed but shows nothing — no
campaign list, no world — until `gm-agent`'s `verify` confirms a `gm_token`
from the URL or a passphrase unlock. `campaigns` is still anon-*readable*, so
an ungated console at the site root would have let a stranger read every
campaign.

## The model

The edge function pinned `claude-sonnet-4-5` / `claude-haiku-4-5`, and had no
`opus` branch at all, so the default selector silently resolved to Haiku. Both
were superseded; the table below is applied in `gm-agent` as of 2026-10-08:

| selector | model | $/MTok in | $/MTok out | ~$/turn (4k in, 1k out) |
|---|---|---|---|---|
| `opus` *(default)* | `claude-opus-5-5` | 4.00 | 20.00 | ~0.036 |
| `sonnet` | `claude-sonnet-5-5` | 2.00 | 10.00 | ~0.018 |
| `haiku` | `claude-haiku-5-5` | 0.10 | 0.50 | ~0.001 |

`claude-haiku-5-5` is ten times cheaper than the Haiku the prototype pinned.
Opus is the default because the narration is the product; the selector stays so
a grinding session can drop to Haiku.

The function moves to `npm:@anthropic-ai/sdk` with **structured outputs**
(`output_config.format`) carrying the GM JSON schema. That deletes `parseJson`
— the fence-scraping and brace-matching existed only to survive the model
wrapping its JSON in prose, which structured outputs makes impossible.

**Still outstanding** (2026-10-08): the function remains on raw `fetch` and
`parseJson`. Only the model IDs moved. Thinking is always on in this
generation and cannot be disabled, and thinking tokens count against
`max_tokens`, so each call's budget was raised to leave room to reason — a
budget sized for the prose alone truncates the JSON and `parseJson` returns
null. Effort is pinned to `medium`.

The Anthropic key is set by hand in the Supabase dashboard
(Edge Functions → Secrets, at /dashboard/project/<ref>/functions/secrets — it
moved out of Project Settings). It never enters this repo, a
build, or a transcript.

## Carried-over open items

In scope for the rebuild:

- **Condition-select bug.** The prototype's duration `<select>` displays "End of
  your next turn" while its state says "1 minute" — a controlled `<select>`
  whose value never reached the looped options. Done right, it cannot recur.
- **Mobile hit targets ≥ 44px**, everywhere, not just the drawer.
- **Half-Elf pickable ability bonuses** — +2 CHA and +1 to two others of the
  player's choice, replacing the current fixed bonuses.

Deferred:

- **"Start over"** to rebuild a character mid-game. Needs a ruling on what
  happens to XP, level and inventory first.

## Facts established while deciding

- `gm-agent` had never been deployed (the project's function list was empty).
- Migration 0002 had never been run; `campaign_secrets` and `chat` did not
  exist. Both were created 2026-10-08.
- `campaigns` held one saved campaign, `RFD5QZ` ("The Ashfall Compact", one
  feed line, no characters built, no seats claimed), and `characters` held nine
  rows — five of them orphans belonging to campaigns `4MRTDF` and `YGMGUC`,
  which no longer exist. (A first check via the Supabase MCP `list_tables`
  reported 0 rows for both; that is a stale planner estimate, not a count.
  Trust `select count(*)`.) Nothing was lost: the policy change touches no
  data, and no campaign has GM credentials yet, so `RFD5QZ` needs a
  `provision` before the locked-down console can write it.
- The Supabase project was paused by free-tier inactivity and had to be
  restored. It pauses again after about a week idle: check before a game night.
- The build deployed on Pages was **older** than the prototype build in the
  handoff folder (722,585 B vs 823,582 B). The newer one is live now.
- `Character.skills` is a string in the prototype, not the array
  ARCHITECTURE's sketch implies. The prototype wins.
- Migration **0004 is written but deliberately NOT applied** (2026-10-09). It
  renames `characters` to `seats` and gives the name to a new roster table, so
  applying it without the matching client change breaks the running app. It
  also needs **anonymous sign-ins enabled** on the project, which is a
  dashboard toggle under Authentication -> Sign In / Providers and has no API.
  Until that toggle is on, `signInAnonymously` returns
  `anonymous_provider_disabled` and nothing in step 9 can be verified. Apply
  the migration and switch the client in one pass, not separately.
