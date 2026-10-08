# Server agent setup

Six steps. You need your Supabase project (already have it) and an Anthropic API key.

---

## 1. Get an Anthropic API key

1. Go to **console.anthropic.com** and sign in with the same account you use for Claude.
2. Left sidebar → **API keys** → **Create key**. Name it `nocturne-gm`.
3. Copy it now — it starts `sk-ant-` and is shown once. Paste it somewhere safe.
4. Sidebar → **Plans & billing** → add a payment method and buy credits. Console API usage is billed separately from a Claude subscription; $5 covers a lot of turns on Haiku.

The key never goes in the hosted page or the repository. It lives in Supabase secrets, server-side.

---

## 2. Run the migration

Supabase dashboard → **SQL Editor** → paste all of `supabase-gm-migration.sql` → **Run**.

It adds two tables: `campaign_secrets` (GM token and passphrase, with RLS on and no policy, so the public key cannot read it at all) and `chat` (player free chat, publicly insertable).

The Sync tab's **Copy SQL** button now hands you the schema and this migration together, if you'd rather paste from there.

---

## 3. Install the Supabase CLI

macOS: `brew install supabase/tap/supabase`
Windows: `scoop install supabase`
Anything else: https://supabase.com/docs/guides/cli

Then, from this project's folder:

```
supabase login
supabase link --project-ref hwyuuwubgdlknsqdfsqi
```

---

## 4. Store the key as a secret

```
supabase secrets set ANTHROPIC_API_KEY=sk-ant-your-key-here
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically — don't set those.

---

## 5. Deploy the function

```
supabase functions deploy gm-agent --no-verify-jwt
```

`--no-verify-jwt` is required: nobody signs in, so there is no JWT. The function is not open, though — it checks the campaign's GM token or passphrase itself before it will touch the world.

Verify:

```
curl -X POST https://hwyuuwubgdlknsqdfsqi.supabase.co/functions/v1/gm-agent \
  -H "Content-Type: application/json" \
  -d '{"action":"unlock","code":"TEST","gm_pass":"nope"}'
```

Expect `{"error":"This campaign has no GM credentials yet — provision it from the console."}`. That means it is alive and refusing strangers.

---

## 6. Mint your GM link

In the console: **Sync** tab → **Mint GM credentials**.

You get back two things:

- **GM link** — the hosted page plus your GM token. Bookmark it on your phone. Anyone holding it is the GM, so treat it like a password.
- **Passphrase** — three words, e.g. `ashen-quarry-moth`. Write it down. If you lose the link, open any player invite link, type the passphrase in the header field, hit **Unlock**, and the GM controls appear.

Credentials are minted once per campaign. Pressing the button again on a campaign you already own just re-reads them; on a campaign someone else provisioned it refuses.

---

## How a session runs

Players open the invite link, claim a seat, build a character, then type freely into **Declare**. Their words land in the transcript under "awaiting the GM" — visible to everyone, but nothing has happened yet.

You open your GM link, tap **GM controls**, and hit **Advance**. The function collects every declaration since the last turn, sends them to the model with the full world state, writes the resolved turn back, and applies damage and conditions to the character sheets. Everyone's page updates at once.

The other GM sections: **World** generates a region or forges a foe from an optional brief, and holds initiative and next-turn. **Party** adjusts HP in ±1/±5 steps and edits conditions. **Log** files journal entries and cycles quest status.

The desktop console still calls the agent directly rather than through the function, so it keeps working if the function is ever down or out of credit.

---

## What "control stays with the GM" actually means

The hosted page shows GM controls only after the server confirms the token — pasting `&gm=anything` into an invite link fails verification and shows nothing. And the controls themselves never write with the page's public key: initiative, party HP, conditions, journal and quest status all go through the function as an authorized `patch`, same as Advance. So a forged token buys nothing.

One gap remains by your own choice: because the desktop console writes the world row directly (its offline fallback), `campaigns` is still writable by anyone holding the publishable key. A player working in browser devtools could write to it. The migration ends with two commented statements that close this — they make the function the only writer, which also means the desktop console has to route through it. Uncomment them if you'd rather have the stricter setup than the fallback.

## Costs

One turn on Haiku runs roughly 3–5k input tokens and under 1k output — fractions of a cent. Region generation and statblocks are similar. Switch the model prop to Sonnet for better prose at roughly 10× the price.

## If something breaks

- **"Not the Game Master."** — the token or passphrase doesn't match this campaign code. Check the code in the link.
- **"ANTHROPIC_API_KEY is not set"** — step 4 didn't take. Re-run it, then redeploy.
- **"Anthropic 401"** — bad key. **"Anthropic 429"** — out of credit.
- **Nothing happens on Advance** — check the campaign exists (`Connect` in the console creates it) and that the code in your GM link matches.
- Function logs: Supabase dashboard → **Edge Functions** → `gm-agent` → **Logs**.
