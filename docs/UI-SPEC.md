# UI spec

High fidelity. The prototype's look is final; rebuild it with the Nocturne tokens in `design/nocturne-styles.css`. The prototype hard-codes hex values inline — map them to tokens as below.

## Tokens in use

| prototype hex | token | role |
|---|---|---|
| `#161826` | `--color-bg` | page ground |
| `#181a29` / `#1b1d2c` | neutral-900 range | panels, header gradient |
| `#1d1f2e` | neutral-900 surface | cards, inputs, spell rows |
| `#232136` / `#2b2741` | accent-900 / 800 | selected row fill, button hover |
| `#292b31` | neutral-800 | borders, dividers |
| `#3f424d` | neutral-700 | secondary button border, spent slot pip |
| `#595d6c` / `#75798c` | neutral-600 / 500 | labels, hints |
| `#9397ab` / `#b2b6ca` / `#cfd3e5` | neutral-400 / 300 / 200 | secondary and body text |
| `#e9e9ed` | `--color-text` | primary text |
| `#9184d9` | `--color-accent` | primary button border, focus |
| `#b5abfc` / `#d2cefd` | accent-300 / 200 | accent text, available slot pip |
| `#796cbf` / `#423a6a` | accent-600 / 800 | small labels, left rules |
| `#7d5a5a` / `#e0a3a3` / `#33232a` | — | destructive only (delete, release hover, "no slot" warning) |

Type: Inter 500. Body 13px/1.5. Small caps labels 9.5–11px, `letter-spacing .14–.16em`, uppercase. Numbers in IBM Plex Mono.
Spacing is the 0.7× scale: 2.8, 4, 5.6, 8.4, 11.2, 16.8, 22.4px.
Radii: 4px inputs/chips, 8px buttons/cards.
Buttons: transparent with 1px border. Primary = accent border + accent-200 text; secondary = neutral-700 border. Hover tints the fill (`#2b2741`). Uppercase 11px, `.1–.12em` tracking.

## Screens

### GM console (`/`)
Three columns: left party rail, centre transcript + declare box, right tool tabs (Combat, Biome, Bestiary, World, Sync).

- **Party rail** — one expandable card per seat: name, class, HP bar, ±HP, condition chips (name · rounds left · ✕ release), slot pips per level.
- **Transcript** — speaker label in small caps above each line. Pending player declarations under "N declarations awaiting the GM", muted, above the quick-action row.
- **Declare box** — textarea, ↵ to send, quick actions: Advance, Press deeper, Short rest, Perception, Escalate.
- **Combat tab** — initiative list, Roll initiative, Next turn; enemies; **Conditions** block: Round N, +1 round, active list (who · condition · rd left · Release), target select, condition select, one-line effect, duration select, rounds override (placeholder = default), Apply. Note under: "Rounds — override if the ruling differs." or "Does not tick down; release it by hand."
- **Sync tab** — connection, campaign code, Saved campaigns (Open / Delete → confirm dialog), seat rows, Player invite link + Copy, **Game Master link**: "Mint GM credentials" → GM link + Copy + Passphrase.

**Delete dialog** — backdrop `rgba(11,12,20,.72)`; card max 400px. Title "Delete CODE?". Body: "This removes the campaign and all four character sheets from the database. Anyone holding its invite link loses the game. There is no undo." If current: "This is the campaign you are connected to right now." Buttons: Cancel · Delete campaign (destructive outline).

### Player view (`/play`)
Header: campaign, seat, GM passphrase field + Unlock (hidden when locked), Leave slot.

- **Lobby** — four seats; taken seats dimmed; collision shows "just claimed".
- **Wizard** — "Step N of 6" (5 for non-casters). Headings, in order:
  1. "What do you fight as?"
  2. "Where do you come from?"
  3. "What are you called?"
  4. "What are you made of?"
  5. "What magic do you carry?" — "Spellcasting ability WIS +3"; Cantrips — x of n; Spells known / Spellbook / Prepared spells — x of n. Each spell is a selectable row: name, "Level 1 · Evocation", one-line blurb. Full lists dim unselected rows to 40%.
  6. "Ready?" — summary rows, "Take the field".
- **Sheet** — Story / World / Party tabs. Story has the transcript and the **Declare** box ("Say or do something — ↵ to declare"). Sheet shows Conditions (read-only, with rounds left; note "Conditions are applied and cleared by the GM. They tick down with the round.") and **Spellcasting**: ability + save DC, Short rest, Long rest, slot pips, level-up banner "You are level N — choose your spells", tabs Cast / Prepare / Spell list. Cast: spell select → blurb → Slot select + "Upcast from 2nd" → Cast. With no slot left: "No slot of that level or higher remains. Rest, or cast a cantrip."

### Remote GM drawer (hosted page, verified token)
Header shows "Game Master", **GM controls / Hide GM**, Lock. Drawer sections:
- **Scene** — Advance, Press deeper, Short rest, Perception, Escalate.
- **World** — brief input, Generate region, Forge a foe, Round N, Roll initiative, Next turn.
- **Party** — per seat: name, HP, −5 −1 +1 +5, conditions; then the same Conditions block as the console.
- **Log** — journal entry ("Title — what happened"), File; quests cycle active → done → failed on tap.
Busy label and last message at the right of the section tabs.

Mobile: all hit targets ≥ 44px in the drawer and sheet.
