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
//
// Booking needs an account. The request carries the visitor's Supabase access
// token: it is what ties the row to them (so My bookings can list it), and the
// confirmation only ever goes to the email on that account — never an address
// typed into the post, or this would be an open mail relay.

import { createClient } from '@supabase/supabase-js';
import { bookingRef } from '@/lib/bookingRef';

export const runtime = 'nodejs';

const {
  NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: SUPABASE_KEY,
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,
  SHEETS_WEBHOOK_URL,
  SHEETS_WEBHOOK_SECRET,
  RESEND_API_KEY,
  BOOKING_EMAIL_FROM,
  BOOKING_EMAIL_REPLY_TO,
} = process.env;

/** Trims and caps a field, so one oversized paste cannot fill the table. */
const clean = (value, max = 200) =>
  (typeof value === 'string' ? value.trim().slice(0, max) : null) || null;

/** The kit list the visitor ticked, as plain titles. Bounded like the rest. */
function cleanItems(value) {
  if (!Array.isArray(value)) return null;
  const out = value.slice(0, 30).map((v) => clean(v, 120)).filter(Boolean);
  return out.length ? out : null;
}

/**
 * Answers to the trip's own booking questions, as a plain label -> value map.
 *
 * The labels come from the admin panel rather than from a fixed list, so both
 * sides are capped and the whole thing is bounded at twenty entries — this is
 * a public endpoint, and nothing else here would stop a crafted post from
 * writing a megabyte of json into the row.
 */
function cleanAnswers(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const out = {};
  for (const [label, answer] of Object.entries(value).slice(0, 20)) {
    const key = clean(label, 80);
    if (!key) continue;
    if (typeof answer === 'number' && Number.isFinite(answer)) out[key] = answer;
    else {
      const text = clean(answer, 300);
      if (text) out[key] = text;
    }
  }
  return Object.keys(out).length ? out : null;
}

export async function POST(request) {
  const token = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) {
    return Response.json({ error: 'Please sign in to book.' }, { status: 401 });
  }

  // every query below runs as the visitor, so the insert policy's
  // user_id = auth.uid() check holds and the new row can be read back
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: auth, error: authError } = await supabase.auth.getUser(token);
  const user = auth?.user;
  if (authError || !user) {
    return Response.json({ error: 'Your session has expired. Please sign in again.' }, { status: 401 });
  }

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
    answers: cleanAnswers(body.answers),
    confirmed_items: cleanItems(body.confirmed_items),
    user_id: user.id,
    name: clean(body.name, 120) ?? clean(user.user_metadata?.full_name, 120),
    // the account's own address, not whatever the post says
    email: user.email ?? null,
    phone: clean(body.phone, 40),
  };

  if (!row.tour_slug || !row.tour_title) {
    return Response.json({ error: 'Missing trip.' }, { status: 400 });
  }

  // The dialog already greys out what is taken, but two people can have it
  // open at once, so the check is repeated here against the live table.
  const clash = await alreadyTaken(supabase, row);
  if (clash) return Response.json({ error: clash }, { status: 409 });
  // the row is the visitor's own, so "read own bookings" lets it come back —
  // that is where the reference comes from
  const { data: saved, error } = await supabase
    .from('bookings').insert(row).select('id, created_at').single();

  if (error) {
    console.error('Booking insert failed:', error.message);
    return Response.json({ error: 'Could not save the request.' }, { status: 500 });
  }

  const ref = bookingRef(saved.id);
  const record = { ...row, id: saved.id, ref, created_at: saved.created_at };
  const site = new URL(request.url).origin;

  // copies and the customer's email, best effort, never blocking the answer
  const [, , mail] = await Promise.allSettled([
    notifyTelegram(record), appendToSheet(record), emailCustomer(record, site),
  ]);
  if (mail.status === 'rejected') console.error('Confirmation email failed:', mail.reason?.message);

  return Response.json({
    ok: true, id: saved.id, ref, emailed: mail.status === 'fulfilled' && mail.value === true,
  });
}

/**
 * Why this request cannot be taken, or null when it can. A timed booking
 * (lesson, snowmobile, paragliding) owns its slot outright; a trip is refused
 * once the departure would go over capacity. Without booked_slots() in the
 * database this lets everything through, as before.
 */
async function alreadyTaken(supabase, row) {
  if (row.kind === 'waitlist' || !row.wanted_date) return null;

  const { data, error } = await supabase.rpc('booked_slots', { p_slug: row.tour_slug });
  if (error || !Array.isArray(data)) return null;
  const sameDay = data.filter((r) => r.wanted_date === row.wanted_date);

  const { data: trip } = await supabase
    .from('tours').select('capacity, slot_limit').eq('slug', row.tour_slug).maybeSingle();

  if (row.lesson_time) {
    if (trip?.slot_limit === 'unlimited') return null;
    const limit = Number(trip?.slot_limit) || 1;
    const held = sameDay
      .filter((r) => r.lesson_time === row.lesson_time)
      .reduce((n, r) => n + (r.bookings ?? 1), 0);
    return held >= limit
      ? 'Sorry — that time was just booked by someone else. Please pick another.'
      : null;
  }

  if (!trip?.capacity) return null;

  const booked = sameDay.reduce((sum, r) => sum + (r.people ?? 0), 0);
  return booked + row.people > trip.capacity
    ? `Sorry — only ${Math.max(0, trip.capacity - booked)} places are left on that date.`
    : null;
}

