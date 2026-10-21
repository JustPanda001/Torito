-- Permanently delete the old hiking, camping and mountaineering trips.
-- Run in the Supabase SQL editor AFTER REPLACE-OUTDOOR-TRIPS.sql.
--
-- WARNING: this cannot be undone. It removes only trips that are already
-- hidden (published = false), so the new trips stay. Bookings and reviews are
-- not touched, but any that belong to a deleted trip will no longer match a
-- trip page.

delete from public.tours
  where category in ('hiking', 'camping', 'mountaineering')
    and published = false;
