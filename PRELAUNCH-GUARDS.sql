-- Pre-launch hardening (2026-11-25). Applied to Supabase as migration
-- "prelaunch_booking_guards". Safe to run again.
--
-- 1. bookings_capacity_guard also runs when a declined/cancelled booking is
--    made live again (admin "Undo" on a declined request). Before, only
--    INSERT was checked, so an Undo could put a sixth lesson into a full hour.
--    The counts now skip the row itself, so an UPDATE does not count itself.
-- 2. Nobody can call the trigger function through /rest/v1/rpc (it is only
--    ever run by the trigger; triggers do not need EXECUTE).
-- 3. RLS policies call auth.uid() once per query, not once per row
--    (Supabase performance advisor "auth_rls_initplan"). Same rules.
-- 4. Indexes the advisor asked for, plus one for the slot checks.

create or replace function public.bookings_capacity_guard()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
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
  cap := case when lim ~ '^\s*[0-9]{1,4}\s*$' and btrim(lim)::integer > 0 then btrim(lim)::integer else 1 end;

  perform pg_advisory_xact_lock(hashtext('mtani.booking:' || new.tour_slug));

  s := public.time_minutes(new.lesson_time);
  if s is null then
    select count(*) into held
    from public.bookings o
    where o.tour_slug = new.tour_slug and o.kind <> 'waitlist'
      and o.id is distinct from new.id
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
        and o.id is distinct from new.id
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
$function$;

drop trigger if exists bookings_capacity_guard_reactivate on public.bookings;
create trigger bookings_capacity_guard_reactivate
  before update of status on public.bookings
  for each row
  when (old.status in ('declined', 'cancelled') and new.status not in ('declined', 'cancelled'))
  execute function public.bookings_capacity_guard();

revoke execute on function public.bookings_capacity_guard() from public, anon, authenticated;

-- RLS: same rules, auth.uid() evaluated once per statement
alter policy "read own bookings" on public.bookings
  using (user_id is not null and user_id = (select auth.uid()));
alter policy "read own profile" on public.profiles using (id = (select auth.uid()));
alter policy "update own profile" on public.profiles
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
alter policy "insert own profile" on public.profiles
  with check (id = (select auth.uid()) and role = 'user');
alter policy "read own favorites" on public.favorites using (user_id = (select auth.uid()));
alter policy "add own favorites" on public.favorites with check (user_id = (select auth.uid()));
alter policy "remove own favorites" on public.favorites using (user_id = (select auth.uid()));
alter policy "read own review" on public.tour_reviews using (user_id = (select auth.uid()));
alter policy "write own review" on public.tour_reviews with check (user_id = (select auth.uid()));
alter policy "edit own review" on public.tour_reviews
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter policy "delete own review" on public.tour_reviews using (user_id = (select auth.uid()));
alter policy "contact_messages insert own" on public.contact_messages
  with check (user_id = (select auth.uid()));
alter policy "contact_messages select own" on public.contact_messages
  using (user_id = (select auth.uid()));

create index if not exists tour_reviews_user_idx on public.tour_reviews (user_id);
create index if not exists tour_reviews_reviewed_by_idx on public.tour_reviews (reviewed_by) where reviewed_by is not null;
create index if not exists bookings_slot_idx on public.bookings (tour_slug, wanted_date);
