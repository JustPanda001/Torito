// Admin: confirm / decline / undo a booking request.
//
// The database row is the record. The change is made as the signed-in admin
// (their own access token, so the "admins manage bookings" policy is what
// really allows it), and only afterwards is the owner's Google Sheet told, so
// its Status column follows. The sheet is a copy: if the script is down or not
// updated, the change is logged and the admin still gets their answer.
//
// Who is an admin: profiles.role = 'admin', the same test the admin pages use
// (currentProfile() in lib/supabaseClient.js) and what is_admin() checks in
// the database.

//
// The sheet update and the customer email live in lib/bookingStatus.js, so
// the automatic confirm (Gudauri lessons) does exactly what Confirm does here.

import { createClient } from '@supabase/supabase-js';
import { STATUS_COLUMNS, statusSideEffects } from '@/lib/bookingStatus';

export const runtime = 'nodejs';

const {
  NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: SUPABASE_KEY,
} = process.env;

const STATUSES = ['new', 'confirmed', 'declined'];

export async function POST(request) {
  const token = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) {
    return Response.json({ error: 'Please sign in.' }, { status: 401 });
  }

  // the shape of the request is checked before anything else is asked of the
  // database
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Malformed request.' }, { status: 400 });
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return Response.json({ error: 'Malformed request.' }, { status: 400 });
  }

  const { id, status } = body;
  if (typeof id !== 'string' || !/^[0-9a-f-]{32,40}$/i.test(id)) {
    return Response.json({ error: 'Missing booking.' }, { status: 400 });
  }
  if (!STATUSES.includes(status)) {
    return Response.json({ error: 'Status must be new, confirmed or declined.' }, { status: 400 });
  }

  // every query runs as the caller, so the database applies its own rules
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: auth, error: authError } = await supabase.auth.getUser(token);
  const user = auth?.user;
  if (authError || !user) {
    return Response.json({ error: 'Your session has expired. Please sign in again.' }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profileError) {
    console.error('Booking status: profile lookup failed:', profileError.message);
    return Response.json({ error: 'Could not check your account. Please try again.' }, { status: 503 });
  }
  if (profile?.role !== 'admin') {
    return Response.json({ error: 'Admins only.' }, { status: 403 });
  }

  // the status before the change, so pressing Confirm twice does not email twice
  const { data: before } = await supabase
    .from('bookings').select('status').eq('id', id).maybeSingle();
  // a booking the customer cancelled stays cancelled
  if (before?.status === 'cancelled') {
    return Response.json({ error: 'The customer cancelled this booking.' }, { status: 409 });
  }

  // an admin's answer also stops a pending automatic confirm, so Undo (back
  // to new) is never confirmed again behind the admin's back
  const { data, error } = await supabase
    .from('bookings').update({ status, auto_confirm_at: null }).eq('id', id)
    .select(STATUS_COLUMNS);
  if (error) {
    // bookings_capacity_guard_reactivate (PRELAUNCH-GUARDS.sql): a declined
    // request cannot come back into a time that has filled up since
    if (/slot_full/.test(error.message ?? '')) {
      return Response.json({
        error: 'That time is full now (other bookings took the place). Leave it declined, or free a place first.',
      }, { status: 409 });
    }
    console.error('Booking status update failed:', error.message);
    return Response.json({ error: 'Could not save the change. Please try again.' }, { status: 500 });
  }
  // RLS hides a row you may not change: no error, but nothing comes back
  if (!data || data.length === 0) {
    return Response.json({ error: 'The database did not accept the change.' }, { status: 404 });
  }

  const saved = data[0];
  const { emailed } = await statusSideEffects(saved, before?.status);

  return Response.json({ ok: true, id: saved.id, status: saved.status, emailed });
}
