-- Lessons hold every hour they cover.
--
-- A 4-hour lesson at 10:00 must count against 10:00, 11:00, 12:00 and 13:00.
-- The site (lib/lessons.js slotLoad / spanFull) does that counting, but it
-- needs to know each booking's hours. booked_slots() now also returns them,
-- read from answers->>'Hours' (lib/lessons.js HOURS_ANSWER); a booking without
-- hours counts as 1. Still only date, time and counts: no names, emails or
-- phones leave here.
--
-- Until this is run the site keeps working: rows without hours count as one
-- hour each, as before.
--
-- Run once in Supabase: SQL Editor -> paste -> Run.

drop function if exists public.booked_slots(text);

create function public.booked_slots(p_slug text)
returns table (wanted_date text, lesson_time text, hours integer, people integer, bookings integer)
language sql stable security definer set search_path = public as $$
  select to_char(b.wanted_date, 'YYYY-MM-DD'), b.lesson_time,
         case when (b.answers->>'Hours') ~ '^[0-9]{1,2}$'
              then greatest((b.answers->>'Hours')::integer, 1) else 1 end as hours,
         sum(b.people)::integer, count(*)::integer
  from public.bookings b
  where b.tour_slug = p_slug
    and b.kind <> 'waitlist'
    and b.status <> 'declined'
    and b.wanted_date >= current_date
  group by 1, 2, 3;
$$;

grant execute on function public.booked_slots(text) to anon, authenticated;