function lines(row) {
  const out = [
    row.kind === 'lesson' ? '🎿 Lesson request' : row.kind === 'waitlist' ? '⏳ Waitlist' : '🏔 Booking request',
    row.tour_title,
    `Ref: ${row.ref}`,
    `Date: ${row.wanted_date ?? '—'}${row.lesson_time ? ` at ${row.lesson_time}` : ''}`,
    `People: ${row.people}`,
  ];
  if (row.skill_level) out.push(`Level: ${row.skill_level}`);
  if (row.lesson_type) out.push(`Lesson: ${row.lesson_type}`);
  // the trip's own questions, so a new one shows up here without a code change
  for (const [label, value] of Object.entries(row.answers ?? {})) out.push(`${label}: ${value}`);
  if (row.confirmed_items?.length) out.push(`Confirmed kit: ${row.confirmed_items.join(', ')}`);
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
    body: JSON.stringify({ secret: SHEETS_WEBHOOK_SECRET ?? '', ...row, created_at: row.created_at ?? new Date().toISOString() }),
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

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "28 Dec 2026" from a YYYY-MM-DD, read as a calendar date (no timezone). */
function niceDate(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '');
  return m ? `${Number(m[3])} ${MONTHS_SHORT[Number(m[2]) - 1]} ${m[1]}` : null;
}

const escapeHtml = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

/**
 * The "request received" email, sent through Resend to the account's address.
 * Resolves true once Resend has taken it, false when email is not set up.
 */
async function emailCustomer(row, site) {
  if (!RESEND_API_KEY || !BOOKING_EMAIL_FROM || !row.email) return false;

  const waitlist = row.kind === 'waitlist';
  const date = niceDate(row.wanted_date);
  const details = [
    ['Reference', row.ref],
    ['Trip', row.tour_title],
    date && ['Date', `${date}${row.lesson_time ? ` at ${row.lesson_time}` : ''}`],
    ['People', String(row.people)],
    row.skill_level && ['Level', row.skill_level],
    row.lesson_type && ['Lesson', row.lesson_type],
    ...Object.entries(row.answers ?? {}).map(([k, v]) => [k, String(v)]),
    row.total != null && ['Total', `${row.total} GEL, paid on the day`],
  ].filter(Boolean);

  const hello = row.name ? `Hello ${row.name.split(' ')[0]},` : 'Hello,';
  const lead = waitlist
    ? `You are on the waitlist for ${row.tour_title}. We will write to you as soon as a place frees up.`
    : `Your booking request for ${row.tour_title} has gone through. We will check the date with the guide and email you again to confirm.`;
  const subject = waitlist
    ? `You're on the waitlist — ${row.tour_title} (${row.ref})`
    : `Booking request received — ${row.tour_title} (${row.ref})`;
  const link = `${site}/bookings`;

  const text = [
    hello, '', lead, '',
    ...details.map(([k, v]) => `${k}: ${v}`), '',
    `See all your bookings: ${link}`, '',
    'Reply to this email if anything needs changing.', '', 'Torito',
  ].join('\n');

  const cell = 'padding:8px 0;border-top:1px solid #d8f3e4';
  const html = `<!doctype html><html><body style="margin:0;background:#f4f7f8;font-family:'Segoe UI',system-ui,-apple-system,sans-serif;color:#2f4a55">
<div style="max-width:560px;margin:0 auto;padding:28px 16px">
  <div style="background:#fff;border-radius:20px;padding:28px;box-shadow:0 8px 24px rgba(47,74,85,.08)">
    <p style="margin:0 0 6px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#3f8f80">${waitlist ? 'Waitlist' : 'Request received'}</p>
    <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3">${escapeHtml(row.tour_title)}</h1>
    <p style="margin:0 0 12px;line-height:1.65">${escapeHtml(hello)}</p>
    <p style="margin:0 0 20px;line-height:1.65">${escapeHtml(lead)}</p>
    <table style="width:100%;border-collapse:collapse;font-size:15px">
      ${details.map(([k, v]) => `<tr><td style="${cell};color:#5c7784">${escapeHtml(k)}</td><td style="${cell};text-align:right;font-weight:600">${escapeHtml(v)}</td></tr>`).join('')}
    </table>
    <p style="margin:24px 0 0"><a href="${escapeHtml(link)}" style="display:inline-block;background:#3f8f80;color:#fff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:999px">See my bookings</a></p>
    <p style="margin:20px 0 0;font-size:14px;color:#5c7784;line-height:1.6">Reply to this email if anything needs changing.</p>
  </div>
  <p style="text-align:center;font-size:12px;color:#5c7784;margin:16px 0 0">Torito · Georgia</p>
</div></body></html>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: BOOKING_EMAIL_FROM,
      to: [row.email],
      ...(BOOKING_EMAIL_REPLY_TO ? { reply_to: BOOKING_EMAIL_REPLY_TO } : {}),
      subject,
      text,
      html,
    }),
  });

  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return true;
}
