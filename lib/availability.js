'use client';

// What is already booked, so the booking dialog can grey it out.
//
// Guests are not allowed to read the bookings table (it holds names and phone
// numbers), so this goes through booked_slots(): a database function that
// returns only date, time and head count for one trip. See
// OUTDOOR-RELAUNCH.sql. Until that function exists the answer is simply
// "nothing booked", and the dialog behaves as it did before.
//
// Timed products (lessons, snowmobile, paragliding) are counted in bookings:
// a 10:00 on 1 January is gone once it holds as many bookings as the trip's
// slot_limit allows (one by default, never for 'unlimited'). A day is greyed out
// once every slot on it is taken. Trips are counted in people instead, and a
// date is greyed out once it reaches the trip's capacity.

import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { iso } from './season';
import { timeQuestion } from './lessons';
import { bookingQuestions } from './bookingQuestions';

export function useAvailability(tour) {
  const [rows, setRows] = useState([]);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase.rpc('booked_slots', { p_slug: tour.slug });
    if (!error && Array.isArray(data)) setRows(data);
  }, [tour.slug]);

  useEffect(() => { refresh(); }, [refresh]);

  const onDay = (date) => rows.filter((r) => r.wanted_date === iso(date));

  // how many separate bookings one time slot takes (admin only, never shown);
  // 'unlimited' means a slot never fills
  const limit = tour.slot_limit === 'unlimited' ? Infinity : (Number(tour.slot_limit) || 1);

  /** True when this slot on this day has no room for another booking. */
  const timeTaken = (date, slot) => Boolean(date) && onDay(date)
    .filter((r) => r.lesson_time === slot)
    .reduce((n, r) => n + (r.bookings ?? 1), 0) >= limit;

  /** People already booked on a trip's departure that day. */
  const bookedOn = (date) => onDay(date).reduce((sum, r) => sum + (r.people ?? 0), 0);

  /** Nothing left to book on this day. */
  const dayFull = (date, timed) => (timed
    ? (timeQuestion(tour, bookingQuestions(tour))?.options ?? []).every((slot) => timeTaken(date, slot))
    : Boolean(tour.capacity) && bookedOn(date) >= tour.capacity);

  return { timeTaken, bookedOn, dayFull, refresh };
}
