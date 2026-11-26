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

//
// Two extras for trips that ask for them in admin (today the Gudauri lessons):
// "Assign instructors" picks the instructor as soon as the row is saved (see
// lib/instructors.js), and "Confirm automatically" confirms the request about
// 40 seconds after the "request received" email, with the same email and
// sheet update as the admin's Confirm button (lib/bookingStatus.js). The timer
// runs after the answer has gone back to the visitor; the every-minute sweep
// (/api/cron/auto-confirm) catches any it missed.

import { after } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { bookingRef } from '@/lib/bookingRef';
import { isBookable } from '@/lib/bookable';
import { TOURS } from '@/lib/tours-data';
import { tourOptions } from '@/lib/options';
import { bookingTitle, bookingTotal, findOption, unitPrice } from '@/lib/pricing';
import {
  HOURS_ANSWER, hourlyRates, groupRates, lessonHours, validHours, timeQuestion, spanFull, fitsDay,
  DAYS_ANSWER, lessonDays, validDays, isLesson,
} from '@/lib/lessons';
import { sendBookingEmail } from '@/lib/bookingEmail';
import { bookingQuestions, numberBounds } from '@/lib/bookingQuestions';
import { packageSteps, packageExtra, packageAnswers } from '@/lib/packageBuilder';
import { groupMax, groupsLimit } from '@/lib/groups';
import { SITE_URL } from '@/lib/siteUrl';
import { inSeason } from '@/lib/season';
import { SAME_DAY_LEAD_MINUTES } from '@/lib/lessons';
import { sendTelegram } from '@/lib/telegram';
import { AUTO_CONFIRM_SECONDS, autoConfirm } from '@/lib/bookingStatus';
import { assignInstructor, alertUnassigned, disciplineOf, lessonShape } from '@/lib/instructors';

export const runtime = 'nodejs';
// the automatic confirm waits ~40 s after the answer has been sent
export const maxDuration = 60;

