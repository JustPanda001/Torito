// The daily booking report, sent to the team's Telegram alerts chat at 23:30
// Tbilisi time (19:30 UTC; Georgia has no summer time). Run by Vercel Cron
// (vercel.json, "30 7 * * *"), which calls this with
// "Authorization: Bearer <CRON_SECRET>".
//
// It covers every booking request created in the 24 hours before the run,
// whatever happened to it since: how many, how many per trip, and one line
// each (trip, date and time, people, status, and the instructor where one is
// assigned). A quiet day still gets a message, so a missing report means the
// job did not run rather than that nobody booked.

import { cronAuthorized } from '@/lib/cronAuth';
import { serviceClient } from '@/lib/bookingStatus';
import { sendTelegram } from '@/lib/telegram';
import { bookingRef } from '@/lib/bookingRef';
import { disciplineOf, lessonShape } from '@/lib/instructors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DAY_MS = 24 * 60 * 60 * 1000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const STATUS = { new: 'needs answer', confirmed: 'confirmed', declined: 'declined', cancelled: 'cancelled' };

/** "23 Dec 2026" from a YYYY-MM-DD, without any time zone shift. */
function day(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value ?? ''));
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : null;
}

/** Now in Tbilisi (UTC+4), as "24 Nov 2026, 11:30". */
function tbilisiStamp(now) {
  const t = new Date(now + 4 * 60 * 60 * 1000);
  const hh = String(t.getUTCHours()).padStart(2, '0');
  const mm = String(t.getUTCMinutes()).padStart(2, '0');
  return `${t.getUTCDate()} ${MONTHS[t.getUTCMonth()]} ${t.getUTCFullYear()}, ${hh}:${mm}`;
}

function line(b, i) {
  const { hours, days } = lessonShape(b.answers);
  const when = b.wanted_date
    ? `${day(b.wanted_date)}${b.lesson_time ? ` ${b.lesson_time}` : ''}`
      + (b.answers?.Hours ? ` (${hours} h${days > 1 ? ` × ${days} days` : ''})` : days > 1 ? ` (${days} days)` : '')
    : 'no date';
  const discipline = disciplineOf(b.answers);
  const parts = [
    b.tour_title || b.tour_slug,
    when,
    `${b.people ?? 1} ${b.people === 1 ? 'person' : 'people'}`,
    b.kind === 'waitlist' ? 'waitlist' : (STATUS[b.status] ?? b.status),
    discipline ? discipline.toUpperCase() : null,
    b.instructor?.name ? `instructor ${b.instructor.name}` : null,
    bookingRef(b.id),
  ].filter(Boolean);
  return `${i + 1}. ${parts.join(' · ')}`;
}

function reportText(rows, now = Date.now()) {
  const head = `📊 MTANI daily report — ${tbilisiStamp(now)}`;
  if (!rows.length) return `${head}\nNo new bookings in the last 24 h`;

  const perTrip = new Map();
  for (const b of rows) {
    const key = b.tour_title || b.tour_slug || 'Other';
    perTrip.set(key, (perTrip.get(key) ?? 0) + 1);
  }
  const byTrip = [...perTrip.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  return [
    head,
    `New bookings in the last 24 h: ${rows.length}`,
    '',
    'By trip:',
    ...byTrip.map(([title, n]) => `• ${title}: ${n}`),
    '',
    'Bookings:',
    ...rows.map(line),
  ].join('\n');
}

export async function GET(request) {
  if (!cronAuthorized(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const admin = serviceClient();
  if (!admin) {
    console.error('Daily report: SUPABASE_SERVICE_ROLE_KEY is not set.');
    return Response.json({ error: 'Not configured' }, { status: 500 });
  }

  const now = Date.now();
  const { data, error } = await admin
    .from('bookings')
    .select('id, tour_slug, tour_title, kind, wanted_date, lesson_time, people, status, answers, created_at, instructor:instructors(name)')
    .gte('created_at', new Date(now - DAY_MS).toISOString())
    .lte('created_at', new Date(now).toISOString())
    .order('created_at', { ascending: true })
    .limit(500);
  if (error) {
    console.error('Daily report: lookup failed:', error.message);
    await sendTelegram('📊 MTANI daily report: could not read the bookings today. Check Vercel Runtime Logs.');
    return Response.json({ error: 'Lookup failed' }, { status: 500 });
  }

  const sent = await sendTelegram(reportText(data ?? [], now));
  return Response.json({ ok: true, bookings: data?.length ?? 0, sent });
}
