-- M4 cloud backup: trips, claimed rewards and the profile, one set per user.
-- Run once in the Supabase dashboard (SQL Editor → New query → paste → Run).
-- Safe to re-run: every statement checks whether its object already exists.
--
-- How the app uses these tables (see store/AppData.tsx, services/cloudSync.ts):
-- * The phone saves locally first and upserts changed rows in the background.
-- * Nothing is hard-deleted by the app: a deletion sets deleted_at, so other
--   phones learn about it on their next pull.
-- * updated_at is set by the phone (time of the edit). If an older edit arrives
--   after a newer one, the trigger keeps the newer row (last writer wins).
-- * synced_at is set by the server on every accepted write. Phones pull
--   "everything with synced_at after my last pull", so a wrong phone clock
--   never makes them miss a change.

-- ── Shared trigger ──────────────────────────────────────────────────────────
create or replace function public.sync_touch() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.updated_at < old.updated_at then
    return old; -- a late, older edit: keep the newer row unchanged
  end if;
  new.synced_at := now();
  return new;
end;
$$;

-- ── Trips ───────────────────────────────────────────────────────────────────
-- Primary key is (user_id, id): when a phone's anonymous trips are added to an
-- existing account, the same trip ID exists once per user, never twice per user.
create table if not exists public.trips (
  user_id        uuid        not null default auth.uid() references auth.users on delete cascade,
  id             text        not null,
  date           timestamptz not null,
  origin         text        not null,
  destination    text        not null,
  transport_type text        not null,
  cost           numeric     not null,
  distance       numeric     not null,
  description    text        not null default '',
  updated_at     timestamptz not null,
  deleted_at     timestamptz,
  synced_at      timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists trips_user_synced on public.trips (user_id, synced_at);

-- ── Claimed rewards (quests, achievements, streaks, main quest) ─────────────
create table if not exists public.reward_claims (
  user_id    uuid        not null default auth.uid() references auth.users on delete cascade,
  key        text        not null, -- e.g. "quest:daily_train:2026-10-20"
  kind       text        not null,
  xp         integer     not null,
  claimed_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  synced_at  timestamptz not null default now(),
  primary key (user_id, key)
);
create index if not exists reward_claims_user_synced on public.reward_claims (user_id, synced_at);

-- ── Profile (name + ticket), one row per user ──────────────────────────────
create table if not exists public.profiles (
  user_id           uuid        primary key default auth.uid() references auth.users on delete cascade,
  name              text        not null default '',
  ticket_label      text        not null,
  ticket_cost       numeric     not null,
  ticket_period     text        not null check (ticket_period in ('year', 'month')),
  ticket_start_date date,
  updated_at        timestamptz not null,
  synced_at         timestamptz not null default now()
);

-- ── Triggers ────────────────────────────────────────────────────────────────
drop trigger if exists trips_sync_touch on public.trips;
create trigger trips_sync_touch before insert or update on public.trips
  for each row execute function public.sync_touch();

drop trigger if exists reward_claims_sync_touch on public.reward_claims;
create trigger reward_claims_sync_touch before insert or update on public.reward_claims
  for each row execute function public.sync_touch();

drop trigger if exists profiles_sync_touch on public.profiles;
create trigger profiles_sync_touch before insert or update on public.profiles
  for each row execute function public.sync_touch();

-- ── Row-level security: each user sees and changes only their own rows ─────
-- Anonymous users are signed in too (role "authenticated"), so this covers them.
alter table public.trips enable row level security;
alter table public.reward_claims enable row level security;
alter table public.profiles enable row level security;

drop policy if exists "own rows" on public.trips;
create policy "own rows" on public.trips for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "own rows" on public.reward_claims;
create policy "own rows" on public.reward_claims for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "own rows" on public.profiles;
create policy "own rows" on public.profiles for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Nobody without a session gets anything.
revoke all on public.trips, public.reward_claims, public.profiles from anon;

-- ── Study export (researcher only) ─────────────────────────────────────────
-- A separate schema that the app's API does not expose, so only the dashboard
-- (SQL Editor, postgres role) can read it. No station names, no free text.
--
-- Duplicates: when someone adds a phone's anonymous trips to an existing
-- account, the trips now exist under the account AND under the old anonymous
-- user (who can never log in again). Such "merged" anonymous users are left
-- out completely, trips and rewards.
create schema if not exists study;
revoke all on schema study from public, anon, authenticated;

create or replace view study.merged_anonymous_users as
select distinct t.user_id
from public.trips t
join auth.users u on u.id = t.user_id
where u.is_anonymous
  and exists (
    select 1 from public.trips other
    where other.id = t.id and other.user_id <> t.user_id
  );

create or replace view study.trips as
select
  t.user_id,
  u.is_anonymous,
  t.id                          as trip_id,
  t.date,
  (t.date at time zone 'Europe/Vienna')::date as local_day,
  t.transport_type,
  t.distance                    as km,
  t.cost                        as price_eur,
  t.updated_at
from public.trips t
join auth.users u on u.id = t.user_id
where t.deleted_at is null
  and t.user_id not in (select user_id from study.merged_anonymous_users);

create or replace view study.rewards as
select
  r.user_id,
  r.kind,
  split_part(r.key, ':', 2)     as reward_id, -- quest/achievement ID or streak length
  r.key,
  r.xp,
  r.claimed_at
from public.reward_claims r
where r.deleted_at is null
  and r.user_id not in (select user_id from study.merged_anonymous_users);

-- Ticket per user (type, price, period, start) for break-even analysis; no name.
create or replace view study.tickets as
select p.user_id, p.ticket_label, p.ticket_cost, p.ticket_period, p.ticket_start_date
from public.profiles p
where p.user_id not in (select user_id from study.merged_anonymous_users);

revoke all on all tables in schema study from public, anon, authenticated;

-- Example export (SQL Editor → Run → Download CSV):
--   select * from study.trips order by user_id, date;
--   select * from study.rewards order by user_id, claimed_at;
