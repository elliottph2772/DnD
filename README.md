# D&D Game Master Console

A collaborative D&D 5e table. The GM runs encounters from a console; players
open an invite link, claim a seat, build a character in a six-step wizard and
play from a live sheet. Everything syncs through Supabase. An AI Game Master
(Anthropic API) resolves turns, generates regions and forges statblocks — and
only the GM can make it move.

**Live player page:** https://elliottph2772.github.io/DnD/

## Status

Mid-rebuild. The design prototype is complete and playable; it is being rebuilt
as a real Vite + React + TypeScript app, following `docs/BUILD-PLAN.md`.

- **Done** — scaffold, typed 5e data modules with tests, the data layer, the
  store, hash routing, both route shells, the locked-down database policies.
- **Next** — the `gm-agent` Edge Function (steps 3), then the player wizard and
  sheet (4–6), the full console (7) and the remote GM drawer (8).
- The page at the URL above still serves the **prototype** build, from the
  `gh-pages` branch. It stays there until the rebuilt player view is better.

## Layout

```
.
├── CLAUDE.md                 ← standing instructions for Claude Code
├── docs/
│   ├── DECISIONS.md          ← what is settled, and why
│   ├── ARCHITECTURE.md       ← data model, sync rules, security model
│   ├── UI-SPEC.md            ← screens, components, tokens, copy
│   ├── BUILD-PLAN.md         ← the order of work
│   └── SERVER-SETUP.md       ← Anthropic key, migrations, deploying the function
├── src/
│   ├── data/                 ← spells.ts, rules.ts (+ tests) — the 5e numbers
│   ├── lib/                  ← db.ts (Supabase), agent.ts (gm-agent), route, cache, world
│   ├── store/world.ts        ← the one Zustand store
│   ├── routes/               ← Console.tsx, Play.tsx
│   └── components/
├── design/nocturne-styles.css ← the design system; the source of truth for the look
├── supabase/
│   ├── migrations/           ← 0001 schema · 0002 secrets + chat · 0003 lockdown
│   └── functions/gm-agent/   ← the GM-gated server agent (Deno)
├── prototype/                ← the working prototype — reference, not production
└── legacy/index.html         ← the build Pages served before the rebuild
```

## Running it

```
npm install
cp .env.example .env.local     # fill in the publishable key
npm run dev
```

- `http://localhost:5173/DnD/` — the GM console. It stays locked until
  `gm-agent` verifies a GM token or passphrase.
- `http://localhost:5173/DnD/#play&c=<CODE>&lock=1` — the player view.

```
npm test        # the 5e rules and the sync logic
npm run build   # typecheck + production build
npm run lint
```

## Infrastructure

- **Supabase:** `hwyuuwubgdlknsqdfsqi` — `https://hwyuuwubgdlknsqdfsqi.supabase.co`.
  Free tier, so it pauses after about a week idle — check it before a game night.
- **Policies:** `campaigns` is read-only to the publishable key; `characters` is
  readable and writable; `campaign_secrets` is invisible to it; `chat` is
  readable and insertable. Every world write goes through `gm-agent`.
- **Edge Function:** `gm-agent` — not deployed yet. Needs `ANTHROPIC_API_KEY`
  as a Supabase secret. See `docs/SERVER-SETUP.md`.
- **Pages:** repo `DnD`, served from the `gh-pages` branch. `main` holds the
  source. At cutover, set the Pages source to "GitHub Actions".

## Running the prototype

```
npx serve prototype
```

Open `prototype/GM Console.dc.html`; it needs `support.js`, `spells.js` and
`rules.js` beside it. One thing will not work outside the design tool: the
console's direct AI call used `window.claude.complete`. The rebuild routes
every model call through the Edge Function instead.