const {
  NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: SUPABASE_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
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

  // one booking is one group: never more people than the trip's group size
  if (kind !== 'waitlist' && people > groupMax(trip)) {
    return Response.json({ error: `One booking can be at most ${groupMax(trip)} people.` }, { status: 400 });
  }

  // What the dialog will not send without, checked again so a hand-made request
  // cannot skip it: a date, the time when the trip asks for one, and every
  // required "Pick one" / free-text answer (a "Pick one" must be one of its
  // choices). Without these a lesson slipped past the hourly slot check and
  // could not be given an instructor (no SKI/SNOWBOARD, no time).
  const timeQ = timeQuestion(trip, bookingQuestions(trip));
  if (kind !== 'waitlist') {
    if (typeof body.wanted_date !== 'string' || !body.wanted_date.trim()) {
      return Response.json({ error: 'Please pick a date.' }, { status: 400 });
    }
    if (timeQ?.required && !clean(body.lesson_time, 20)) {
      return Response.json({ error: 'Please pick a time.' }, { status: 400 });
    }
    const given = body.answers && typeof body.answers === 'object' && !Array.isArray(body.answers) ? body.answers : {};
    for (const q of bookingQuestions(trip)) {
      if (!q.required || q.type === 'number' || (timeQ && q.label === timeQ.label)) continue;
      const value = typeof given[q.label] === 'string' ? given[q.label].trim() : '';
      if (!value || (q.type === 'choice' && !q.options.includes(value))) {
        return Response.json({ error: `Please answer "${q.label}".` }, { status: 400 });
      }
    }
  }

  // A number question with a lowest / highest set must be answered inside it;
  // the counter enforces this in the browser, this keeps a hand-made request out.
  if (kind !== 'waitlist' && body.answers && typeof body.answers === 'object') {
    for (const q of bookingQuestions(trip)) {
      if (q.type !== 'number' || !(q.label in body.answers)) continue;
      const n = Number(body.answers[q.label]);
      const { lo, hi } = numberBounds(q);
      if (!Number.isFinite(n) || (n !== 0 && (n < lo || n > hi))) {
        return Response.json({ error: `"${q.label}" must be between ${lo} and ${Number.isFinite(hi) ? hi : 'any'}.` }, { status: 400 });
      }
    }
  }

  // A lesson with a rate table is priced by group size and hours: both must
  // be in range, and the hours are kept with the answers. A waitlist request
  // has no price, so it needs neither.
  const rates = kind !== 'waitlist' ? hourlyRates(trip) : null;
  const hours = rates ? body.hours : null;
  if (rates) {
    if (!validHours(hours, trip)) {
      const span = lessonHours(trip);
      return Response.json({ error: `Please choose between ${span.min} and ${span.max} hours.` }, { status: 400 });
    }
    if (people > rates.length) {
      return Response.json({ error: `Please choose between 1 and ${rates.length} people.` }, { status: 400 });
    }
  }

  // A trip priced by group size has one flat total per size: the group cannot
  // be bigger than the table (the Group size check above still applies too).
  const groupTable = kind !== 'waitlist' ? groupRates(trip) : null;
  if (groupTable && people > groupTable.length) {
    return Response.json({ error: `Please choose between 1 and ${groupTable.length} people.` }, { status: 400 });
  }

  // A lesson over several days in a row (admin "How many days?"): same time
  // and hours each day. Without a days question it is one day, as before.
  const dayRange = isLesson(trip) && kind !== 'waitlist' ? lessonDays(trip) : { min: 1, max: 1 };
  const multiDay = dayRange.max > 1;
  const days = multiDay ? body.days : 1;
  if (multiDay && !validDays(days, trip)) {
    return Response.json({ error: `Please choose between ${dayRange.min} and ${dayRange.max} days.` }, { status: 400 });
  }

  // A build-your-own package: every required step picked, every pick one of
  // the trip's own options. Only the names come from the browser.
  const steps = kind !== 'waitlist' ? packageSteps(trip) : null;
  const pkg = steps && body.package && typeof body.package === 'object' && !Array.isArray(body.package)
    ? body.package : null;
  if (steps && packageExtra(steps, pkg, people) == null) {
    return Response.json({ error: 'Please pick an option for every step of the package.' }, { status: 400 });
  }

  // A trip with no price set (or a waitlist) has no total, rather than a
  // made-up 0. Rounded to cents so float noise never reaches the row.
  const unit = unitPrice(trip, option);
  const priced = kind !== 'waitlist'
    && (rates != null || groupTable != null || steps != null || (unit != null && unit !== '' && Number.isFinite(Number(unit))));
  const total = priced ? Math.round(bookingTotal(trip, option, people, hours, pkg, days) * 100) / 100 : null;
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
    // only a trip with a time picker has a time; anything else would be
    // counted as an hour slot by the database without being one we offer
    lesson_time: timeQ ? clean(body.lesson_time, 20) : null,
    skill_level: clean(body.skill_level, 40),
    lesson_type: clean(body.lesson_type, 40),
    // the hours of a rate-table lesson ride with the answers (no column for
    // them); ours, checked above, win over anything the post put there
    answers: hours != null
      ? {
        ...(cleanAnswers(body.answers) ?? {}),
        [HOURS_ANSWER]: String(hours),
        // a multi-day lesson: how many days and the last one, worked out here
        ...(multiDay ? { [DAYS_ANSWER]: String(days), 'End date': lastDay(body.wanted_date, days) } : {}),
      }
      : steps
        // the package plan, as checked above, wins over anything posted
        ? { ...(cleanAnswers(body.answers) ?? {}), ...packageAnswers(steps, pkg) }
        : cleanAnswers(body.answers),
    confirmed_items: cleanItems(body.confirmed_items),
    user_id: user.id,
    name: clean(body.name, 120) ?? clean(user.user_metadata?.full_name, 120),
    // the account's own address, not whatever the post says
    email: user.email ?? null,
    phone: clean(body.phone, 40),
  };

  // what the calendar greys out by the clock and the season, checked again
  // here so a hand-made request cannot get round it
  const offWhen = whenProblem(row, trip, days);
  if (offWhen) return Response.json({ error: offWhen }, { status: 400 });

  // The dialog already greys out what is taken, but two people can have it
  // open at once, so the check is repeated here against the live table (and
  // once more inside the insert, by the bookings_capacity_guard trigger).
  const clash = await alreadyTaken(supabase, row, trip, hours, days);
  if (clash) return Response.json({ error: clash }, { status: 409 });
  // the row is the visitor's own, so "read own bookings" lets it come back —
  // that is where the reference comes from
  // Saved with the service key, here and only here (SEC-01): visitors can no
  // longer insert into bookings themselves, so the price, title and email are
  // always the ones this route worked out. user_id is the verified caller.
  // The rate-limit trigger still counts this account's requests.
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Booking insert: SUPABASE_SERVICE_ROLE_KEY is not set.');
    return Response.json({ error: 'Could not save the request.' }, { status: 500 });
  }
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  // "Confirm automatically" (admin, per trip): when the confirm is due
  const autoAt = trip.auto_confirm === true && kind !== 'waitlist'
    ? new Date(Date.now() + AUTO_CONFIRM_SECONDS * 1000).toISOString() : null;
  const { data: saved, error } = await admin
    .from('bookings')
    .insert({ ...row, user_id: user.id, ...(autoAt ? { auto_confirm_at: autoAt } : {}) })
    .select('id, created_at, status').single();

  if (error) {
    // the database's own check (bookings_capacity_guard): someone else took
    // the last place between our check above and this insert
    if (/slot_full/.test(error.message ?? '')) {
      return Response.json({
        error: row.lesson_time
          ? 'Sorry — that time was just booked by someone else. Please pick another.'
          : 'Sorry — that date is fully booked. Please pick another.',
      }, { status: 409 });
    }
    // two requests sent at the same moment can both pass the count above; the
    // database trigger from RATE-LIMITS.sql then refuses the extra one
    if (/too many open requests/.test(error.message ?? '')) {
      return Response.json({
        error: 'You already have several requests waiting for confirmation. Please wait for us to confirm them, or cancel one in My bookings.',
      }, { status: 429 });
    }
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
  const site = SITE_URL;

  // "Assign instructors" (admin, per trip): who teaches it. Never blocks the
  // booking: nobody free, or the call failing, leaves it unassigned + alert.
  let staff = null;
  if (trip.assign_instructors === true && kind !== 'waitlist') {
    const picked = await assignInstructor(admin, saved.id);
    const { hours: h, days: d } = lessonShape(row.answers);
    staff = {
      instructor: picked?.name ?? null,
      discipline: picked?.discipline ?? disciplineOf(row.answers),
      hours: h,
      days: d,
    };
  }

  // copies and the customer's email, best effort, never blocking the answer
  const [, , mail] = await Promise.allSettled([
    notifyTelegram(record, staff, Boolean(autoAt)),
    appendToSheet(staff ? { ...record, ...staff, instructor_row: true } : record),
    sendBookingEmail(record, site, record.kind === 'waitlist' ? 'waitlist' : 'received'),
    staff && !staff.instructor ? alertUnassigned(record, staff.discipline) : null,
  ]);
  if (mail.status === 'rejected') console.error('Confirmation email failed:', mail.reason?.message);

  // the automatic confirm, once the visitor has their answer; if this is cut
  // short, the every-minute sweep confirms it instead (the update is
  // conditional, so only one of the two ever emails)
  if (autoAt) {
    after(async () => {
      await new Promise((resolve) => { setTimeout(resolve, AUTO_CONFIRM_SECONDS * 1000 + 1500); });
      await autoConfirm(saved.id, admin);
    });
  }

  return Response.json({
    ok: true, id: saved.id, ref, emailed: mail.status === 'fulfilled' && mail.value === true,
  });
}

