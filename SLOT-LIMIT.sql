-- Bookings per time slot. Run once in the Supabase SQL editor. Safe to re-run.
--
-- 1. tours.slot_limit: how many separate bookings one time slot can take
--    ('1'…'20', or 'unlimited'). Set in the admin panel; never shown to
--    customers. Existing trips default to 1, which is how it worked before.
-- 2. booked_slots() now also returns how many bookings each slot holds.

alter table public.tours add column if not exists slot_limit text not null default '1';

-- the return type changes, which create or replace cannot do
drop function if exists public.booked_slots(text);

create function public.booked_slots(p_slug text)
returns table (wanted_date text, lesson_time text, people integer, bookings integer)
language sql stable security definer set search_path = public as $$
  -- only date, time and counts: no names, emails or phones leave here
  select to_char(b.wanted_date, 'YYYY-MM-DD'), b.lesson_time,
         sum(b.people)::integer, count(*)::integer
  from public.bookings b
  where b.tour_slug = p_slug
    and b.kind <> 'waitlist'
    and b.status <> 'declined'
    and b.wanted_date >= current_date
  group by b.wanted_date, b.lesson_time;
$$;

grant execute on function public.booked_slots(text) to anon, authenticated;
