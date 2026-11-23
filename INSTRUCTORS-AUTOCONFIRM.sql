-- Instructors, auto-confirm and the slot guard (2026-11-23).
--
-- Additive only: new columns, a new table, new functions, one new trigger and
-- one pg_cron job. Nothing existing is dropped or rewritten. Safe to re-run.
--
--   tours.auto_confirm          a new request is confirmed ~40 s after it lands
--   tours.assign_instructors    a new request gets an instructor from the roster
--   bookings.instructor_id      who teaches it (null = unassigned)
--   bookings.auto_confirm_at    when the auto-confirm is due; cleared once done
--   instructors                 the roster, edited on /admin/instructors
--   assign_instructor()         picks the instructor (see the rules below)
--   bookings_capacity_guard     re-checks "Groups at the same time" inside the
--                               insert, so two people pressing Book at the same
--                               moment cannot both take the last place
--   cron 'auto-confirm-bookings' every minute, asks the site to confirm what is due

-- ---------------------------------------------------------------- columns

alter table public.tours add column if not exists auto_confirm boolean not null default false;
alter table public.tours add column if not exists assign_instructors boolean not null default false;

-- only the Gudauri lessons, as the owner asked; every other trip stays manual
update public.tours set auto_confirm = true, assign_instructors = true
where slug = 'gudauri-lessons' and auto_confirm = false and assign_instructors = false;

-- ---------------------------------------------------------------- roster

create table if not exists public.instructors (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  discipline text not null check (discipline in ('ski', 'snowboard')),
  -- lower rank is asked first; instructors with the same rank share lessons
  -- equally (fewest hours this season first, then position)
  rank integer not null default 1 check (rank between 1 and 99),
  position integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.instructors enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'instructors' and policyname = 'admins manage instructors') then
    create policy "admins manage instructors" on public.instructors
      for all using (public.is_admin()) with check (public.is_admin());
  end if;
end $$;
revoke all on public.instructors from anon;
grant select, insert, update, delete on public.instructors to authenticated;
revoke truncate, references, trigger on public.instructors from authenticated;

-- the starting roster; helper names are placeholders, renamed in admin
insert into public.instructors (name, discipline, rank, position)
select v.name, v.discipline, v.rank, v.position
from (values
  ('Saba', 'ski', 1, 1), ('Luka', 'ski', 2, 2),
  ('Ski helper 1', 'ski', 3, 3), ('Ski helper 2', 'ski', 4, 4), ('Ski helper 3', 'ski', 5, 5),
  ('Sandro', 'snowboard', 1, 1), ('Gio', 'snowboard', 1, 2),
  ('Snowboard helper 1', 'snowboard', 2, 3), ('Snowboard helper 2', 'snowboard', 3, 4), ('Snowboard helper 3', 'snowboard', 4, 5)
) as v(name, discipline, rank, position)
where not exists (select 1 from public.instructors);

alter table public.bookings add column if not exists instructor_id uuid
  references public.instructors(id) on delete set null;
alter table public.bookings add column if not exists auto_confirm_at timestamptz;
create index if not exists bookings_instructor_idx on public.bookings (instructor_id) where instructor_id is not null;
create index if not exists bookings_auto_confirm_idx on public.bookings (auto_confirm_at) where auto_confirm_at is not null;

-- ---------------------------------------------------------------- helpers
-- Same readings of the answers as booked_slots(): "Hours" and "Days" are whole
-- numbers in the answers map, 1 when missing; days are capped at 30.

create or replace function public.booking_hours(p_answers jsonb) returns integer
language sql immutable set search_path = public as $$
  select case when (p_answers->>'Hours') ~ '^[0-9]{1,2}$'
              then greatest((p_answers->>'Hours')::integer, 1) else 1 end;
$$;

create or replace function public.booking_days(p_answers jsonb) returns integer
language sql immutable set search_path = public as $$
  select case when (p_answers->>'Days') ~ '^[0-9]{1,2}$'
              then least(greatest((p_answers->>'Days')::integer, 1), 30) else 1 end;
$$;

-- "10:00" -> 600; null for anything that is not a clock time
create or replace function public.time_minutes(p_time text) returns integer
language sql immutable set search_path = public as $$
  select case when p_time ~ '^\s*[0-9]{1,2}:[0-9]{2}'
              then split_part(btrim(p_time), ':', 1)::integer * 60
                   + substring(split_part(btrim(p_time), ':', 2) from 1 for 2)::integer end;
$$;

-- 'ski' / 'snowboard' from the answer to the "SKI OR SNOWBOARD" question (any
-- wording of the question works: it reads the answer), null when neither
create or replace function public.booking_discipline(p_answers jsonb) returns text
language sql immutable set search_path = public as $$
  select case
    when jsonb_typeof(p_answers) is distinct from 'object' then null
    when exists (select 1 from jsonb_each_text(p_answers) e where e.value ~* '^\s*snow\s*board') then 'snowboard'
    when exists (select 1 from jsonb_each_text(p_answers) e where e.value ~* '^\s*ski(s|ing|er)?\s*$') then 'ski'
  end;
