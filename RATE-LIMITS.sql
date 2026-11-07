-- Rate limits and input checks for bookings and chat. Run once in the Supabase
-- SQL editor. Safe to re-run: every object is dropped or replaced first.
--
-- What it does, block by block:
--   0. who is limited: a helper the triggers below share
--   1. bookings: only signed-in visitors may insert, and only as themselves
--   2. bookings: at most 5 requests an hour / 20 a day per account, sane
--      people and dates (same numbers as app/api/bookings/route.js)
--   3. chat_messages: message text must be 1..2000 characters
--   4. chat_messages: at most 10 visitor messages a minute / 60 an hour per
--      thread, and 5 stored auto-replies an hour per thread
--   5. chat_conversations: at most 5 new threads an hour per signed-in account,
--      and 100 an hour site-wide for guests
--
-- Read policies are not touched here.
--
-- A refused insert raises SQLSTATE PT429, which PostgREST answers as HTTP 429.
-- The message starts with "rate_limited" so the app can recognise it either way.
-- The site and the admin are never limited: rows written with the service role
-- key (the Telegram reply route), by an admin account, or from this SQL editor
-- pass straight through.
--
-- Existing data: nothing here rewrites or rejects rows that are already stored.
-- The triggers fire on INSERT only, and the length check in block 3 is added
-- NOT VALID (see the note there).


-- ============================================================
-- 0. WHO IS LIMITED
-- True for a request from the browser (the anon or authenticated role), unless
-- that account is an admin. False for the service role and for direct database
-- sessions such as this editor or pg_cron.
--
-- Two signals, because the triggers below are security definer: the role
-- PostgREST switched to ('role' setting) and the role inside the request's JWT.
-- Either one saying anon/authenticated is enough.
-- ============================================================
create or replace function public.rate_limited_caller()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (
      coalesce(current_setting('role', true), '') in ('anon', 'authenticated')
      or coalesce(auth.jwt() ->> 'role', '') in ('anon', 'authenticated')
    )
    and coalesce(auth.jwt() ->> 'role', '') <> 'service_role'
    and not public.is_admin();
$$;

-- only the triggers below need it (they run as the function owner); it is not
-- part of the public API
revoke execute on function public.rate_limited_caller() from public, anon, authenticated;


-- ============================================================
-- 1. BOOKINGS: NO ANONYMOUS INSERTS
-- The old policy allowed user_id is null, from when booking did not need an
-- account. Every booking now goes through /api/bookings, which requires a
-- signed-in visitor and always sets user_id to that account, so a row without
-- an owner can only come from someone posting to the database directly.
-- Admins keep their own "admins manage bookings" policy.
--
-- Note: supabase-schema.sql and RUN-THIS-IN-SUPABASE.sql still create the old
-- "anyone can request" policy. Re-running either of them brings it back
-- (policies are OR-ed), so run this file again after them.
-- ============================================================
drop policy if exists "anyone can request"  on public.bookings;
drop policy if exists "request own booking" on public.bookings;

create policy "request own booking" on public.bookings
  for insert to authenticated
  with check (user_id = auth.uid());


-- ============================================================
-- 2. BOOKINGS: REQUEST LIMITS AND SANE VALUES
-- The route checks all of this first and answers with a friendly message; this
-- trigger is the backstop for anyone inserting through the REST API with their
-- own token, which skips the route. Same numbers as the route; keep in step.
--
--  - created_at and status are set here, so a direct insert cannot backdate
--    itself out of the count or arrive already 'confirmed'.
--  - 5 per hour and 20 per 24 hours per account.
--  - people 1..50.
--  - wanted_date, when given, from today (Georgia time) to two years ahead.
--
-- The advisory lock makes two inserts from the same account wait for each
-- other, so a burst of parallel requests cannot all pass the same count.
-- ============================================================
create index if not exists bookings_user_idx on public.bookings (user_id, created_at desc);

create or replace function public.bookings_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  per_hour   constant integer := 5;
  per_day    constant integer := 20;
  max_people constant integer := 50;
  today      date := (now() at time zone 'Asia/Tbilisi')::date;
  n_hour     integer;
  n_day      integer;
begin
  if not public.rate_limited_caller() then
    return new;
  end if;

  new.created_at := now();
  new.status := 'new';

  if new.people is null or new.people < 1 or new.people > max_people then
    raise exception using errcode = '22023',
      message = format('people must be between 1 and %s', max_people);
  end if;

  if new.wanted_date is not null
     and (new.wanted_date < today or new.wanted_date > (today + interval '2 years')::date) then
    raise exception using errcode = '22023',
      message = 'wanted_date must be between today and two years ahead';
  end if;

  if new.user_id is null then
    return new;  -- the insert policy refuses it anyway
  end if;

  perform pg_advisory_xact_lock(hashtextextended('bookings:' || new.user_id::text, 0));

  select count(*) filter (where created_at > now() - interval '1 hour'),
         count(*)
    into n_hour, n_day
    from public.bookings
   where user_id = new.user_id
     and created_at > now() - interval '24 hours';

  if n_hour >= per_hour or n_day >= per_day then
    raise exception using errcode = 'PT429',
      message = 'rate_limited: too many booking requests',
      hint = 'Try again later.';
  end if;

  return new;
end;
$$;

drop trigger if exists bookings_rate_limit on public.bookings;
create trigger bookings_rate_limit
  before insert on public.bookings
  for each row execute function public.bookings_rate_limit();


