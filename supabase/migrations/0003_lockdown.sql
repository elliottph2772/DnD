-- Full lockdown — the two statements 0002 left commented, now the real policy.
--
-- `campaigns` becomes read-only to the publishable key. Every world write goes
-- through the gm-agent Edge Function, which holds the service-role key and
-- checks the campaign's GM token or passphrase before it touches anything.
-- That closes the gap docs/ARCHITECTURE.md calls out: a player in devtools can
-- no longer write the world.
--
-- The cost 0002 warned about — the desktop console losing its direct writes —
-- is not a cost any more: the console is served from the same public page as
-- the player view, so it has no privileged position left to protect. It drives
-- the world through gm-agent with its own gm_token, and the
-- `window.claude.complete` fallback it existed to preserve is gone with it.
--
-- Because nothing holding the publishable key may insert into `campaigns`,
-- creating a campaign is now a server action too: gm-agent's `create` mints
-- the code and credentials and seeds the campaign row plus its four seats in
-- one call, and `delete` removes both halves under GM auth.

drop policy if exists "anon rw campaigns" on campaigns;
drop policy if exists "anon read campaigns" on campaigns;

create policy "anon read campaigns" on campaigns for select to anon using (true);

-- `characters` stays anon-writable: a player writes their own seat, and seat
-- claims rely on a conditional update. BUILD-PLAN step 10 (anonymous auth plus
-- a `claimed_by = auth.uid()` policy) is the fix for that one and is deferred.
