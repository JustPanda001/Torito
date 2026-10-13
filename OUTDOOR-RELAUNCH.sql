-- Outdoor-only relaunch. Run once in the Supabase SQL editor. Safe to re-run.
--
-- 1. booked_slots(): lets the booking dialog grey out dates and times that
--    are already taken, without letting guests read anyone's bookings.
-- 2. Adds the snowmobile, paragliding and Kazbek trips.
-- 3. Unpublishes the cultural tours and Bakuriani. Nothing is deleted.

create or replace function public.booked_slots(p_slug text)
returns table (wanted_date text, lesson_time text, people integer)
language sql stable security definer set search_path = public as $$
  -- only date, time and head count: no names, emails or phones leave here
  select to_char(b.wanted_date, 'YYYY-MM-DD'), b.lesson_time, sum(b.people)::integer
  from public.bookings b
  where b.tour_slug = p_slug
    and b.kind <> 'waitlist'
    and b.status <> 'declined'
    and b.wanted_date >= current_date
  group by b.wanted_date, b.lesson_time;
$$;

grant execute on function public.booked_slots(text) to anon, authenticated;

insert into public.tours (slug, title, subtitle, category, subtype, region, cover_image, gallery, price, distance, duration, difficulty, elevation_gain, stay, languages, capacity, spots_left, badge, season, season_from, season_to, departure_point, departure_time, return_info, transport, group_size, walking_per_day, summary, lat, lng, itinerary, included, excluded, published)
values
  ('gudauri-snowmobile', 'Gudauri Snowmobile Ride', 'Snowmobile ride to the Cross Pass', 'ski', 'snowmobile', 'Gudauri', '/assets/gudauri 1.jpe', array['/assets/gudauri 1.jpe','/assets/gudauri.jpe','/assets/gudauri.webp'], 250, null, '2 hours, with stops', 'Easy', null, null, 'EN · GE · RU', 8, 6, 'new', 'December – March', '12-01', '03-31', 'Gudauri, New Gudauri parking', null, null, 'Snowmobile, 1 – 2 riders each', '1 – 8 people', null, 'Two hours on a snowmobile behind a guide, from the resort up toward the Cross Pass and the Friendship monument viewpoint over the Aragvi gorge. No experience needed — a short briefing, a helmet and one or two riders per machine.', 42.4769, 44.4783, '[["Briefing & first loop","Ten minutes on the controls with the guide, then a gentle loop on the flat to get the feel of the throttle."],["Up the valley","Follow the guide out of the resort and up the snow road toward the Cross Pass, with stops on the way."],["Friendship monument","A long stop at the viewpoint over the Aragvi gorge — hot tea, photos, and the whole range in front of you."],["Back to Gudauri","A faster ride down for those who want it, a steady one for those who do not."]]'::jsonb, '[["Snowmobile & fuel","One machine for one or two riders"],["Guide","Leads the ride, English-speaking"],["Helmet & goggles","Fitted at the start"],["Warm suit","Windproof overalls if you need them"],["Photos","Shot at the viewpoint, sent the same evening"]]'::jsonb, '[["Lunch","Cafés at the pass, your choice"],["Damage deposit","Only charged for off-route damage"]]'::jsonb, true),
  ('gudauri-paragliding', 'Gudauri Tandem Paragliding', 'Tandem paragliding flight', 'ski', 'paragliding', 'Gudauri', '/assets/gudauri.jpe', array['/assets/gudauri.jpe','/assets/gudauri 1.jpe','/assets/gudauri.webp'], 300, null, '15 – 25 min in the air', 'Easy', null, null, 'EN · GE · RU', 4, 4, 'top', 'December – March (summer flights on request)', '12-01', '03-31', 'Gudauri, top of the Sadzele lift', null, null, null, '1 – 4 people, one pilot each', null, 'A tandem flight with a licensed pilot from the top of the Gudauri lifts, over the snow bowls and down toward the valley. You run three steps and sit back — the pilot does the rest. Photos and video from the wingtip camera are included.', 42.4769, 44.4783, '[["Meet at the lift","Meet your pilot at the bottom of the Sadzele lift and ride up together."],["Briefing & take-off","Five minutes on what to do — mostly: run three steps and sit back. Then off the slope and into the air."],["The flight","15 to 25 minutes over the snow bowls and the valley, gentle or with a few spirals if you ask for them."],["Landing","A soft landing near the base. Your photos and video are with you before dinner."]]'::jsonb, '[["Licensed tandem pilot","Certified, hundreds of flights in Gudauri"],["All flying gear","Wing, harness, reserve and helmet"],["Lift ticket","To the take-off point"],["Photos & video","From the wingtip camera, sent the same day"]]'::jsonb, '[["Warm clothes","Dress as for skiing — it is colder up there"],["Travel insurance","Recommended"]]'::jsonb, true),
  ('kazbek-summit', 'Mount Kazbek Summit Climb', '5,054 m summit climb', 'mountaineering', null, 'Kazbegi', '/assets/sameba.webp', array['/assets/sameba.webp','/assets/sameba.jpe','/assets/camping.jpg'], 1450, '36 km', '7 days / 6 nights', 'Hard', '3,300 m', 'Meteo station & tents', 'EN · GE · RU', 8, 4, 'top', 'Late June – mid September', '06-20', '09-15', 'Tbilisi, Liberty Square', '08:00', 'Day 7, ~20:00 Tbilisi', 'Minibus + 4x4 to Gergeti', '2 – 8 people', '5 – 12 hours', 'A guided ascent of Kazbek, the classic Georgian glacier peak. Acclimatisation days at the old meteo station at 3,650 m, glacier and crampon training, then a summit push in the dark to stand at 5,054 m at sunrise. For fit hikers ready for their first big mountain.', 42.6997, 44.5186, '[["Tbilisi → Stepantsminda","Drive the Military Road north, gear check and an evening briefing with the guide."],["Gergeti → Sabertse pass","First climb past the Trinity church to around 3,000 m, back down to sleep."],["Up to the meteo station","Cross the Gergeti glacier to the station at 3,650 m."],["Acclimatisation & glacier school","A climb to ~4,200 m, rope work, crampons and ice-axe arrest."],["Summit day","Start around 01:00, summit at sunrise, back to the station by afternoon."],["Reserve day","Kept free in case the weather closes the summit window."],["Down → Tbilisi","Walk out to Gergeti and drive back to the city."]]'::jsonb, '[]'::jsonb, '[]'::jsonb, true)
on conflict (slug) do nothing;

update public.tours set published = false
  where category in ('culture', 'tours', 'other') or slug = 'bakuriani-beginners' or region ilike '%bakuriani%';
