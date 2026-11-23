// What happens after a booking's status changes: the owner's Google Sheet is
// told (Status column and row colour) and the customer is emailed once about
// Confirm or Decline. Shared by the admin's buttons (/api/admin/booking-status)
// and the automatic confirm (/api/bookings after 40 s, /api/cron/auto-confirm),
// so an automatic confirm does exactly what pressing Confirm does.
//
// Server only: it reads the service role key and the sheet's secret.

import { createClient } from '@supabase/supabase-js';
import { bookingRef } from '@/lib/bookingRef';
import { sendBookingEmail } from '@/lib/bookingEmail';
import { SITE_URL } from '@/lib/siteUrl';

const {
  NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  SHEETS_WEBHOOK_URL,
  SHEETS_WEBHOOK_SECRET,
} = process.env;

// the columns a status change reads back, for the email and the sheet
export const STATUS_COLUMNS = 'id, status, tour_slug, tour_title, kind, wanted_date, lesson_time, people, skill_level, lesson_type, answers, total, name, email, user_id';

// a new trip with "Confirm automatically" on is confirmed this long after the
// request lands (the "request received" email goes first)
export const AUTO_CONFIRM_SECONDS = 40;

/** A Supabase client with the service role key, or null when it is not set. */
export function serviceClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Posts to the sheet's Apps Script; logs anything but a plain "ok". */
export async function postToSheet(payload, what = 'Sheet update') {
  if (!SHEETS_WEBHOOK_URL) return;

  const res = await fetch(SHEETS_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: SHEETS_WEBHOOK_SECRET ?? '', ...payload }),
  });

  // Google answers a misconfigured web app with a 200 sign-in page, and a
  // wrong secret with "no", so read what came back rather than the status
  const reply = (await res.text()).trim();
  if (res.ok && reply === 'not found') {
    // normal for bookings made before the sheet had a Ref column
    console.warn(`${what}: no row with ref`, payload.ref);
  } else if (!res.ok || reply !== 'ok') {
    console.error(`${what} failed:`, res.status, reply.slice(0, 120));
  }
}

/** Tells the sheet's script to set the Status cell and row colour for this ref. */
export function updateSheetStatus(ref, status) {
  return postToSheet({ action: 'status', ref, status }, 'Sheet status update');
}

/** The verified email of the account that made a booking, or null. */
export async function accountEmail(userId) {
  const admin = userId ? serviceClient() : null;
  if (!admin) return null;
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error) { console.error('Account email lookup failed:', error.message); return null; }
  return data?.user?.email ?? null;
}

/**
 * The sheet update and the customer email for a status change that has
 * already been saved. `saved` is the row as read back (STATUS_COLUMNS),
 * `before` the status it had. Resolves { emailed }.
 */
export async function statusSideEffects(saved, before) {
  const ref = bookingRef(saved.id);
  // the customer hears about Confirm and Decline once; Undo (back to new) is silent
  const notify = (saved.status === 'confirmed' || saved.status === 'declined') && before !== saved.status;
  // the email goes to the customer's account address, never the one stored on
  // the booking row (SEC-01); no account address, no email
  const to = notify ? await accountEmail(saved.user_id) : null;

  const [sheet, mail] = await Promise.allSettled([
    updateSheetStatus(ref, saved.status),
    notify && to ? sendBookingEmail({ ...saved, email: to, ref }, SITE_URL, saved.status) : Promise.resolve(false),
  ]);
  if (sheet.status === 'rejected') console.error('Sheet status update failed:', sheet.reason?.message);
  if (mail.status === 'rejected') console.error('Status email failed:', mail.reason?.message);
  return { emailed: mail.status === 'fulfilled' && mail.value === true };
}

/**
 * Confirms one booking whose automatic confirm is due, exactly as the admin's
 * Confirm button would. Only a row still 'new' with its auto_confirm_at set and
 * passed is changed, in one conditional update, so the booking route's timer
 * and the every-minute sweep can both try and only one of them emails.
 * A cancelled, declined or already confirmed booking is left alone.
 * Resolves true when this call confirmed it.
 */
export async function autoConfirm(id, admin = serviceClient()) {
  if (!admin || !id) return false;
  const { data, error } = await admin
    .from('bookings')
    .update({ status: 'confirmed', auto_confirm_at: null })
    .eq('id', id)
    .eq('status', 'new')
    .not('auto_confirm_at', 'is', null)
    .lte('auto_confirm_at', new Date().toISOString())
    .select(STATUS_COLUMNS);
  if (error) {
    console.error('Auto-confirm failed:', id, error.message);
    return false;
  }
  if (!data || data.length === 0) return false;
  await statusSideEffects(data[0], 'new');
  return true;
}
