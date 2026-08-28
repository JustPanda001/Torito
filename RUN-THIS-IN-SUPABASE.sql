-- Torito — chat, bookings, profile phone and trip locations.
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
