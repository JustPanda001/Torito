-- Chat privacy: a visitor can read and write only their OWN chat thread.
-- Run once in the Supabase SQL editor. Safe to re-run: every object is
-- replaced or dropped first. Nothing here touches stored rows.
--
-- The leak this closes: the old policies let anyone holding the public anon key
--   - SELECT every row of chat_conversations (names, emails, pages) and
--     chat_messages (every question ever asked), with `using (true)`, and
--   - INSERT a message into ANY conversation (the check only looked at sender).
--
-- After this file:
--   - Guests (no account) have no table access at all. The widget goes through
--     three security-definer functions that take the conversation uuid:
--       start_chat(page)                      -> new thread, returns its uuid
--       send_chat_message(conv, body, sender) -> post as 'user' or 'bot'
--       get_chat(conv, after)                 -> the thread's messages, or null
--     The uuid (kept in the visitor's localStorage) is the guest's proof of
--     ownership. Nobody can list uuids any more, so nobody can find someone
--     else's thread.
--   - A thread started by a signed-in visitor gets user_id = that account and
--     is readable/writable only with that account's session (the uuid alone is
--     not enough). They can also SELECT their own rows directly.
--   - Admins (public.is_admin()) keep full access, so the /chat inbox, its
--     replies and its realtime feed work as before.
--   - The service role (Telegram reply route, chat-notify) bypasses RLS as before.
--
-- Rate limits (RATE-LIMITS.sql) still apply to inserts made through these
-- functions. The BEFORE INSERT triggers call public.rate_limited_caller(), which
-- looks at current_setting('role') and auth.jwt(). SECURITY DEFINER only switches
-- current_user for the duration of the call; it does not change the 'role'
-- setting PostgREST set for the request (still 'anon' / 'authenticated'), and the
-- request's JWT claims stay set too, so both signals still see the browser caller.
-- The functions below set only search_path, never role.
--
-- Rollout. The site's widget code must match this file:
--   - Simplest: run the whole file, then deploy the new components/ChatWidget.js
--     right away. Between the two, the old widget cannot read or post.
--   - No gap: run PART A, deploy the widget, then run PART B. PART A only adds
--     functions; the old widget keeps working until PART B.
--
-- supabase-schema.sql and RUN-THIS-IN-SUPABASE.sql carry the same chat block,
-- so re-running either of them does not reopen the leak. Keep the three in step.


-- ============================================================
-- PART A. FUNCTIONS THE WIDGET CALLS
-- ============================================================

-- Opens a thread. user_id, name and email come from the caller's own session,
-- never from the browser, so nobody can open a thread in someone else's name.
create or replace function public.start_chat(p_page text default null)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  uid    uuid := auth.uid();
  v_name text;
  v_mail text;
  new_id uuid;
begin
  if uid is not null then
    select coalesce(nullif(p.full_name, ''), nullif(u.raw_user_meta_data->>'full_name', '')),
           u.email
      into v_name, v_mail
      from auth.users u
      left join public.profiles p on p.id = u.id
     where u.id = uid;
  end if;

  -- the chat_conversations_rate_limit trigger (RATE-LIMITS.sql) runs here
  insert into public.chat_conversations (user_id, display_name, email, page)
  values (uid, v_name, v_mail, left(nullif(p_page, ''), 300))
  returning id into new_id;

  return new_id;
end;
$$;

