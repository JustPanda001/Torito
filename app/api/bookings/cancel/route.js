// Customer cancels their own booking from My bookings.
//
// Free up to 48 hours before the service starts (wanted_date + lesson_time in
// Georgia time, UTC+4 all year; no time means 00:00 that day). The rule is
// checked here, not in the browser: the browser only decides whether to show
// the button.
//
// Customers cannot update the bookings table (no policy), so the change is made
// with the service role key, after the caller's own access token has been
// checked and the row has been shown to belong to them. The key is read only
// here on the server and never reaches the browser.
//
// The database row is the record. The customer email, the Telegram message and
// the Google Sheet row are copies: they are tried after the row is saved, and a
// failure in any of them is logged, not returned.
//
// Needs 'cancelled' to be allowed by bookings_status_check (see the migration
// the lead applies); until then the update fails and the customer is told so.

import { createClient } from '@supabase/supabase-js';
import { bookingRef } from '@/lib/bookingRef';
import { sendBookingEmail } from '@/lib/bookingEmail';

export const runtime = 'nodejs';

const {
  NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: SUPABASE_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,
  SHEETS_WEBHOOK_URL,
  SHEETS_WEBHOOK_SECRET,
} = process.env;

const FREE_CANCEL_HOURS = 48;
const HOUR_MS = 60 * 60 * 1000;
// statuses a customer may cancel from
const CANCELLABLE = ['new', 'confirmed'];

/**
 * When the service starts, as a Date, or null without a usable date.
 * Georgia is UTC+4 all year, so "2026-12-28" + "10:00" is 2026-12-28T10:00+04:00.
 */
function serviceStart(wantedDate, lessonTime) {
  const day = /^(\d{4}-\d{2}-\d{2})/.exec(String(wantedDate ?? ''))?.[1];
  if (!day) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(String(lessonTime ?? '').trim());
  const hh = m ? String(Math.min(Number(m[1]), 23)).padStart(2, '0') : '00';
  const mm = m ? m[2] : '00';
  const start = new Date(`${day}T${hh}:${mm}:00+04:00`);
  return Number.isNaN(start.getTime()) ? null : start;
}

export async function POST(request) {
  const token = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) {
    return Response.json({ error: 'Please sign in.' }, { status: 401 });
  }

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
  if (typeof id !== 'string' || !/^[0-9a-f-]{32,40}$/i.test(id)) {
    return Response.json({ error: 'Missing booking.' }, { status: 400 });
  }

  // who is asking: the token is checked by Supabase, never trusted as sent
  const anon = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: auth, error: authError } = await anon.auth.getUser(token);
  const user = auth?.user;
  if (authError || !user) {
    return Response.json({ error: 'Your session has expired. Please sign in again.' }, { status: 401 });
  }

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Booking cancel: SUPABASE_SERVICE_ROLE_KEY is not set.');
    return Response.json({ error: 'Cancelling is not available right now. Please write to us in the chat.' }, { status: 503 });
  }
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: booking, error: loadError } = await admin
    .from('bookings')
    .select('id, user_id, status, kind, tour_slug, tour_title, wanted_date, lesson_time, people, skill_level, lesson_type, answers, total, name, email')
    .eq('id', id)
    .maybeSingle();
  if (loadError) {
    console.error('Booking cancel: lookup failed:', loadError.message);
    return Response.json({ error: 'Could not check your booking. Please try again.' }, { status: 503 });
  }
  if (!booking) {
    return Response.json({ error: 'Booking not found.' }, { status: 404 });
  }
  if (!booking.user_id || booking.user_id !== user.id) {
    return Response.json({ error: 'This is not your booking.' }, { status: 403 });
  }
  if (!CANCELLABLE.includes(booking.status)) {
    return Response.json({ error: 'This booking cannot be cancelled any more.', code: 'bad_status' }, { status: 409 });
  }

  // a waitlist request has no date, so there is no start to count back from
  const start = booking.kind === 'waitlist' ? null : serviceStart(booking.wanted_date, booking.lesson_time);
  if (!start) {
    return Response.json({ error: 'This request has no date. Please write to us in the chat.' }, { status: 400 });
  }
  if (start.getTime() - Date.now() < FREE_CANCEL_HOURS * HOUR_MS) {
    return Response.json({
      error: 'Free cancellation ended 48 hours before the start. Please write to us in the chat.',
      code: 'too_late',
    }, { status: 409 });
  }

  // the status test in the update itself closes the gap between the check above
  // and the write (two taps, two tabs): only one of them changes the row
  const { data: updated, error: updateError } = await admin
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .eq('user_id', user.id)
    .in('status', CANCELLABLE)
    .select('id, status');
  if (updateError) {
    console.error('Booking cancel: update failed:', updateError.message);
    return Response.json({ error: 'Could not cancel the booking. Please try again, or write to us in the chat.' }, { status: 500 });
  }
  if (!updated || updated.length === 0) {
    return Response.json({ error: 'This booking cannot be cancelled any more.', code: 'bad_status' }, { status: 409 });
  }

  const ref = bookingRef(booking.id);
  const site = new URL(request.url).origin;
  const row = { ...booking, status: 'cancelled', ref, email: booking.email || user.email || null };

  const [mail, telegram, sheet] = await Promise.allSettled([
    sendBookingEmail(row, site, 'cancelled'),
    notifyTelegram(row),
    updateSheet(ref),
  ]);
  if (mail.status === 'rejected') console.error('Cancel email failed:', mail.reason?.message);
  if (telegram.status === 'rejected') console.error('Cancel Telegram notice failed:', telegram.reason?.message);
  if (sheet.status === 'rejected') console.error('Cancel sheet update failed:', sheet.reason?.message);

  return Response.json({
    ok: true, id: booking.id, status: 'cancelled',
    emailed: mail.status === 'fulfilled' && mail.value === true,
  });
}

async function notifyTelegram(row) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;

  const text = [
    '❌ Cancelled by customer',
    `Ref: ${row.ref}`,
    `Trip: ${row.tour_title ?? row.tour_slug ?? '—'}`,
    `Date: ${String(row.wanted_date ?? '—').slice(0, 10)}${row.lesson_time ? ` at ${row.lesson_time}` : ''}`,
  ].join('\n');

  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, disable_web_page_preview: true }),
  });
  if (!res.ok) console.error('Cancel Telegram notice failed:', res.status, await res.text());
}

/** Tells the sheet's script to set the Status cell for this ref (same call as the admin route). */
async function updateSheet(ref) {
  if (!SHEETS_WEBHOOK_URL) return;

  const res = await fetch(SHEETS_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: SHEETS_WEBHOOK_SECRET ?? '', action: 'status', ref, status: 'cancelled' }),
  });

  const reply = (await res.text()).trim();
  if (res.ok && reply === 'not found') {
    // normal for bookings made before the sheet had a Ref column
    console.warn('Cancel sheet update: no row with ref', ref);
  } else if (!res.ok || reply !== 'ok') {
    console.error('Cancel sheet update failed:', res.status, reply.slice(0, 120));
  }
}
