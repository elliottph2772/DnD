-- Nocturne GM Agent — Supabase schema
-- Paste this whole file into the Supabase SQL editor and run it once.
-- Uses the anon public key only. RLS is on; access is gated by knowing the campaign code.

create table if not exists campaigns (
  id          text primary key,
  world       jsonb       not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

create table if not exists characters (
  campaign_id text        not null,
  slot        int         not null check (slot between 1 and 4),
  claimed_by  text,
  data        jsonb       not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  primary key (campaign_id, slot)
);

alter table campaigns  enable row level security;
alter table characters enable row level security;

drop policy if exists "anon rw campaigns"  on campaigns;
drop policy if exists "anon rw characters" on characters;

create policy "anon rw campaigns"  on campaigns  for all to anon using (true) with check (true);
create policy "anon rw characters" on characters for all to anon using (true) with check (true);

-- Realtime
alter publication supabase_realtime add table campaigns;
alter publication supabase_realtime add table characters;
