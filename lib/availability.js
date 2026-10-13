'use client';

// What is already booked, so the booking dialog can grey it out.
//
// Guests are not allowed to read the bookings table (it holds names and phone
// numbers), so this goes through booked_slots(): a database function that
// returns only date, time and head count for one trip. See
// OUTDOOR-RELAUNCH.sql. Until that function exists the answer is simply
// "nothing booked", and the dialog behaves as it did before.
//
// Timed products (lessons, snowmobile, paragliding) have one booking per slot:
// a taken 10:00 on 1 January is gone for everyone else. A day is greyed out
// once every slot on it is taken. Trips are counted in people instead, and a
// date is greyed out once it reaches the trip's capacity.

import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { iso } from './season';
import { LESSON_TIMES } from './lessons';

export function useAvailability(tour) {
  const [rows, setRows] = useState([]);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase.rpc('booked_slots', { p_slug: tour.slug });
    if (!error && Array.isArray(data)) setRows(data);
  }, [tour.slug]);

  useEffect(() => { refresh(); }, [refresh]);

  const onDay = (date) => rows.filter((r) => r.wanted_date === iso(date));

  /** True when someone already holds this slot on this day. */
  const timeTaken = (date, slot) => Boolean(date) && onDay(date).some((r) => r.lesson_time === slot);

  /** People already booked on a trip's departure that day. */
  const bookedOn = (date) => onDay(date).reduce((sum, r) => sum + (r.people ?? 0), 0);

  /** Nothing left to book on this day. */
  const dayFull = (date, timed) => (timed
    ? LESSON_TIMES.every((slot) => timeTaken(date, slot))
    : Boolean(tour.capacity) && bookedOn(date) >= tour.capacity);

  return { timeTaken, bookedOn, dayFull, refresh };
}
