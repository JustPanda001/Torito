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

import { createClient } from '@supabase/supabase-js';
import { bookingRef } from '@/lib/bookingRef';

export const runtime = 'nodejs';

const {
  NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: SUPABASE_KEY,
  SHEETS_WEBHOOK_URL,
  SHEETS_WEBHOOK_SECRET,
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

  const { data, error } = await supabase
    .from('bookings').update({ status }).eq('id', id).select('id, status');
  if (error) {
    console.error('Booking status update failed:', error.message);
    return Response.json({ error: error.message || 'Could not save the change.' }, { status: 500 });
  }
  // RLS hides a row you may not change: no error, but nothing comes back
  if (!data || data.length === 0) {
    return Response.json({ error: 'The database did not accept the change.' }, { status: 404 });
  }

  const saved = data[0];
  await updateSheet(bookingRef(saved.id), saved.status).catch((e) => {
    console.error('Sheet status update failed:', e?.message);
  });

  return Response.json({ ok: true, ...saved });
}

/** Tells the sheet's script to set the Status cell and row colour for this ref. */
async function updateSheet(ref, status) {
  if (!SHEETS_WEBHOOK_URL) return;

  const res = await fetch(SHEETS_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: SHEETS_WEBHOOK_SECRET ?? '', action: 'status', ref, status }),
  });

  // same check as the booking append: Google answers a misconfigured web app
  // with a 200 sign-in page, and a wrong secret with "no"
  const reply = (await res.text()).trim();
  if (res.ok && reply === 'not found') {
    // normal for bookings made before the sheet had a Ref column
    console.warn('Sheet status update: no row with ref', ref);
  } else if (!res.ok || reply !== 'ok') {
    console.error('Sheet status update failed:', res.status, reply.slice(0, 120));
  }
}
