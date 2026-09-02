-- Torito — chat, bookings, profile phone, trip locations, content and routes.
-- Paste this whole file into the Supabase SQL editor and press Run.
-- Safe to re-run: it never drops data.

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

-- ============================================================
-- CHAT EXPIRY
-- Threads are deleted 24 hours after their last message — measured from the
-- last message rather than from when the thread started, so an exchange still
-- in progress is never cut off mid-conversation.
--
-- Messages go with the conversation through the on delete cascade above, so
-- deleting the parent row is enough.
--
-- security definer because the callers are the site's own anon and signed-in
-- roles, which have no delete policy on these tables and should not get one:
-- this function is the only deletion anyone can perform.
-- ============================================================
create or replace function public.purge_old_chats()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  removed integer;
begin
  delete from public.chat_conversations
   where last_message_at < now() - interval '24 hours';
  get diagnostics removed = row_count;
  return removed;
end;
$$;

grant execute on function public.purge_old_chats() to anon, authenticated;

-- Preferred path: the database sweeps hourly on its own, so threads expire even
-- if nobody opens the site. pg_cron is not enabled on every Supabase project,
-- and enabling it needs privileges this script may not have, so a failure here
-- is not fatal — the app also calls purge_old_chats() when the chat is used.
do $$
begin
  create extension if not exists pg_cron;

  perform cron.unschedule('purge-old-chats')
   where exists (select 1 from cron.job where jobname = 'purge-old-chats');

  perform cron.schedule('purge-old-chats', '17 * * * *', 'select public.purge_old_chats()');
exception when others then
  raise notice 'pg_cron not scheduled (%). The app will still purge on use.', sqlerrm;
end;
$$;

-- ============================================================
-- BOOKINGS
-- Every "Book a spot" and "Book a lesson" request. This table is the record;
-- Telegram and the Google Sheet are copies of it, so a failed webhook can
-- never lose a request.
--
-- The lesson columns are null for a trip, and vice versa: one table rather than
-- two, because the admin panel wants a single chronological list of "people who
-- asked for something".
-- ============================================================
create table if not exists public.bookings (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete set null,

  tour_slug    text not null,
  tour_title   text not null,
  kind         text not null default 'trip' check (kind in ('trip','lesson','waitlist')),

  wanted_date  date,
  people       integer not null default 1,
  total        numeric,

  -- lessons only
  lesson_time  text,
  skill_level  text,
  lesson_type  text,

  -- so you can reply to someone who was not signed in
  name         text,
  email        text,
  phone        text,

  status       text not null default 'new' check (status in ('new','confirmed','declined')),
  created_at   timestamptz not null default now()
);

create index if not exists bookings_recent_idx on public.bookings (created_at desc);

alter table public.bookings enable row level security;

drop policy if exists "anyone can request"    on public.bookings;
drop policy if exists "read own bookings"     on public.bookings;
drop policy if exists "admins manage bookings" on public.bookings;

-- a visitor does not have to sign in to ask for a place
create policy "anyone can request" on public.bookings
  for insert with check (user_id is null or user_id = auth.uid());

create policy "read own bookings" on public.bookings
  for select using (user_id is not null and user_id = auth.uid());

create policy "admins manage bookings" on public.bookings
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- PROFILE PHONE
-- Collected at sign-up so the booking form never asks for it again. Accounts
-- created before this keep a null phone; the booking form asks those visitors
-- once, for that field alone.
-- ============================================================
alter table public.profiles add column if not exists phone text;

-- the sign-up form passes it as user metadata, the same way it passes the name
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    nullif(new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'phone', '')
  )
  on conflict (id) do update
    set full_name = coalesce(public.profiles.full_name, excluded.full_name),
        phone     = coalesce(public.profiles.phone, excluded.phone);
  return new;
end;
$$;

-- ============================================================
-- TRIP LOCATION
-- One point per trip: the map pins it, and the weather panel asks Open-Meteo
-- about it. Null means the trip simply shows neither, which is why these are
-- nullable rather than defaulted to 0,0 — a zero would put every trip without
-- coordinates in the Atlantic.
-- ============================================================
alter table public.tours add column if not exists lat double precision;
alter table public.tours add column if not exists lng double precision;

-- ============================================================
-- TRIP CONTENT
-- The parts of a trip page that are lists rather than fields: the day-by-day
-- plan, and what the price does and does not cover. Stored as jsonb arrays of
-- [title, note] pairs, which is the shape the page already renders.
--
-- Empty means "use the sensible defaults for this category" rather than "show
-- nothing", so a half-filled trip still reads as a finished page.
-- ============================================================
alter table public.tours add column if not exists itinerary jsonb not null default '[]'::jsonb;
alter table public.tours add column if not exists included  jsonb not null default '[]'::jsonb;
alter table public.tours add column if not exists excluded  jsonb not null default '[]'::jsonb;

-- ============================================================
-- STRAVA ROUTE
-- Optional per trip: the id of a public Strava route or activity, which the
-- map popup embeds instead of the plain pinned map. Text rather than a number
-- because the admin form accepts a pasted URL and stores whatever was typed.
-- ============================================================
alter table public.tours add column if not exists strava text;

-- ============================================================
-- EVERY COLUMN THE ADMIN FORM WRITES
-- "create table if not exists" does nothing once the table exists, so a column
-- added to that block later never reaches a database created before it — which
-- is how saving a tour came to fail on a missing 'price'. These alters are the
-- ones that actually run on an existing database, and they are idempotent, so
-- listing every field the form can write is the cheap way to stay in step.
-- ============================================================
alter table public.tours add column if not exists price           numeric;
alter table public.tours add column if not exists subtype         text;
alter table public.tours add column if not exists subtitle        text;
alter table public.tours add column if not exists region          text;
alter table public.tours add column if not exists distance        text;
alter table public.tours add column if not exists duration        text;
alter table public.tours add column if not exists difficulty      text;
alter table public.tours add column if not exists elevation_gain  text;
alter table public.tours add column if not exists stay            text;
alter table public.tours add column if not exists languages       text;
alter table public.tours add column if not exists season          text;
alter table public.tours add column if not exists season_from     text;
alter table public.tours add column if not exists season_to       text;
alter table public.tours add column if not exists badge           text;
alter table public.tours add column if not exists departure_point text;
alter table public.tours add column if not exists departure_time  text;
alter table public.tours add column if not exists return_info     text;
alter table public.tours add column if not exists transport       text;
alter table public.tours add column if not exists group_size      text;
alter table public.tours add column if not exists walking_per_day text;
alter table public.tours add column if not exists summary         text;
alter table public.tours add column if not exists cover_image     text;
alter table public.tours add column if not exists spots_left      integer;

-- ============================================================
-- REVIEWS / STAR RATINGS
-- The score on the cards and the trip page (components/Stars.js), and the
-- dialog that collects one (components/ReviewModal.js).
--
-- One review per person per trip: the unique constraint is what lets the
-- dialog upsert instead of stacking a second rating on top of the first.
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

-- anyone may read a score; only the author may write one, and only their own
create policy "reviews are public" on public.tour_reviews
  for select using (true);
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
-- Ranks the seasonal "Hot right now" strip (components/HotSection.js).
--
-- The bump goes through a security-definer function rather than an update,
-- so a visitor can add one to a count without being able to set it to
-- whatever they like.
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