-- Posts into a thread the caller owns: a guest thread (user_id null) for whoever
-- holds its uuid, or a signed-in visitor's thread for that account only.
-- 'admin' is refused: team replies come from the inbox (is_admin policy) or the
-- Telegram route (service role).
-- A missing, expired or not-yours thread all answer 'chat_not_found', so the
-- answer does not reveal whether a uuid exists.
create or replace function public.send_chat_message(
  p_conversation uuid,
  p_body         text,
  p_sender       text default 'user'
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  if p_sender is null or p_sender not in ('user', 'bot') then
    raise exception using errcode = '22023', message = 'sender must be user or bot';
  end if;

  if not exists (
    select 1 from public.chat_conversations c
     where c.id = p_conversation
       and (c.user_id is null or c.user_id = auth.uid())
  ) then
    raise exception using errcode = 'P0002', message = 'chat_not_found';
  end if;

  -- chat_messages_body_length, chat_messages_rate_limit and chat_messages_touch
  -- all run here as for a direct insert
  insert into public.chat_messages (conversation_id, sender, body)
  values (p_conversation, p_sender, p_body)
  returning id into new_id;

  return new_id;
end;
$$;

-- Reads a thread the caller owns (same rule as above).
-- Returns null when there is no such thread for this caller, otherwise a json
-- array of {id, sender, body, created_at}, oldest first ([] for an empty one).
-- p_after, when given, limits it to messages created at or after that moment,
-- so the widget's poll stays small.
create or replace function public.get_chat(
  p_conversation uuid,
  p_after        timestamptz default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.chat_conversations c
     where c.id = p_conversation
       and (c.user_id is null or c.user_id = auth.uid())
  ) then
    return null;
  end if;

  return coalesce((
    select jsonb_agg(
             jsonb_build_object('id', m.id, 'sender', m.sender, 'body', m.body, 'created_at', m.created_at)
             order by m.created_at, m.id)
      from public.chat_messages m
     where m.conversation_id = p_conversation
       and (p_after is null or m.created_at >= p_after)
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.start_chat(text)                    from public;
revoke all on function public.send_chat_message(uuid, text, text) from public;
revoke all on function public.get_chat(uuid, timestamptz)         from public;

grant execute on function public.start_chat(text)                    to anon, authenticated;
grant execute on function public.send_chat_message(uuid, text, text) to anon, authenticated;
grant execute on function public.get_chat(uuid, timestamptz)         to anon, authenticated;


-- ============================================================
-- PART B. CLOSE THE TABLES
-- Policies are OR-ed, so every old permissive policy is dropped by name.
-- No insert policy is left for non-admins: visitors write only through the
-- functions above.
-- ============================================================
alter table public.chat_conversations enable row level security;
alter table public.chat_messages      enable row level security;

-- old names (the leak) and the new names, so this can run any number of times
drop policy if exists "start a conversation"     on public.chat_conversations;
drop policy if exists "read own conversation"    on public.chat_conversations;
drop policy if exists "owner reads conversation" on public.chat_conversations;
drop policy if exists "admins manage chats"      on public.chat_conversations;
drop policy if exists "write own messages"       on public.chat_messages;
drop policy if exists "read conversation"        on public.chat_messages;
drop policy if exists "owner reads messages"     on public.chat_messages;
drop policy if exists "admins manage messages"   on public.chat_messages;

-- a signed-in visitor sees the threads opened under their own account
create policy "owner reads conversation" on public.chat_conversations
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "admins manage chats" on public.chat_conversations
  for all using (public.is_admin()) with check (public.is_admin());

create policy "owner reads messages" on public.chat_messages
  for select to authenticated
  using (exists (
    select 1 from public.chat_conversations c
     where c.id = conversation_id
       and c.user_id = (select auth.uid())
  ));

create policy "admins manage messages" on public.chat_messages
  for all using (public.is_admin()) with check (public.is_admin());


-- ============================================================
-- CHECK (optional, read-only). Paste separately after running the above.
-- Each block pretends to be a guest browser and rolls back, so nothing is kept.
-- ============================================================
-- begin;
--   set local role anon;
--   select set_config('request.jwt.claims', '{"role":"anon"}', true);
--   select count(*) from public.chat_conversations;   -- expect 0
--   select count(*) from public.chat_messages;        -- expect 0
-- rollback;
--
-- -- needs at least one existing thread
-- begin;
--   select set_config('test.conv', (select id::text from public.chat_conversations limit 1), true);
--   set local role anon;
--   select set_config('request.jwt.claims', '{"role":"anon"}', true);
--   insert into public.chat_messages (conversation_id, sender, body)
--   values (current_setting('test.conv')::uuid, 'user', 'x');
--   -- expect: ERROR new row violates row-level security policy
-- rollback;
