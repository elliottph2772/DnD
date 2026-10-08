# D&D Game Master Agent

A collaborative D&D 5e table. The GM runs encounters from a console; players open an invite link, claim a seat, build a character in a six-step wizard and play from a live sheet. Everything syncs through Supabase. An AI Game Master (Anthropic API) resolves turns, generates regions and forges statblocks — and only the GM can make it move.

This folder is the hand-off from the design prototype to a real project.

## What is in here

```
dnd-gm-agent/
├── README.md                 ← you are here
├── CLAUDE.md                 ← standing instructions for Claude Code
├── docs/
│   ├── ARCHITECTURE.md       ← data model, sync rules, security model, every flow
│   ├── UI-SPEC.md            ← screens, components, tokens, copy
│   ├── BUILD-PLAN.md         ← suggested order of work in the real project
│   ├── SERVER-SETUP.md       ← Anthropic key, migrations, deploying the function
│   └── screens/gm-console.png ← the console as it stands
├── prototype/                ← the working prototype — reference, not production code
│   ├── GM Console.dc.html    ← the whole app: console, player view, wizard, sheet
│   ├── support.js            ← runtime the .dc.html needs to open in a browser
│   ├── spells.js, rules.js   ← copies of the data files it loads
│   └── index.html            ← the self-contained build currently on GitHub Pages
├── src/data/
│   ├── spells.js             ← PHB spell list (~380): level, school, blurb, classes
│   └── rules.js              ← slot tables, spells known, cantrips, conditions, durations
├── supabase/
│   ├── migrations/0001_schema.sql   ← campaigns, characters (already run)
│   ├── migrations/0002_gm_agent.sql ← campaign_secrets, chat
│   └── functions/gm-agent/index.ts  ← the GM-gated server agent (Deno)
└── design/
    └── nocturne-styles.css   ← the Nocturne design-system tokens and components
```

`src/data/` and `supabase/` are production-ready and should be kept as they are. `prototype/` is a reference implementation: correct behaviour, but written as a single 2,900-line design file. Rebuild the UI properly; don't ship the prototype.

## Running the prototype

Open `prototype/GM Console.dc.html` in a browser from a local server (`npx serve prototype`) — it needs `support.js`, `spells.js` and `rules.js` beside it.

One thing will not work outside the design tool: the **desktop console's direct AI call** uses `window.claude.complete`, which only exists there. Everything else — Supabase sync, seat claiming, the wizard, the sheet, and the server agent via the Edge Function — works anywhere. In the real project, route the console through the Edge Function too (see BUILD-PLAN step 3).

## Live infrastructure

- **Supabase project:** `hwyuuwubgdlknsqdfsqi` — `https://hwyuuwubgdlknsqdfsqi.supabase.co`
- **Publishable key:** baked into the prototype as `BAKED_KEY`. Move it to an env var (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
- **Hosted player build:** `https://elliottph2772.github.io/DnD/` — repo `DnD`, `index.html` at root.
- **Edge Function:** `gm-agent` — needs `ANTHROPIC_API_KEY` set as a Supabase secret. Status: written, not yet confirmed deployed. See `docs/SERVER-SETUP.md`.
- **Migration 0002:** written, not yet confirmed run.

## Start here in Claude Code

1. Open this folder in WebStorm and start Claude Code in it. It reads `CLAUDE.md` automatically.
2. Ask it to read `docs/ARCHITECTURE.md` and `docs/BUILD-PLAN.md`, then scaffold step 1.
