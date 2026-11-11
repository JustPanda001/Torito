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
import { timeQuestion, slotTimeState, spanFull, fitsDay } from './lessons';
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

  // the times this service offers; the day closes an hour after the last one
  const offered = () => timeQuestion(tour, bookingQuestions(tour))?.options ?? [];

  /** True when a lesson of `hours` (default 1) starting at this slot would
   *  meet a full hour: every booked row holds each hour it covers, rows
   *  without hours (older booked_slots(), see SLOT-HOURS.sql) count as one. */
  const timeTaken = (date, slot, hours = 1) => Boolean(date)
    && spanFull(onDay(date), slot, hours, limit);

  /** True when a lesson of `hours` starting here would run past closing. */
  const tooLong = (slot, hours = 1) => !fitsDay(slot, hours, offered());

  /** People already booked on a trip's departure that day. */
  const bookedOn = (date) => onDay(date).reduce((sum, r) => sum + (r.people ?? 0), 0);

  /** Nothing left to book on this day: every slot is held, or (today, in
   *  Tbilisi time) has started or starts too soon to book online. */
  // `hours`: the lesson length being booked (1 for other timed services); a
  // day is full when no start time can hold a lesson that long
  const dayFull = (date, timed, hours = 1) => (timed
    ? offered()
      .every((slot) => tooLong(slot, hours) || timeTaken(date, slot, hours) || Boolean(slotTimeState(date, slot)))
    : Boolean(tour.capacity) && bookedOn(date) >= tour.capacity);

  return { timeTaken, tooLong, bookedOn, dayFull, refresh };
}
