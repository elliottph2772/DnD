-- Identity: characters belong to people, not to chairs.
--
-- Until now `characters` was really a seat with a character inlined, keyed
-- (campaign_id, slot) and claimed by a random string from localStorage. Clear
-- your browser and the character was gone, and nothing tied it to a person.
--
-- This splits it in two:
--   seats      — the four chairs in a campaign. What the table reads.
--   characters — the roster. A character owned by a user, in no campaign.
--
-- Bringing a character to a campaign COPIES it into the seat. From then the
-- seat's copy is the live one: its HP, slots, conditions, XP and level belong
-- to that campaign. Without the copy, playing a second campaign would
-- overwrite the character in the first, and a character legitimately sits at
-- different levels in different games. See docs/BUILD-PLAN.md step 9.

-- ---------------------------------------------------------------- seats
-- The old table becomes what it always was.
alter table if exists characters rename to seats;

-- `claimed_by` held a localStorage string that matches no real identity, so
-- there is nothing to preserve. Every existing seat is released; the character
-- data in `data` is untouched.
alter table seats drop column if exists claimed_by;
alter table seats add column if not exists claimed_by uuid references auth.users(id) on delete set null;

-- Which roster character is sitting here, when one is. Null means the seat
-- holds a character built before the roster existed, or none at all.
alter table seats add column if not exists character_id uuid;

-- ----------------------------------------------------------- characters
-- The roster. Owned by a user and belonging to no campaign.
create table if not exists characters (
  id         uuid primary key default gen_random_uuid(),
  owner      uuid not null references auth.users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists characters_owner_idx on characters (owner);
create index if not exists seats_character_idx on seats (character_id);

alter table characters enable row level security;

-- A roster is private. Only its owner sees it, and only its owner writes it.
-- The table never needs to read it: the table reads `seats`, which holds the
-- copy. That is what keeps a character's other campaigns nobody else's
-- business.
drop policy if exists "own characters" on characters;
create policy "own characters" on characters
  for all to authenticated
  using (owner = (select auth.uid()))
  with check (owner = (select auth.uid()));

-- ------------------------------------------------------------ seat rules
alter table seats enable row level security;

drop policy if exists "anon rw characters" on seats;
drop policy if exists "anon rw seats"      on seats;
drop policy if exists "read seats"         on seats;
drop policy if exists "claim a free seat"  on seats;
drop policy if exists "write own seat"     on seats;
drop policy if exists "leave own seat"     on seats;

-- Anyone holding the campaign code can see who is at the table. This is how
-- the lobby and the console's party rail work, and it is unchanged.
create policy "read seats" on seats
  for select to anon, authenticated using (true);

-- A claim is still a conditional write — it only matches while the seat is
-- free — but now it is the database enforcing that the claimer is who they
-- say, rather than the client being trusted about it.
create policy "claim a free seat" on seats
  for update to authenticated
  using (claimed_by is null)
  with check (claimed_by = (select auth.uid()));

-- Once held, only the holder writes that seat. This closes the gap
-- docs/ARCHITECTURE.md left open: a player in devtools could previously write
-- any seat at the table, including someone else's hit points.
create policy "write own seat" on seats
  for update to authenticated
  using (claimed_by = (select auth.uid()))
  with check (claimed_by = (select auth.uid()) or claimed_by is null);

-- gm-agent holds the service-role key and bypasses all of this, which is how
-- the GM still moves party HP and conditions.

-- Seats are created by gm-agent at campaign creation, never by a client.
revoke insert, delete on seats from anon, authenticated;