-- ============================================================
-- 3. CHAT MESSAGES: LENGTH
-- Visitor and auto-reply text: 1..2000 characters, and not only whitespace.
-- The widget's input has maxLength 2000 and trims what it sends.
-- Team replies (sender 'admin') may run to 8000: a Telegram reply can be up to
-- 4096 characters, and cutting the team off mid-answer helps nobody.
--
-- NOT VALID: the check applies to every new row from now on but does not scan
-- the rows already stored, so the statement cannot fail on old data. Messages
-- are never updated by the app, and threads are deleted 24 hours after their
-- last message, so after a day every stored row satisfies it. To mark it
-- validated then (optional), first check nothing is left over:
--   select count(*) from public.chat_messages
--    where not (body ~ '\S' and char_length(body) <= case when sender = 'admin' then 8000 else 2000 end);
-- and if that is 0:
--   alter table public.chat_messages validate constraint chat_messages_body_length;
-- ============================================================
alter table public.chat_messages drop constraint if exists chat_messages_body_length;

alter table public.chat_messages
  add constraint chat_messages_body_length
  check (
    body ~ '\S'
    and char_length(body) <= case when sender = 'admin' then 8000 else 2000 end
  ) not valid;


-- ============================================================
-- 4. CHAT MESSAGES: PER-THREAD LIMITS
-- Visitor messages (sender 'user'): at most 10 in the last 60 seconds and 60
-- in the last hour per thread. Someone typing fast in short lines stays well
-- under; a script does not.
--
-- Auto-replies (sender 'bot') are not counted in those numbers, but the browser
-- is allowed to write them, so they get their own small cap (5 an hour per
-- thread; the widget stores at most one per page load) instead of being a way
-- around the limit above.
--
-- Team replies (sender 'admin') and anything from the service role, an admin
-- account or this editor are never limited.
--
-- created_at is set here so a direct insert cannot backdate itself out of the
-- count, or post-date itself to dodge the 24-hour chat expiry.
-- Counting uses the existing chat_messages_conv_idx (conversation_id, created_at).
-- ============================================================
create or replace function public.chat_messages_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  user_per_minute constant integer := 10;
  user_per_hour   constant integer := 60;
  bot_per_hour    constant integer := 5;
  n_minute        integer;
  n_hour          integer;
begin
  if new.sender = 'admin' or not public.rate_limited_caller() then
    return new;
  end if;

  new.created_at := now();

  perform pg_advisory_xact_lock(hashtextextended('chat:' || new.conversation_id::text, 0));

  if new.sender = 'user' then
    select count(*) filter (where created_at > now() - interval '60 seconds'),
           count(*)
      into n_minute, n_hour
      from public.chat_messages
     where conversation_id = new.conversation_id
       and sender = 'user'
       and created_at > now() - interval '1 hour';

    if n_minute >= user_per_minute or n_hour >= user_per_hour then
      raise exception using errcode = 'PT429',
        message = 'rate_limited: too many chat messages',
        hint = 'Wait a minute and try again.';
    end if;

  elsif new.sender = 'bot' then
    select count(*)
      into n_hour
      from public.chat_messages
     where conversation_id = new.conversation_id
       and sender = 'bot'
       and created_at > now() - interval '1 hour';

    if n_hour >= bot_per_hour then
      raise exception using errcode = 'PT429',
        message = 'rate_limited: too many automatic replies';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists chat_messages_rate_limit on public.chat_messages;
create trigger chat_messages_rate_limit
  before insert on public.chat_messages
  for each row execute function public.chat_messages_rate_limit();


-- ============================================================
-- 5. CHAT CONVERSATIONS: NEW-THREAD LIMITS
-- The per-thread limit above is easy to sidestep by opening a new thread, so
-- opening threads is limited too:
--  - a signed-in account (user_id set): at most 5 new threads an hour. The
--    widget keeps one thread per browser, so a real visitor opens one.
--  - guests (user_id null): at most 100 new threads an hour across the whole
--    site. Guests have no identity the database can see, and the insert
--    policy lets a signed-in visitor leave user_id empty too, so this shared
--    ceiling is what actually bounds a flood. It is far above normal traffic;
--    while someone is flooding, new guest chats are refused until the hour
--    rolls over (existing threads keep working). Raise it here if needed.
--
-- created_at and last_message_at are set here so a direct insert cannot hide
-- from the count or keep a thread from expiring.
-- ============================================================
create index if not exists chat_conversations_created_idx
  on public.chat_conversations (created_at desc);
create index if not exists chat_conversations_user_idx
  on public.chat_conversations (user_id, created_at desc)
  where user_id is not null;

create or replace function public.chat_conversations_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  per_user_hour  constant integer := 5;
  guest_per_hour constant integer := 100;
  n              integer;
begin
  if not public.rate_limited_caller() then
    return new;
  end if;

  new.created_at := now();
  new.last_message_at := now();

  if new.user_id is not null then
    perform pg_advisory_xact_lock(hashtextextended('chat-conv:' || new.user_id::text, 0));

    select count(*) into n
      from public.chat_conversations
     where user_id = new.user_id
       and created_at > now() - interval '1 hour';

    if n >= per_user_hour then
      raise exception using errcode = 'PT429',
        message = 'rate_limited: too many new chats',
        hint = 'Try again later.';
    end if;
  else
    perform pg_advisory_xact_lock(hashtextextended('chat-conv:guests', 0));

    select count(*) into n
      from public.chat_conversations
     where user_id is null
       and created_at > now() - interval '1 hour';

    if n >= guest_per_hour then
      raise exception using errcode = 'PT429',
        message = 'rate_limited: too many new chats',
        hint = 'Try again later.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists chat_conversations_rate_limit on public.chat_conversations;
create trigger chat_conversations_rate_limit
  before insert on public.chat_conversations
  for each row execute function public.chat_conversations_rate_limit();
