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
//
// The price is ours, not the browser's. The trip is loaded here by slug (as the
// visitor, published only), refused if unknown or not bookable, and the total
// and title are recomputed with lib/pricing.js — the same helper the booking
// dialog uses to show its preview. The post's total and tour_title are ignored.

import { createClient } from '@supabase/supabase-js';
import { bookingRef } from '@/lib/bookingRef';
import { isBookable } from '@/lib/bookable';
import { TOURS } from '@/lib/tours-data';
import { tourOptions } from '@/lib/options';
import { bookingTitle, bookingTotal, findOption, unitPrice } from '@/lib/pricing';
import {
  HOURS_ANSWER, LESSON_MAX_HOURS, LESSON_MIN_HOURS, hourlyRates, validHours,
} from '@/lib/lessons';
import { sendBookingEmail } from '@/lib/bookingEmail';

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

// How many requests one account may send. Generous for a real person (a
// family booking a few trips in one sitting stays well under), tight enough
// that a script cannot flood Telegram, the sheet and the customer's inbox.
// RATE-LIMITS.sql enforces the same numbers in the database, so a direct
// insert that skips this route is held to them too; keep the two in step.
const RATE_LIMITS = [
  { ms: 60 * 60 * 1000, max: 5, error: 'Sorry — you have sent a lot of booking requests in the last hour. Please try again later, or write to us in the chat.' },
  { ms: 24 * 60 * 60 * 1000, max: 20, error: 'Sorry — you have sent a lot of booking requests today. Please try again tomorrow, or write to us in the chat.' },
];

const MAX_PEOPLE = 50;

/** Today's date in Georgia (UTC+4 all year, no daylight saving), as YYYY-MM-DD. */
const georgiaToday = () => new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString().slice(0, 10);

/** True for a real calendar date written as YYYY-MM-DD (so not 2026-02-30). */
function isCalendarDate(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.toISOString().slice(0, 10) === value;
}

/**
 * Why the date cannot be booked, or null when it can. An absent date is
 * allowed, as before (alreadyTaken() skips it too). Plain string comparison is
 * enough: YYYY-MM-DD sorts the same way as the dates it names.
 */
function dateProblem(value) {
  if (value == null || value === '') return null;
  if (typeof value !== 'string' || !isCalendarDate(value.trim())) return 'Please pick a valid date.';
  const today = georgiaToday();
  const latest = `${Number(today.slice(0, 4)) + 2}${today.slice(4)}`;
  if (value.trim() < today) return 'That date has already passed. Please pick another.';
  if (value.trim() > latest) return 'Please pick a date within the next two years.';
  return null;
}

/**
 * The first limit this account is over, as its message, or null. Counted with
 * the visitor's own token: "read own bookings" lets them see exactly their own
 * rows. A failed count lets the request through (logged) rather than blocking
 * a real customer; the database trigger is the hard stop.
 */
