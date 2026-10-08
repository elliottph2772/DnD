# Architecture

## Roles

| Role | Where | Can do |
|---|---|---|
| **GM (desktop)** | Console at `/` | Everything. Writes the world row directly. |
| **GM (remote)** | Hosted page with a server-verified `gm_token` | Everything, but every write goes through `gm-agent`. |
| **Player** | Hosted page via invite link | Claim one seat, build and edit their character, cast, rest, chat. Read everything else. |

An invite link is `HOSTED_BASE/#play&c=<CODE>&u=<SUPABASE_URL>&k=<PUBLISHABLE_KEY>&lock=1`. `lock=1` hides the GM console, the code field and the passphrase unlock.
A GM link is the same plus `&gm=<gm_token>` and without `lock`.

## Data model

### `campaigns`
| column | type | notes |
|---|---|---|
| `id` | text PK | the campaign code, uppercase |
| `world` | jsonb | the whole shared world — see below |
| `updated_at` | timestamptz | |

`world` shape:
```ts
{
  by: string                // clientId of the last writer, or "gm-agent"
  campaign: string          // campaign title
  scene: string
  feed: { speaker: string; text: string }[]   // last 40 transcript lines
  threat: number            // 0–100
  corruption: number        // 0–100
  biome: Biome | null
  quests: { title: string; status: "active" | "done" | "failed" }[]
  journal: { title: string; text: string }[]  // last 20
  factions: { name: string; rep: number }[]   // -100..100
  antagonist: { name: string; adaptation: string }
  enemies: { name; hp; maxHp; ac; initMod; notes }[]
  order: { name: string; init: number; foe: boolean }[]   // initiative
  round: number
  turnIdx: number
  bestiary: Statblock[]     // last 8
  chat_cursor: number       // highest chat.id already resolved into a turn
  turn_at?: string
}
```

### `characters`
| column | type | notes |
|---|---|---|
| `campaign_id` | text | FK-ish to campaigns.id |
| `slot` | int | 1–4 |
| `claimed_by` | text null | clientId of the seat holder |
| `data` | jsonb | `{ by: string, char: Character | null }` |
| `updated_at` | timestamptz | |

Four rows per campaign, created with the campaign. Deleting a campaign deletes its four rows.

`Character`:
```ts
{
  name; cls;              // cls includes subclass: "Wizard (School of Evocation)"
  race; background; skills;
  level: number           // starts at 3
  scores: { STR; DEX; CON; INT; WIS; CHA }   // final, after racial bonuses
  hp; maxHp; temp; ac; initMod; pp; xp;
  inventory: string; notes: string; features: string[];
  built: boolean
  // casting
  cantrips: string[]      // spell names
  spells: string[]        // known spells, or a wizard's spellbook
  prepared: string[]      // castable leveled spells
  slotsUsed: Record<string, number>   // "1": 2 means two 1st-level slots spent
  spellsAt: number        // level the picks were last made at; != level ⇒ prompt
  // conditions
  cond: { name: string; label: string; rounds: number; expires: number }[]
                          // expires = absolute round number; 0 = no clock
  conditions: string[]    // mirror of cond[].name, for the agent prompt
}
```

### `campaign_secrets` (migration 0002)
`campaign_id` PK, `gm_token`, `gm_pass` (three words), `created_at`. RLS on, **no policies**, so the publishable key cannot read or write it. Only `gm-agent` (service role) touches it.

### `chat` (migration 0002)
`id` bigserial, `campaign_id`, `slot`, `speaker`, `text`, `kind` ('player'), `created_at`. Anyone may read and insert (length-checked). Realtime enabled.

## Sync

- One realtime channel per campaign, listening on `campaigns` (id), `characters` (campaign_id) and `chat` INSERT (campaign_id).
- Every write carries `by: clientId`. Inbound rows with your own `by` are ignored.
- **Desktop GM** ignores inbound world rows *except* those with `by: "gm-agent"` (turns resolved remotely) and the initial pull on connect.
- **Players** apply every inbound world row.
- World writes are debounced. Character writes are per-seat; a player only writes their own seat.
- An inbound character row with `char: null` blanks that seat locally — unless it's your own seat.
- Pending chat = rows with `id > world.chat_cursor`. Advancing a turn folds them into the declaration and moves the cursor.

