// Admin: change who teaches a booking, from /admin/bookings.
//
// Body: { id, instructor_id } where instructor_id is an instructor's id, null
// for "Unassigned", or 'auto' to let the roster rules pick again
// (assign_instructor() in the database, the same pick a new booking gets).
//
// A manual pick is always saved, even when that instructor already teaches at
// an overlapping time: the admin may know better (a group merged, a helper
// stepping in). The answer then carries a warning to show next to it.
// The owner's sheet is told afterwards (Instructors tab and the second
// spreadsheet); a sheet failure is logged, never returned.

import { createClient } from '@supabase/supabase-js';
import { bookingRef } from '@/lib/bookingRef';
import { postToSheet, serviceClient } from '@/lib/bookingStatus';
import { assignInstructor } from '@/lib/instructors';

export const runtime = 'nodejs';

const {
  NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: SUPABASE_KEY,
} = process.env;

const UUID = /^[0-9a-f-]{32,40}$/i;

export async function POST(request) {
  const token = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return Response.json({ error: 'Please sign in.' }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Malformed request.' }, { status: 400 });
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return Response.json({ error: 'Malformed request.' }, { status: 400 });
  }
  const { id } = body;
  const wanted = body.instructor_id ?? null;
  if (typeof id !== 'string' || !UUID.test(id)) {
    return Response.json({ error: 'Missing booking.' }, { status: 400 });
  }
  if (wanted !== null && wanted !== 'auto' && !(typeof wanted === 'string' && UUID.test(wanted))) {
    return Response.json({ error: 'Unknown instructor.' }, { status: 400 });
  }

  // every query runs as the caller, so the database applies its own rules
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: auth, error: authError } = await supabase.auth.getUser(token);
  if (authError || !auth?.user) {
    return Response.json({ error: 'Your session has expired. Please sign in again.' }, { status: 401 });
  }
  const { data: profile, error: profileError } = await supabase
    .from('profiles').select('role').eq('id', auth.user.id).maybeSingle();
  if (profileError) {
    return Response.json({ error: 'Could not check your account. Please try again.' }, { status: 503 });
  }
  if (profile?.role !== 'admin') return Response.json({ error: 'Admins only.' }, { status: 403 });

  let instructorId = null;
  let name = null;
  let warning = null;

  if (wanted === 'auto') {
    // the roster rules need the service key (the function is not callable by
    // signed-in users); the admin check above is what allows it
    const service = serviceClient();
    if (!service) return Response.json({ error: 'Auto-assign is not set up on the server.' }, { status: 503 });
    const picked = await assignInstructor(service, id, true);
    if (!picked) return Response.json({ error: 'Could not assign. Please try again.' }, { status: 500 });
    if (picked.reason === 'not found') return Response.json({ error: 'Booking not found.' }, { status: 404 });
    instructorId = picked.instructor_id ?? null;
    name = picked.name ?? null;
    if (!instructorId) {
      warning = picked.reason === 'no discipline'
        ? 'Nobody assigned: this booking does not say SKI or SNOWBOARD. Pick an instructor by hand.'
        : picked.reason === 'nobody free'
          ? `Nobody is free at that time (${picked.discipline ?? 'ski/snowboard'}). Left unassigned.`
          : 'Nobody assigned: this booking has no date or time, or is no longer active.';
    }
  } else {
    if (wanted) {
      const { data: who, error: whoError } = await supabase
        .from('instructors').select('id, name').eq('id', wanted).maybeSingle();
      if (whoError || !who) return Response.json({ error: 'Unknown instructor.' }, { status: 400 });
      instructorId = who.id;
      name = who.name;
    }
    const { data, error } = await supabase
      .from('bookings').update({ instructor_id: instructorId }).eq('id', id).select('id');
    if (error) {
      console.error('Instructor change failed:', error.message);
      return Response.json({ error: 'Could not save the change. Please try again.' }, { status: 500 });
    }
    if (!data || data.length === 0) {
      return Response.json({ error: 'The database did not accept the change.' }, { status: 404 });
    }
    if (instructorId) {
      const service = serviceClient();
      const { data: clash } = service
        ? await service.rpc('instructor_clash', { p_booking: id, p_instructor: instructorId })
        : { data: null };
      if (clash === true) warning = `${name} already teaches at an overlapping time. Saved anyway.`;
    }
  }

  try {
    await postToSheet({ action: 'instructor', ref: bookingRef(id), instructor: name ?? '' }, 'Sheet instructor update');
  } catch (error) {
    console.error('Sheet instructor update failed:', error?.message);
  }

  return Response.json({ ok: true, id, instructor_id: instructorId, name, warning });
}
