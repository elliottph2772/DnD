# Build plan

Suggested order. Each step should leave something runnable.

1. **Scaffold.** Vite + React + TS. Routes `/` and `/play`. Env vars `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_HOSTED_BASE`. Import `design/nocturne-styles.css`. Convert `src/data/*.js` to typed TS modules (same numbers).
2. **Data layer.** `src/lib/db.ts`: connect, subscribe, pull, debounced world push, per-seat character push, conditional seat claim, chat insert, campaign list/create-if-missing/delete. Per-campaign local cache. Port from the prototype's `connect`, `pushWorld`, `pushChar`, `claimSlot`, `onWorld`, `onChar`, `onChatRow`, `pullChat`, `deleteCampaign`.
3. **Server agent.** Run migration 0002 (decide on the two commented lockdown statements — recommended: run them). Deploy `gm-agent`. Make the desktop console call it too, with a console-side `gm_token` minted on campaign creation; delete the `window.claude` path.
4. **Player flow.** Lobby → wizard (six steps) → sheet with Declare.
5. **Casting.** Spell step, cast/upcast, prepare, spell list, rests, level-up prompt.
6. **Conditions.** GM picker, round clock, expiry on Next turn and +1 round, release.
7. **GM console.** Transcript, quick actions, Combat/Biome/Bestiary/World/Sync tabs, delete confirm.
8. **Remote GM drawer.** Verify on load, passphrase unlock, four sections, all via `patch`/`advance`/`biome`/`foe`.
9. **Deploy.** GitHub Actions: build `/play` to GitHub Pages for repo `DnD`; `supabase functions deploy gm-agent` on push.
10. **Hardening (optional).** Anonymous auth + RLS so a seat is writable only by its holder.

## Open items carried over
- Pickable Half-Elf ability bonuses (currently fixed).
- "Start over" button to rebuild a character mid-game.
- Larger ▲/▼ targets on the point-buy step for mobile.
- Known prototype bug: the condition duration select shows "End of your next turn" while its state (and the rounds placeholder) is "1 minute" — the controlled `<select>` value isn't applied to options rendered by a loop. Make sure the rebuilt select reflects state.
- Verify the last fix in practice: opening a saved campaign from the console now pulls its world instead of upserting over it.
