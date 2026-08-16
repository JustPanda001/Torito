-- Torito — chat tables.
-- Paste this whole file into the Supabase SQL editor and press Run.
-- Safe to run more than once.

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
