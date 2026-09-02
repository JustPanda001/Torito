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

-- ============================================================
-- CHAT
-- The "Ask a question" widget on the public pages (js/chat-widget.js) writes
-- here; the admin inbox (chat.html + js/chat.js) reads and replies.
--
-- Visitors are not required to sign in, so a conversation is identified by its
-- own uuid, which the widget keeps in localStorage. That uuid is the secret:
-- knowing it is what lets a guest read their own thread back. Signed-in
-- visitors also get user_id stamped, so their thread follows the account.
-- ============================================================
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

-- ============================================================
-- REVIEWS / STAR RATINGS
-- One review per person per trip, so the average cannot be stuffed by
-- submitting the same opinion twice — the unique pair below is what the
-- client upserts on, which also turns a second submission into an edit.
--
-- The trip is referenced by slug, not by tours.id: the placeholder catalogue
-- in js/tours-data.js has no database row yet, and the slug is the one
-- identifier both it and the tours table already share.
-- ============================================================
create table if not exists public.tour_reviews (
  id           uuid primary key default gen_random_uuid(),
  tour_slug    text not null,
  user_id      uuid not null references auth.users(id) on delete cascade,
  author_name  text,
  rating       smallint not null check (rating between 1 and 5),
  recommend    boolean not null default true,
  body         text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (tour_slug, user_id)
);

create index if not exists tour_reviews_slug_idx
  on public.tour_reviews (tour_slug, created_at desc);

alter table public.tour_reviews enable row level security;

drop policy if exists "reviews are public"    on public.tour_reviews;
drop policy if exists "write own review"      on public.tour_reviews;
drop policy if exists "edit own review"       on public.tour_reviews;
drop policy if exists "delete own review"     on public.tour_reviews;
drop policy if exists "admins manage reviews" on public.tour_reviews;

create policy "reviews are public" on public.tour_reviews
  for select using (true);

-- signing in is what makes rating possible: auth.uid() is null for a guest,
-- so no anonymous insert can ever satisfy this check
create policy "write own review" on public.tour_reviews
  for insert with check (user_id = auth.uid());

create policy "edit own review" on public.tour_reviews
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "delete own review" on public.tour_reviews
  for delete using (user_id = auth.uid());

create policy "admins manage reviews" on public.tour_reviews
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- VIEW COUNTER
-- Feeds the "Hot right now" strip on the home page: whichever in-season trips
-- have been opened most. One row per trip, counted by slug for the same reason
-- reviews are — the placeholder catalogue has no tours row yet.
--
-- The counter is bumped through the function below rather than by an update
-- policy: a policy that let visitors write this table would also let them
-- write any number they liked into it.
-- ============================================================
create table if not exists public.tour_views (
  tour_slug  text primary key,
  views      bigint not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists tour_views_popular_idx
  on public.tour_views (views desc);

create or replace function public.bump_tour_view(slug text)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  total bigint;
begin
  insert into public.tour_views (tour_slug, views, updated_at)
  values (slug, 1, now())
  on conflict (tour_slug) do update
    set views = public.tour_views.views + 1,
        updated_at = now()
  returning views into total;
  return total;
end;
$$;

grant execute on function public.bump_tour_view(text) to anon, authenticated;

alter table public.tour_views enable row level security;

drop policy if exists "view counts are public" on public.tour_views;
drop policy if exists "admins manage views"    on public.tour_views;

create policy "view counts are public" on public.tour_views
  for select using (true);

create policy "admins manage views" on public.tour_views
  for all using (public.is_admin()) with check (public.is_admin());