/**
 * Why this request cannot be taken, or null when it can. A timed booking
 * (lesson, snowmobile, paragliding) owns its slot outright; a trip is refused
 * once its date holds as many groups as "Groups at the same time" allows. Without booked_slots() in the
 * database this lets everything through, as before.
 */
async function alreadyTaken(supabase, row, tour, hours, days = 1) {
  if (row.kind === 'waitlist' || !row.wanted_date) return null;

  // the day closes an hour after the last time offered; a lesson that would
  // run past it is refused, booked_slots() or not
  if (row.lesson_time) {
    const offered = timeQuestion(tour, bookingQuestions(tour))?.options ?? [];
    if (!fitsDay(row.lesson_time, hours ?? 1, offered)) {
      return 'Sorry — a lesson that long would run past closing time. Please pick an earlier time or fewer hours.';
    }
  }

  const { data, error } = await supabase.rpc('booked_slots', { p_slug: row.tour_slug });
  // could not check what is booked: refuse rather than risk a double booking (SEC-11)
  if (error || !Array.isArray(data)) return 'Sorry — we could not check that date just now. Please try again in a moment.';
  const sameDay = data.filter((r) => r.wanted_date === row.wanted_date);
  // every day a multi-day lesson covers
  const covered = Array.from({ length: Math.max(1, days) }, (_, k) => lastDay(row.wanted_date, k + 1));

  const { data: trip } = await supabase
    .from('tours').select('slot_limit').eq('slug', row.tour_slug).maybeSingle();
  const limit = groupsLimit(trip);
  if (limit === Infinity) return null;

  if (row.lesson_time) {
    // a lesson holds every hour it covers (start + hours − 1)
    const taken = covered.find((day) => spanFull(data.filter((r) => r.wanted_date === day), row.lesson_time, hours ?? 1, limit));
    if (!taken) return null;
    return covered.length > 1
      ? `Sorry — ${row.lesson_time} on ${taken} is already booked. Please pick other dates or another time.`
      : 'Sorry — that time was just booked by someone else. Please pick another.';
  }

  // a trip's date takes `limit` groups, whatever their size. booked_slots()
  // returns one row per (date, time, hours) with a `bookings` count, so the
  // groups are the sum of those counts, not the number of rows.
  const groups = sameDay.reduce((n, r) => n + (Number(r.bookings) || 1), 0);
  return groups >= limit
    ? 'Sorry — that date is fully booked. Please pick another.'
    : null;
}

