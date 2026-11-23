// The safety net for "Confirm automatically" (tours.auto_confirm, today the
// Gudauri lessons). The booking route confirms a new request itself about 40
// seconds after it lands; if that function was stopped early, this confirms
// it instead. Called every minute by the Supabase pg_cron job
// 'auto-confirm-bookings' (see INSTRUCTORS-AUTOCONFIRM.sql), and only when a
// confirm is actually due.
//
// autoConfirm() changes only rows still 'new' with their auto_confirm_at
// passed, in one conditional update, so a booking the customer cancelled or
// the admin already answered is left alone, and nothing is emailed twice.

import { cronAuthorized } from '@/lib/cronAuth';
import { autoConfirm, serviceClient } from '@/lib/bookingStatus';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// a burst of bookings is worked through over a few runs, not all at once
const BATCH = 20;

async function run(request) {
  if (!cronAuthorized(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const admin = serviceClient();
  if (!admin) {
    console.error('Auto-confirm sweep: SUPABASE_SERVICE_ROLE_KEY is not set.');
    return Response.json({ error: 'Not configured' }, { status: 500 });
  }

  const { data, error } = await admin
    .from('bookings')
    .select('id')
    .eq('status', 'new')
    .not('auto_confirm_at', 'is', null)
    .lte('auto_confirm_at', new Date().toISOString())
    .order('auto_confirm_at', { ascending: true })
    .limit(BATCH);
  if (error) {
    console.error('Auto-confirm sweep: lookup failed:', error.message);
    return Response.json({ error: 'Lookup failed' }, { status: 500 });
  }

  let confirmed = 0;
  for (const { id } of data ?? []) {
    // one at a time: each sends an email and a sheet update
    if (await autoConfirm(id, admin)) confirmed += 1;
  }
  return Response.json({ ok: true, due: data?.length ?? 0, confirmed });
}

export const GET = run;
export const POST = run;