$$;

-- True when the instructor has no live booking that overlaps these days and
-- hours. Cancelled, declined and waitlist rows never hold an instructor.
create or replace function public.instructor_free(
  p_instructor uuid, p_date date, p_days integer, p_start integer, p_end integer, p_exclude uuid
) returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (
    select 1 from public.bookings o
    where o.instructor_id = p_instructor
      and o.id is distinct from p_exclude
      and o.status not in ('declined', 'cancelled')
      and o.kind <> 'waitlist'
      and o.wanted_date is not null
      -- the two runs of days share at least one day
      and o.wanted_date <= p_date + (greatest(p_days, 1) - 1)
      and o.wanted_date + (public.booking_days(o.answers) - 1) >= p_date
      -- and the hours overlap; a row without a time holds the whole day
      and coalesce(public.time_minutes(o.lesson_time), 0) < p_end
      and coalesce(public.time_minutes(o.lesson_time) + public.booking_hours(o.answers) * 60, 24 * 60) > p_start
  );
$$;

-- Hours an instructor teaches in the season (1 July – 30 June) holding p_date.
create or replace function public.instructor_season_hours(p_instructor uuid, p_date date, p_exclude uuid)
returns integer
language sql stable security definer set search_path = public as $$
  select coalesce(sum(public.booking_hours(o.answers) * public.booking_days(o.answers)), 0)::integer
  from public.bookings o
  where o.instructor_id = p_instructor
    and o.id is distinct from p_exclude
    and o.status not in ('declined', 'cancelled')
    and o.kind <> 'waitlist'
    and o.wanted_date >= make_date(extract(year from p_date)::integer - case when extract(month from p_date) < 7 then 1 else 0 end, 7, 1)
    and o.wanted_date < make_date(extract(year from p_date)::integer - case when extract(month from p_date) < 7 then 1 else 0 end, 7, 1) + interval '1 year';
$$;

-- Picks and stores the instructor for one booking. Rules (owner, 2026-11-23):
--   ski        Saba whenever he is free, then Luka, then Ski helper 1, 2, 3
--   snowboard  Sandro and Gio share equally (fewer hours this season first,
--              tie -> Sandro), then Snowboard helper 1, 2, 3
-- i.e. lowest rank first; inside a rank, fewest season hours, then position.
-- Nobody free -> instructor_id stays null and the caller sends an alert.
-- p_force re-picks a booking that already has one (admin "Auto-assign").
-- A lock serialises assignments, so two bookings at once never share a slot.
create or replace function public.assign_instructor(p_booking uuid, p_force boolean default false)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  b public.bookings;
  disc text;
  s integer;
  e integer;
  nd integer;
  pick record;
begin
  perform pg_advisory_xact_lock(hashtext('mtani.assign_instructor'));

  select * into b from public.bookings where id = p_booking for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not found');
  end if;

  disc := public.booking_discipline(b.answers);
  if b.instructor_id is not null and not p_force then
    return jsonb_build_object('ok', true, 'already', true, 'discipline', disc,
      'instructor_id', b.instructor_id,
      'name', (select name from public.instructors where id = b.instructor_id));
  end if;

  s := public.time_minutes(b.lesson_time);
  if b.status in ('declined', 'cancelled') or b.kind = 'waitlist' or b.wanted_date is null or s is null or disc is null then
    return jsonb_build_object('ok', false, 'discipline', disc, 'instructor_id', null, 'name', null,
      'reason', case when disc is null then 'no discipline' when s is null then 'no time' else 'not assignable' end);
  end if;
  e := s + public.booking_hours(b.answers) * 60;
  nd := public.booking_days(b.answers);

  select i.id, i.name into pick
  from public.instructors i
  where i.active and i.discipline = disc
    and public.instructor_free(i.id, b.wanted_date, nd, s, e, b.id)
  order by i.rank, public.instructor_season_hours(i.id, b.wanted_date, b.id), i.position, i.created_at
  limit 1;

  update public.bookings set instructor_id = pick.id where id = b.id;
  return jsonb_build_object('ok', pick.id is not null, 'discipline', disc,
    'instructor_id', pick.id, 'name', pick.name,
    'reason', case when pick.id is null then 'nobody free' end);
end;
$$;

