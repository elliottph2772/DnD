-- Nocturne GM Agent — server-agent migration
-- Run this ONCE in the Supabase SQL editor, after supabase-schema.sql.
-- Adds: GM secrets (invisible to the anon key), a player chat table.

-- ---------------------------------------------------------------- GM secrets
-- RLS is enabled and NO policy is created, so the anon/publishable key can
-- neither read nor write this table. Only the Edge Function, which uses the
-- service-role key, can touch it. That is what keeps the GM token secret even
-- though the campaign row itself is world-readable.
create table if not exists campaign_secrets (
  campaign_id text primary key,
  gm_token    text not null,
  gm_pass     text not null,
  created_at  timestamptz not null default now()
);

alter table campaign_secrets enable row level security;
revoke all on campaign_secrets from anon, authenticated;

-- ------------------------------------------------------------------ Free chat
-- Players type into this table directly. The Edge Function reads everything
-- newer than the campaign's chat cursor and feeds it to the agent as the
-- party's declaration, then advances the cursor.
create table if not exists chat (
  id          bigserial primary key,
  campaign_id text        not null,
  slot        int,
  speaker     text        not null,
  text        text        not null,
  kind        text        not null default 'player',
  created_at  timestamptz not null default now()
);

create index if not exists chat_campaign_idx on chat (campaign_id, id);

alter table chat enable row level security;

drop policy if exists "anon read chat"   on chat;
drop policy if exists "anon write chat"  on chat;

create policy "anon read chat"  on chat for select to anon using (true);
create policy "anon write chat" on chat for insert to anon with check (
  length(text) between 1 and 2000 and length(speaker) between 1 and 60
);

-- Realtime for the transcript
alter publication supabase_realtime add table chat;

-- ------------------------------------------------- OPTIONAL: full lockdown
-- The hosted page no longer writes the world row itself — every GM action goes
-- through the Edge Function, which checks credentials. But `campaigns` is still
-- writable by anyone holding the publishable key, so a player working in
-- devtools could still write to it directly.
--
-- Running the two statements below closes that: only the Edge Function (which
-- uses the service-role key and bypasses RLS) can write the world. The cost is
-- that the DESKTOP CONSOLE also loses its direct writes — it would have to
-- drive the world through the function too, giving up the offline fallback.
-- Uncomment only if you want the stricter setup.
--
-- drop policy if exists "anon rw campaigns" on campaigns;
-- create policy "anon read campaigns" on campaigns for select to anon using (true);