async function overLimit(supabase, userId) {
  const results = await Promise.all(RATE_LIMITS.map(({ ms }) => supabase
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', new Date(Date.now() - ms).toISOString())));

  for (let i = 0; i < RATE_LIMITS.length; i += 1) {
    const { count, error } = results[i];
    if (error) { console.error('Booking rate count failed:', error.message); continue; }
    if ((count ?? 0) >= RATE_LIMITS[i].max) return RATE_LIMITS[i].error;
  }
  return null;
}

/**
 * The trip a request is for, found the way the trip page finds it, or an
 * { error, status } to answer with.
 *
 * A published row in the database wins. With no such row the static list is
 * trusted only for its `demo` trips (the catalogue shows those next to the
 * database rows) or when the database has no published trips at all (the
 * site's fallback for an empty database). Anything else is unknown. If the
 * database cannot be asked, nothing is guessed: the visitor is told to retry.
 * Runs as the visitor, so "published tours are public" is what they can see.
 */
async function findTrip(supabase, slug) {
  const retry = { error: 'Could not check that trip right now. Please try again in a moment.', status: 503 };
  const unknown = { error: 'That trip could not be found.', status: 400 };

  const { data, error } = await supabase
    .from('tours').select('*').eq('slug', slug).eq('published', true).maybeSingle();
  if (error) {
    console.error('Booking trip lookup failed:', error.message);
    return retry;
  }
  if (data) return { trip: data };

  const local = TOURS.find((t) => t.slug === slug);
  if (!local) return unknown;
  if (local.demo) return { trip: local };

  const { count, error: countError } = await supabase
    .from('tours').select('slug', { count: 'exact', head: true }).eq('published', true);
  if (countError) {
    console.error('Booking trip count failed:', countError.message);
    return retry;
  }
  return count > 0 ? unknown : { trip: local };
}

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

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return Response.json({ error: 'Malformed request.' }, { status: 400 });
  }

  const badDate = dateProblem(body.wanted_date);
  if (badDate) return Response.json({ error: badDate }, { status: 400 });

  // a missing count still means one person, as before; a count that is there
  // but out of range is refused rather than quietly changed
  if (body.people != null
    && !(Number.isInteger(body.people) && body.people >= 1 && body.people <= MAX_PEOPLE)) {
    return Response.json({ error: `Please choose between 1 and ${MAX_PEOPLE} people.` }, { status: 400 });
  }

  const tooMany = await overLimit(supabase, user.id);
  if (tooMany) return Response.json({ error: tooMany }, { status: 429 });

  const slug = clean(body.tour_slug, 120);
  if (!slug) return Response.json({ error: 'Missing trip.' }, { status: 400 });

  const kind = ['trip', 'lesson', 'waitlist'].includes(body.kind) ? body.kind : 'trip';

  // The trip, its title and the total all come from our own data. The browser's
  // tour_title and total are ignored: they could say anything.
  const found = await findTrip(supabase, slug);
  if (found.error) return Response.json({ error: found.error }, { status: found.status });
  const { trip } = found;
  if (!isBookable(trip)) {
    return Response.json({ error: 'That trip cannot be booked right now.' }, { status: 400 });
  }

  // All the browser gets to say about price is WHICH option it picked, by name;
  // the price itself is the trip's. A trip with options needs one of them
  // (the page always picks one); a waitlist has no price, so it may go without.
  const option = findOption(trip, body.option, body.tour_title);
  if (!option && kind !== 'waitlist' && tourOptions(trip).length > 0) {
    return Response.json({ error: 'Please choose one of the options for this trip.' }, { status: 400 });
  }

  const people = body.people ?? 1;

  // A lesson with a rate table is priced by group size and hours: both must
  // be in range, and the hours are kept with the answers. A waitlist request
  // has no price, so it needs neither.
  const rates = kind !== 'waitlist' ? hourlyRates(trip) : null;
  const hours = rates ? body.hours : null;
  if (rates) {
    if (!validHours(hours)) {
      return Response.json({ error: `Please choose between ${LESSON_MIN_HOURS} and ${LESSON_MAX_HOURS} hours.` }, { status: 400 });
    }
    if (people > rates.length) {
      return Response.json({ error: `Please choose between 1 and ${rates.length} people.` }, { status: 400 });
    }
  }

  // A trip with no price set (or a waitlist) has no total, rather than a
  // made-up 0. Rounded to cents so float noise never reaches the row.
  const unit = unitPrice(trip, option);
  const priced = kind !== 'waitlist'
    && (rates != null || (unit != null && unit !== '' && Number.isFinite(Number(unit))));
  const total = priced ? Math.round(bookingTotal(trip, option, people, hours) * 100) / 100 : null;
  if (total != null && Number.isFinite(body.total) && body.total !== total) {
    console.warn(`Booking total differs: browser said ${body.total}, server says ${total} (${slug})`);
  }

  const row = {
    tour_slug: trip.slug,
    tour_title: clean(bookingTitle(trip, option), 200),
    kind,
    wanted_date: typeof body.wanted_date === 'string' ? clean(body.wanted_date, 10) : null,
    people,
    total,
    lesson_time: clean(body.lesson_time, 20),
    skill_level: clean(body.skill_level, 40),
    lesson_type: clean(body.lesson_type, 40),
    // the hours of a rate-table lesson ride with the answers (no column for
    // them); ours, checked above, win over anything the post put there
    answers: hours != null
      ? { ...(cleanAnswers(body.answers) ?? {}), [HOURS_ANSWER]: String(hours) }
      : cleanAnswers(body.answers),
    confirmed_items: cleanItems(body.confirmed_items),
    user_id: user.id,
    name: clean(body.name, 120) ?? clean(user.user_metadata?.full_name, 120),
    // the account's own address, not whatever the post says
    email: user.email ?? null,
    phone: clean(body.phone, 40),
  };

  // The dialog already greys out what is taken, but two people can have it
  // open at once, so the check is repeated here against the live table.
  const clash = await alreadyTaken(supabase, row);
  if (clash) return Response.json({ error: clash }, { status: 409 });
  // the row is the visitor's own, so "read own bookings" lets it come back —
  // that is where the reference comes from
  const { data: saved, error } = await supabase
    .from('bookings').insert(row).select('id, created_at, status').single();

  if (error) {
    // two requests sent at the same moment can both pass the count above; the
    // database trigger from RATE-LIMITS.sql then refuses the extra one
    if (error.code === 'PT429' || /rate_limited/.test(error.message ?? '')) {
      return Response.json({ error: RATE_LIMITS[0].error }, { status: 429 });
    }
    console.error('Booking insert failed:', error.message);
    return Response.json({ error: 'Could not save the request.' }, { status: 500 });
  }

  const ref = bookingRef(saved.id);
  // ref and status are what the sheet uses to find this row again when the
  // admin confirms or declines it; status is the column default, 'new'
  // category is for the sheet only (it keeps winter trips); it is not a column of the row
  const record = { ...row, id: saved.id, ref, status: saved.status ?? 'new', created_at: saved.created_at, category: trip.category ?? null };
  const site = new URL(request.url).origin;

  // copies and the customer's email, best effort, never blocking the answer
  const [, , mail] = await Promise.allSettled([
    notifyTelegram(record), appendToSheet(record), sendBookingEmail(record, site, record.kind === 'waitlist' ? 'waitlist' : 'received'),
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