-- For the admin's manual pick: true when that instructor already teaches at
-- an overlapping time (the change is still saved; the admin is warned).
create or replace function public.instructor_clash(p_booking uuid, p_instructor uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select not public.instructor_free(p_instructor, b.wanted_date, public.booking_days(b.answers),
           public.time_minutes(b.lesson_time),
           public.time_minutes(b.lesson_time) + public.booking_hours(b.answers) * 60, b.id)
  from public.bookings b
  where b.id = p_booking and b.wanted_date is not null and public.time_minutes(b.lesson_time) is not null;
$$;

revoke all on function public.assign_instructor(uuid, boolean) from public, anon, authenticated;
revoke all on function public.instructor_clash(uuid, uuid) from public, anon, authenticated;
revoke all on function public.instructor_free(uuid, date, integer, integer, integer, uuid) from public, anon, authenticated;
revoke all on function public.instructor_season_hours(uuid, date, uuid) from public, anon, authenticated;
grant execute on function public.assign_instructor(uuid, boolean) to service_role;
grant execute on function public.instructor_clash(uuid, uuid) to service_role;
grant execute on function public.instructor_free(uuid, date, integer, integer, integer, uuid) to service_role;
grant execute on function public.instructor_season_hours(uuid, date, uuid) to service_role;

-- ---------------------------------------------------------------- slot guard
-- The booking route checks booked_slots() and then inserts: two requests at
-- the same moment can both pass the check. This repeats the same rule inside
-- the insert, under a per-trip lock, so the second one is refused. Same rule
-- as lib/lessons.js spanFull() and lib/groups.js: a timed booking holds every
-- hour it covers on every day it covers, and each hour takes slot_limit
-- bookings; a trip date takes slot_limit bookings. 'unlimited' never fills.

create or replace function public.bookings_capacity_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  lim text;
  cap integer;
  s integer;
  h integer;
  nd integer;
  d date;
  m integer;
  held integer;
begin
  if new.kind = 'waitlist' or new.wanted_date is null or new.status in ('declined', 'cancelled') then
    return new;
  end if;

  select t.slot_limit into lim from public.tours t where t.slug = new.tour_slug;
  if lim = 'unlimited' then return new; end if;
  -- as groupsLimit(): a positive whole number, otherwise 1
  cap := case when lim ~ '^\s*[0-9]{1,4}\s*$' and btrim(lim)::integer > 0 then btrim(lim)::integer else 1 end;

  perform pg_advisory_xact_lock(hashtext('mtani.booking:' || new.tour_slug));

  s := public.time_minutes(new.lesson_time);
  if s is null then
    -- a trip: groups already on that date (the route checks the start date)
    select count(*) into held
    from public.bookings o
    where o.tour_slug = new.tour_slug and o.kind <> 'waitlist'
      and o.status not in ('declined', 'cancelled')
      and o.wanted_date <= new.wanted_date
      and o.wanted_date + (public.booking_days(o.answers) - 1) >= new.wanted_date;
    if held >= cap then
      raise exception 'slot_full: % on % is fully booked', new.tour_slug, new.wanted_date using errcode = 'P0001';
    end if;
    return new;
  end if;

  h := public.booking_hours(new.answers);
  nd := public.booking_days(new.answers);
  for k in 0 .. nd - 1 loop
    d := new.wanted_date + k;
    for j in 0 .. h - 1 loop
      m := s + j * 60;
      select count(*) into held
      from public.bookings o
      where o.tour_slug = new.tour_slug and o.kind <> 'waitlist'
        and o.status not in ('declined', 'cancelled')
        and o.lesson_time is not null
        and o.wanted_date <= d
        and o.wanted_date + (public.booking_days(o.answers) - 1) >= d
        and public.time_minutes(o.lesson_time) <= m
        and public.time_minutes(o.lesson_time) + public.booking_hours(o.answers) * 60 > m;
      if held >= cap then
        raise exception 'slot_full: % at % on % is fully booked', new.tour_slug, new.lesson_time, d using errcode = 'P0001';
      end if;
    end loop;
  end loop;
  return new;
end;
$$;

drop trigger if exists bookings_capacity_guard on public.bookings;
create trigger bookings_capacity_guard
  before insert on public.bookings
  for each row execute function public.bookings_capacity_guard();

-- ---------------------------------------------------------------- auto-confirm sweep
-- Every minute, and only when a booking's auto-confirm is due, ask the site to
-- confirm it (/api/cron/auto-confirm sends the same email and sheet update as
-- the admin's Confirm button). The booking route also confirms on its own
-- after 40 s; this is the safety net when that function was cut short.
-- The Bearer secret lives in Vault as 'cron_secret' and must equal the
-- CRON_SECRET environment variable in Vercel.

do $$ begin
  if not exists (select 1 from vault.secrets where name = 'cron_secret') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'cron_secret',
      'Bearer secret for /api/cron/* on the site; must equal CRON_SECRET in Vercel');
  end if;
end $$;

select cron.unschedule('auto-confirm-bookings')
where exists (select 1 from cron.job where jobname = 'auto-confirm-bookings');

select cron.schedule('auto-confirm-bookings', '* * * * *', $job$
  select net.http_get(
    url := 'https://www.mtani.ge/api/cron/auto-confirm',
    headers := jsonb_build_object('Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret' limit 1)),
    timeout_milliseconds := 30000
  )
  where exists (
    select 1 from public.bookings
    where auto_confirm_at is not null and auto_confirm_at <= now() and status = 'new'
  );
$job$);
