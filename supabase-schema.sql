-- Torito — database schema
-- Paste the whole file into the Supabase SQL editor and run it once.
-- Safe to re-run: every statement is written to be idempotent.

-- ============================================================
-- PROFILES
-- One row per auth user, holding the display name and the role.
-- js/supabase.js reads (id, full_name, role); js/admin.js gates on role.
-- ============================================================
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  role       text not null default 'user',
  created_at timestamptz not null default now()
);

-- ============================================================
-- TOURS
-- Column names match the `name` attributes of the admin form in admin.html,
-- because js/admin.js posts the form straight through as a row.
--
-- id is uuid on purpose: admin.js compares t.id === button.dataset.edit, and
-- dataset values are always strings. A bigint id would arrive as a number and
-- that === would never match, breaking Edit and Delete.
-- ============================================================
create table if not exists public.tours (
  id              uuid primary key default gen_random_uuid(),
  slug            text unique not null,
  title           text not null,
  subtitle        text,
  category        text not null default 'other',
  region          text,
  cover_image     text,

  distance        text,
  duration        text,
  difficulty      text,
  elevation_gain  text,
  stay            text,
  languages       text,

  price           numeric(10,2),
  capacity        integer not null default 10,
  spots_left      integer,
  badge           text,

  -- human-readable, shown on the page: "June – October"
  season          text,
  -- machine-readable "MM-DD" pair driving the date filter in js/date-filter.js.
  -- Winter seasons wrap the year (12-01 -> 04-15) and are handled in code.
  season_from     text,
  season_to       text,

  departure_point text,
  departure_time  text,
  return_info     text,
  transport       text,
  group_size      text,
  walking_per_day text,

  summary         text,
  published       boolean not null default true,
  created_at      timestamptz not null default now()
);

create index if not exists tours_published_created_idx
  on public.tours (published, created_at desc);

-- ============================================================
-- ADMIN CHECK
-- security definer so it reads profiles without going through that table's own
-- policies — a policy on profiles that queried profiles would recurse forever.
-- ============================================================
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ============================================================
-- NEW USER -> PROFILE ROW
-- js/auth.js passes the name as user metadata on sign-up; this copies it over
-- so a profile always exists by the time the site looks for one.
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- STOP SELF-PROMOTION
-- Without this, anyone could PATCH their own profile row to role='admin'
-- and take over the tour catalogue.
-- ============================================================
create or replace function public.guard_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- auth.uid() is null when this runs from the SQL editor or a service_role
  -- connection — both already trusted, and both are how you promote the first
  -- admin. Anonymous web requests never reach here: the RLS update policy
  -- requires id = auth.uid(), which no anonymous request can satisfy.
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'Only an admin can change a role';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_role on public.profiles;
create trigger profiles_guard_role
  before update on public.profiles
  for each row execute function public.guard_role_change();

-- ============================================================
-- ROW LEVEL SECURITY
-- The admin page's own gate only hides the UI; these rules are what actually
-- stop a non-admin writing anything.
-- ============================================================
alter table public.profiles enable row level security;
alter table public.tours    enable row level security;

drop policy if exists "read own profile"     on public.profiles;
drop policy if exists "insert own profile"   on public.profiles;
drop policy if exists "update own profile"   on public.profiles;
drop policy if exists "admins read profiles" on public.profiles;

create policy "read own profile" on public.profiles
  for select using (id = auth.uid());

-- lets the site recreate a missing profile row for the signed-in user.
-- role is pinned to 'user' here: without that, anyone could insert their own
-- row as an admin and the update guard below would never see it.
create policy "insert own profile" on public.profiles
  for insert with check (id = auth.uid() and role = 'user');

create policy "update own profile" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy "admins read profiles" on public.profiles
  for select using (public.is_admin());

drop policy if exists "published tours are public" on public.tours;
drop policy if exists "admins manage tours"        on public.tours;

create policy "published tours are public" on public.tours
  for select using (published or public.is_admin());

create policy "admins manage tours" on public.tours
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- BACKFILL
-- Accounts created before the trigger existed have no profile row. This gives
-- every auth user one, and is harmless once they all have it.
-- ============================================================
insert into public.profiles (id, full_name)
select u.id, nullif(u.raw_user_meta_data->>'full_name', '')
from auth.users u
on conflict (id) do nothing;

-- ============================================================
-- MAKE YOURSELF AN ADMIN
-- Sign up through the site first, then edit the email below and run it.
-- ============================================================
-- insert into public.profiles (id, full_name, role)
-- select u.id, coalesce(u.raw_user_meta_data->>'full_name', 'Admin'), 'admin'
-- from auth.users u
-- where u.email = 'you@example.com'
-- on conflict (id) do update set role = 'admin';
