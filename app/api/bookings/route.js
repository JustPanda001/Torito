// Receives a booking or lesson request and fans it out.
//
// The database row is the record. Telegram and the Google Sheet are copies:
// they are attempted after the row is safely stored, and a failure in either
// is logged rather than returned, because a webhook being down is not a reason
// to tell a visitor their request did not go through.
//
// This runs on the server so the Telegram token and the sheet's webhook URL
// stay out of the browser bundle. Both are optional — configure one, both, or
// neither, and the rest still works.

import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const {
  NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: SUPABASE_KEY,
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,
  SHEETS_WEBHOOK_URL,
  SHEETS_WEBHOOK_SECRET,
} = process.env;

/** Trims and caps a field, so one oversized paste cannot fill the table. */
const clean = (value, max = 200) =>
  (typeof value === 'string' ? value.trim().slice(0, max) : null) || null;

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Malformed request.' }, { status: 400 });
  }

  const row = {
    tour_slug: clean(body.tour_slug, 120),
    tour_title: clean(body.tour_title, 200),
    kind: ['trip', 'lesson', 'waitlist'].includes(body.kind) ? body.kind : 'trip',
    wanted_date: clean(body.wanted_date, 10),
    people: Number.isInteger(body.people) && body.people > 0 && body.people < 100 ? body.people : 1,
    total: Number.isFinite(body.total) ? body.total : null,
    lesson_time: clean(body.lesson_time, 20),
    skill_level: clean(body.skill_level, 40),
    lesson_type: clean(body.lesson_type, 40),
    name: clean(body.name, 120),
    email: clean(body.email, 160),
    phone: clean(body.phone, 40),
  };

  if (!row.tour_slug || !row.tour_title) {
    return Response.json({ error: 'Missing trip.' }, { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  // no .select() on the way back: reading the new row would need a select
  // policy, and a guest is deliberately not allowed to read bookings — asking
  // for it turns a successful insert into an RLS violation
  const { error } = await supabase.from('bookings').insert(row);

  if (error) {
    console.error('Booking insert failed:', error.message);
    return Response.json({ error: 'Could not save the request.' }, { status: 500 });
  }

  // copies, best effort, never blocking the answer to the visitor
  await Promise.allSettled([notifyTelegram(row), appendToSheet(row)]);

  return Response.json({ ok: true });
}

function lines(row) {
  const out = [
    row.kind === 'lesson' ? '🎿 Lesson request' : row.kind === 'waitlist' ? '⏳ Waitlist' : '🏔 Booking request',
    row.tour_title,
    `Date: ${row.wanted_date ?? '—'}${row.lesson_time ? ` at ${row.lesson_time}` : ''}`,
    `People: ${row.people}`,
  ];
  if (row.skill_level) out.push(`Level: ${row.skill_level}`);
  if (row.lesson_type) out.push(`Lesson: ${row.lesson_type}`);
  if (row.total != null) out.push(`Total: ${row.total} GEL`);
  if (row.name) out.push(`Name: ${row.name}`);
  if (row.email) out.push(`Email: ${row.email}`);
  if (row.phone) out.push(`Phone: ${row.phone}`);
  return out;
}

async function notifyTelegram(row) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;

  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: lines(row).join('\n'),
      disable_web_page_preview: true,
    }),
  });

  if (!res.ok) console.error('Telegram notify failed:', res.status, await res.text());
}

async function appendToSheet(row) {
  if (!SHEETS_WEBHOOK_URL) return;

  const res = await fetch(SHEETS_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // the secret is what stops anyone who finds the deployment URL from
    // writing rows into the sheet
    body: JSON.stringify({ secret: SHEETS_WEBHOOK_SECRET ?? '', ...row, created_at: new Date().toISOString() }),
  });

  // A misconfigured web app does not fail: "Who has access" set to anything
  // but Anyone makes Google answer with its sign-in page and a 200, and a
  // mismatched secret makes the script answer "no". Both leave the sheet empty
  // while looking like success, so check what came back rather than the status.
  const reply = (await res.text()).trim();
  if (!res.ok || reply !== 'ok') {
    console.error('Sheet append failed:', res.status, reply.slice(0, 120));
  }
}