/**
 * Why this date or time cannot be booked by the clock or the season, or null.
 * The calendar already greys these out; this keeps a hand-made request to the
 * same rules: every day the booking covers (a multi-day lesson's too) inside
 * the trip's season, a time that is one of the times offered, and today's
 * times only with SAME_DAY_LEAD_MINUTES of notice in Tbilisi.
 */
function whenProblem(row, tour, days = 1) {
  if (row.kind === 'waitlist' || !row.wanted_date) return null;

  const [y, m, d] = row.wanted_date.split('-').map(Number);
  for (let k = 0; k < Math.max(1, days); k += 1) {
    if (!inSeason(tour, new Date(y, m - 1, d + k))) {
      return days > 1
        ? 'Sorry — those days run outside the season. Please pick other dates or fewer days.'
        : 'Sorry — that date is outside the season. Please pick another.';
    }
  }

  if (!row.lesson_time) return null;
  const offered = timeQuestion(tour, bookingQuestions(tour))?.options ?? [];
  if (offered.length && !offered.includes(row.lesson_time)) {
    return 'Please pick one of the times offered.';
  }
  if (row.wanted_date === georgiaToday()) {
    const now = new Date(Date.now() + 4 * 60 * 60 * 1000);
    const nowMin = now.getUTCHours() * 60 + now.getUTCMinutes();
    const [hh, mm] = row.lesson_time.split(':').map(Number);
    if (hh * 60 + (mm || 0) < nowMin + SAME_DAY_LEAD_MINUTES) {
      return 'Sorry — that time has passed or starts too soon to book online. Please pick a later time, or write to us in the chat.';
    }
  }
  return null;
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

async function notifyTelegram(row, staff = null, auto = false) {
  const out = lines(row);
  // trips that assign instructors say who got it (or that nobody is free yet)
  if (staff) out.push(`Instructor: ${staff.instructor ?? 'UNASSIGNED'}`);
  // a trip with "Confirm automatically" on
  if (auto) out.push(`Auto-confirms in ~${AUTO_CONFIRM_SECONDS} s`);
  await sendTelegram(out.join('\n'));
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

/** The date `days` days in a row from `start` ends on, as YYYY-MM-DD (start counts as day 1). */
function lastDay(start, days) {
  const [y, m, d] = String(start).split('-').map(Number);
  const end = new Date(Date.UTC(y, m - 1, d + Math.max(1, days) - 1));
  return end.toISOString().slice(0, 10);
}
