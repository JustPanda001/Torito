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
  -- ordered public URLs from the tour-photos bucket; cover_image is whichever
  -- one the admin starred
  gallery         text[] not null default '{}',
  published       boolean not null default true,
  created_at      timestamptz not null default now()
);

-- for projects created before the photo manager existed
alter table public.tours add column if not exists gallery text[] not null default '{}';

create index if not exists tours_published_created_idx
  on public.tours (published, created_at desc);

-- ============================================================
-- FAVOURITES
-- One row per (person, trip). The slug is stored rather than a foreign key to
-- tours.id so a saved trip survives the placeholder catalogue being replaced by
-- real database rows.
-- ============================================================
create table if not exists public.favorites (
  user_id    uuid not null references auth.users(id) on delete cascade,
  tour_slug  text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, tour_slug)
);

-- ============================================================
-- TOUR OPTIONS
-- The choices behind the admin dropdowns (difficulty, languages, departure
-- point, transport...). Kept in a table rather than hard-coded so an admin can
-- add a new departure point without a code change.
-- ============================================================
create table if not exists public.tour_options (
  field      text not null,
  value      text not null,
  created_at timestamptz not null default now(),
  primary key (field, value)
);

-- seeded from the placeholder catalogue; harmless to re-run
insert into public.tour_options (field, value) values
  ('difficulty', 'Easy'), ('difficulty', 'Moderate'), ('difficulty', 'Medium'), ('difficulty', 'Hard'),
  ('languages', 'EN'), ('languages', 'EN · GE'), ('languages', 'EN · GE · RU'),
  ('departure_point', 'Tbilisi, Liberty Square'), ('departure_point', 'Tbilisi, Station Square'),
  ('departure_point', 'Kutaisi Airport'), ('departure_point', 'Batumi, Piazza'),
  ('transport', 'Minibus'), ('transport', 'Minibus + 4x4'), ('transport', 'Minibus + 4x4 to trailhead'),
  ('transport', '4x4 only'), ('transport', 'Private car'),
  ('stay', 'Guesthouse'), ('stay', 'Hotel'), ('stay', 'Tents'), ('stay', 'Day trip')
on conflict (field, value) do nothing;

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
alter table public.profiles     enable row level security;
alter table public.tours        enable row level security;
alter table public.favorites    enable row level security;
alter table public.tour_options enable row level security;

-- Options are readable by anyone (the admin form needs them before the role is
-- known) but only an admin can add or remove one.
drop policy if exists "read options"   on public.tour_options;
drop policy if exists "admins manage options" on public.tour_options;

create policy "read options" on public.tour_options
  for select using (true);

create policy "admins manage options" on public.tour_options
  for all using (public.is_admin()) with check (public.is_admin());

-- Favourites are private: each person sees and changes only their own rows.
-- Without the user_id = auth.uid() check, one customer could read everyone
-- else's saved trips.
drop policy if exists "read own favorites"   on public.favorites;
drop policy if exists "add own favorites"    on public.favorites;
drop policy if exists "remove own favorites" on public.favorites;

create policy "read own favorites" on public.favorites
  for select using (user_id = auth.uid());

create policy "add own favorites" on public.favorites
  for insert with check (user_id = auth.uid());

create policy "remove own favorites" on public.favorites
  for delete using (user_id = auth.uid());

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
-- STORAGE: tour-photos
-- Create the bucket first (Storage > New bucket > tour-photos > Public).
-- Public only governs reading; these decide who may put files in it.
-- ============================================================
drop policy if exists "public read tour photos"    on storage.objects;
drop policy if exists "admins upload tour photos"  on storage.objects;
drop policy if exists "admins replace tour photos" on storage.objects;
drop policy if exists "admins delete tour photos"  on storage.objects;

create policy "public read tour photos" on storage.objects
  for select using (bucket_id = 'tour-photos');

create policy "admins upload tour photos" on storage.objects
  for insert with check (bucket_id = 'tour-photos' and public.is_admin());

create policy "admins replace tour photos" on storage.objects
  for update using (bucket_id = 'tour-photos' and public.is_admin());

create policy "admins delete tour photos" on storage.objects
  for delete using (bucket_id = 'tour-photos' and public.is_admin());

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

-- ============================================================
-- CHAT
-- The "Ask a question" widget (components/ChatWidget.js) writes
-- here; the admin inbox (app/chat/page.js) reads and replies.
--
-- Visitors are not required to sign in, so a conversation is identified by its
-- own uuid, which the widget keeps in localStorage. That uuid is the secret:
-- knowing it is what lets a guest read their own thread back. Signed-in
-- visitors also get user_id stamped, so their thread follows the account.
create table if not exists public.chat_conversations (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete set null,
  display_name    text,
  email           text,
  page            text,
  last_message_at timestamptz not null default now(),
  admin_unread    boolean not null default false,
  created_at      timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  sender          text not null check (sender in ('user','admin','bot')),
  body            text not null,
  created_at      timestamptz not null default now()
);

create index if not exists chat_messages_conv_idx
  on public.chat_messages (conversation_id, created_at);
create index if not exists chat_conversations_recent_idx
  on public.chat_conversations (last_message_at desc);

-- keep the conversation's ordering column and unread flag in step with its
-- messages, so the inbox can sort without a join
create or replace function public.touch_conversation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.chat_conversations
     set last_message_at = new.created_at,
         admin_unread    = case when new.sender = 'admin' then false
                                when new.sender = 'user'  then true
                                else admin_unread end
   where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists chat_messages_touch on public.chat_messages;
create trigger chat_messages_touch
  after insert on public.chat_messages
  for each row execute function public.touch_conversation();

alter table public.chat_conversations enable row level security;
alter table public.chat_messages      enable row level security;

drop policy if exists "start a conversation"    on public.chat_conversations;
drop policy if exists "read own conversation"   on public.chat_conversations;
drop policy if exists "admins manage chats"     on public.chat_conversations;
drop policy if exists "write own messages"      on public.chat_messages;
drop policy if exists "read conversation"       on public.chat_messages;
drop policy if exists "admins manage messages"  on public.chat_messages;

-- anyone may open a thread; only an admin may claim a row as someone else's
create policy "start a conversation" on public.chat_conversations
  for insert with check (user_id is null or user_id = auth.uid());

-- a guest fetches their thread by its uuid, which only they hold
create policy "read own conversation" on public.chat_conversations
  for select using (true);

create policy "admins manage chats" on public.chat_conversations
  for all using (public.is_admin()) with check (public.is_admin());

-- visitors may only ever post as themselves; 'admin' messages are gated
create policy "write own messages" on public.chat_messages
  for insert with check (sender in ('user','bot'));

create policy "read conversation" on public.chat_messages
  for select using (true);

create policy "admins manage messages" on public.chat_messages
  for all using (public.is_admin()) with check (public.is_admin());