## Seat claiming

`update characters set claimed_by = me where campaign_id = C and slot = N and (claimed_by is null or claimed_by = me)` — then check a row came back. If not, the seat was taken: dim it and show "just claimed". Leaving a seat sets `claimed_by = null`.

## The server agent — `gm-agent`

POST `{ action, code, gm_token?, gm_pass?, tone, difficulty, model, ... }`.

| action | auth | does |
|---|---|---|
| `provision` | none for a new campaign; GM creds for existing | Mints `gm_token` + passphrase once. |
| `unlock` | passphrase | Returns the token. |
| `verify` | token | 200 or 403. The hosted page calls this before showing any GM control. |
| `advance` | GM | Collects pending chat + optional `declare`, calls the model with the world, merges the result, applies party updates (HP, conditions, XP, **level**), moves `chat_cursor`. |
| `biome` | GM | Generates a region from an optional `brief`. |
| `foe` | GM | Forges a 5e statblock into `bestiary`. |
| `patch` | GM | Non-AI edits: whitelisted world keys (`scene, threat, corruption, order, round, turnIdx, journal, quests, enemies`) and per-slot party fields (`hp, temp, conditions, cond`). |

The model returns one JSON object: `scene, lines[], party_updates[], enemies[], journal[], quests[], factions[], threat, corruption, antagonist`. The prompts are in `index.ts` (`gmSystem`, `biomeSystem`, `foeSystem`) and mirrored in the prototype.

## Security model, honestly

- Forged `&gm=` in a URL → `verify` fails → no GM UI, and the function refuses every action.
- Player devtools → can still write `campaigns` directly with the publishable key, because the desktop console writes it directly. Migration 0002 ends with two commented statements that make `gm-agent` the only writer. **Recommendation for the real project: run them, and route the desktop console through `gm-agent` too.** That removes the gap and the `window.claude` dependency together.
- Player devtools can write any `characters` row. To close: add `auth.signInAnonymously()` and an RLS policy `claimed_by = auth.uid()`.

## Rules engine (`src/data/rules.js`)

- `casterFor(cls)` → `{ kind: none|known|prepared|book, prog: full|half|pact, ability, code }`
- `slotsFor(cls, level)` → `{ "1": 4, "2": 3, ... }` (pact: one level)
- `cantripsFor`, `pickCountFor(cls, level, abilityMod)`, `maxSpellLevel`, `listFor(cls, level, spellLevel?)`, `spellByName`
- `CONDITIONS` — 14 PHB conditions + Exhaustion 1–6, each with a one-line effect
- `DURATIONS` — the 5e vocabulary with default round counts (1 minute = 10, Until removed / Save ends / Concentration = 0)
- `restoresOnShort(cls)` — true for Warlock

## Flows

**Character creation** — Class & subclass → Race & background → Name → 27-point buy → Spells (casters only) → Review. Commits with `level 3, spellsAt 3`, HP from hit die + Con, AC 10 + Dex, starting kit from class + background.

**Casting** — choose a spell (cantrips + prepared); leveled spells show a slot dropdown of levels ≥ the spell's with charges left; Cast increments `slotsUsed[level]` and posts to chat. Short rest: pact slots only. Long rest: all slots and full HP.

**Level-up** — the agent sends `level` in `party_updates`. The sheet sees `spellsAt != level` and shows "You are level N — choose your spells" with lists resized to the new allotment. Done sets `spellsAt = level`.

**Conditions** — GM only. Pick target, condition, duration (fills rounds; overridable). `expires = round + rounds`. Next turn wrapping the order, or **+1 round**, increments `round` and drops every condition with `expires <= round`. Release removes one early.

**Delete campaign** — confirm dialog, then delete the campaign row and its four character rows.
