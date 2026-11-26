// Instructor lessons are a different shape of product from a trip.
//
// A trip goes somewhere: it has a departure point, transport, an itinerary and
// a fixed departure time. A lesson does none of that — the visitor turns up at
// the slope and tells us when they want it, how many of them there are, what
// they can already do and what they want to learn. So the listing, the booking
// form and the admin form all drop the travel half for this category.

import { subtypeOf } from './catalog';
import { iso, tbilisiNow } from './season';

export const LESSON = 'lessons';
export const FREERIDE = 'freeride';

/** True for instructor lessons, which have no journey attached. */
export function isLesson(tour) {
  return subtypeOf(tour) === LESSON;
}

// Booked by the hour on a single day rather than as a departure. Lessons ask
// a few more questions on top; snowmobile and paragliding only need the slot.
const TIMED = [LESSON, 'snowmobile', 'paragliding'];

/** True for anything booked as a time slot on a day. */
export function isTimed(tour) {
  return TIMED.includes(subtypeOf(tour));
}

/** Freeride weeks do travel — several mountains, pickups and drop-offs. */
export function isFreeride(tour) {
  return subtypeOf(tour) === FREERIDE;
}

// what the visitor can already do
export const SKILL_LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

// what they want out of the lesson
export const LESSON_TYPES = ['Beginner lesson', 'Freestyle', 'Freeride'];

// Typical slots rather than a free-form clock: it is a request, and an
// instructor's day is blocked out in half-days anyway.
export const LESSON_TIMES = [
  '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00',
];

// ---- the time picker, as a booking question ----
//
// For lessons, snowmobile and paragliding the "What time?" buttons are an
// ordinary booking question in the admin panel: a "Pick one" whose choices are
// all times (11:00, 12:30 …). That question is drawn as the time picker —
// booked times grey out — and its answer is the booking's time. A service
// that has never been given one gets the default below; one whose question
// was deleted on purpose gets no time picker at all.

const TIME = /^\d{1,2}:\d{2}$/;

/** A "Pick one" whose every choice is a clock time. */
export function isTimeQuestion(q) {
  const options = Array.isArray(q?.options) ? q.options.map((o) => String(o).trim()).filter(Boolean) : [];
  return (q?.type ?? 'choice') === 'choice' && options.length > 0 && options.every((o) => TIME.test(o));
}

/** What a timed service starts with in the admin panel. */
export const defaultTimeQuestion = () => ({
  label: 'What time?', type: 'choice', options: [...LESSON_TIMES], required: true, hint: '',
});

/** The time question this service books with, or null for none. */
export function timeQuestion(tour, questions) {
  if (!isTimed(tour)) return null;
  const own = questions.find(isTimeQuestion);
  if (own) return own;
  const raw = Array.isArray(tour?.booking_fields) ? tour.booking_fields : [];
  return raw.some((q) => q?.type === 'no_times') ? null : defaultTimeQuestion();
}

// ---- lessons priced by the hour and the size of the group ----
//
// A lesson can carry a rate table: what one hour costs for 1, 2, 3 …
// people, one rate per size up to the trip's Group size maximum. The total is
// then rate[people] × hours, and the visitor picks the hours (2 to 8) as well
// as the group size (up to the table's length). A lesson without a table
// keeps the plain price-per-person rule in lib/pricing.js.
//
// No column of its own: the table rides in tours.booking_fields as one hidden
// entry, { type: 'hourly_rates', rates: [130, 175, 220, 260] } — rates[0] is
// for one person. It has no label, so bookingQuestions() never shows it as a
// question (the same trick as the 'no_times' entry). The admin form writes it.

export const HOURLY_RATES = 'hourly_rates';

// whole hours a lesson can be booked for
export const LESSON_MIN_HOURS = 2;
export const LESSON_MAX_HOURS = 8;

// the answers key a booking's hours are stored under (bookings has no column
// for them), e.g. { "Hours": "3" }
export const HOURS_ANSWER = 'Hours';

// the biggest group the admin's "Group size" dropdown offers. A lesson's rate
// table has one rate per group size, up to that trip's Group size maximum.
export const LESSON_MAX_GROUP = 12;

// what the admin form offers to fill in, per hour for 1, 2, 3 … people
export const SUGGESTED_HOURLY_RATES = [130, 175, 220, 260, 300, 340, 380, 420, 460, 500, 540, 580];

/**
 * Reads a "Group size" text such as "1 – 5 people" or "1 – 4 people, one
 * pilot each" into { min, max, note }, or null when it starts with no number.
 * `note` is whatever follows the numbers, kept so saving never loses it.
 */
export function parseGroupSize(text) {
  const m = String(text ?? '').match(/^\s*(\d+)\s*(?:[–—-]\s*(\d+))?\s*(?:people|person)?\s*(.*)$/i);
  if (!m) return null;
  const a = Number(m[1]);
  const b = m[2] != null ? Number(m[2]) : a;
  return { min: Math.min(a, b), max: Math.max(a, b), note: m[3].replace(/^,\s*/, '').trim() };
}

/** The other way round: { min, max, note } back to "1 – 5 people". */
export function formatGroupSize({ min, max, note = '' }) {
  const base = min === max ? `${max} ${max === 1 ? 'person' : 'people'}` : `${min} – ${max} people`;
  return note ? `${base}, ${note}` : base;
}

/** The hidden entry in booking_fields that holds the rate table, or null. */
export function ratesEntry(fields) {
  return (Array.isArray(fields) ? fields : []).find((q) => q?.type === HOURLY_RATES) ?? null;
}

/**
 * Per-hour rates by group size ([1 person, 2, 3, 4]) for a lesson, or null
 * when it has none — then it is priced the old way. A table with any missing,
 * zero or non-number rate counts as none, so a half-typed one never prices.
 */
export function hourlyRates(tour) {
  if (!isLesson(tour)) return null;
  const raw = ratesEntry(tour?.booking_fields)?.rates;
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > LESSON_MAX_GROUP) return null;
  const rates = raw.map(Number);
  return rates.every((r) => Number.isFinite(r) && r > 0) ? rates : null;
}

// ---- trips priced by the size of the group, as one flat total ----
//
// A trip (not an hourly lesson) can carry a group price table: the TOTAL for
// the whole booking at 1, 2, 3 … people — not per person and not per hour.
// Gudauri Freeride: 1 person 1350 ₾, 2 people 1560 ₾, 3 people 1890 ₾.
//
// Like the hourly table it rides in tours.booking_fields as one hidden entry
// with no label (so bookingQuestions() never shows it):
//   { type: 'group_rates', rates: [1350, 1560, 1890] }
// rates[i] is the total for i + 1 people, and the table's length is the most
// people one booking can bring (together with the trip's Group size). The admin
// form writes it.

export const GROUP_RATES = 'group_rates';

// the most group sizes a table can list; matches the admin's Group size dropdown
export const GROUP_RATES_MAX = 30;

/** The hidden entry in booking_fields that holds the group price table, or null. */
export function groupRatesEntry(fields) {
  return (Array.isArray(fields) ? fields : []).find((q) => q?.type === GROUP_RATES) ?? null;
}

/**
 * Total prices by group size ([1 person, 2, 3 …]) for a trip priced that way,
 * or null when it has none. A table with any missing, zero or non-number
 * price counts as none, so a half-typed one never prices. An hourly lesson
 * table wins: a lesson never has both.
 */
export function groupRates(tour) {
  if (hourlyRates(tour)) return null;
  const raw = groupRatesEntry(tour?.booking_fields)?.rates;
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > GROUP_RATES_MAX) return null;
  const rates = raw.map(Number);
  return rates.every((r) => Number.isFinite(r) && r > 0) ? rates : null;
}

/** The lowest price per person across a group table, e.g. 630 for [1350, 1560, 1890]. */
export function lowestPerPerson(rates) {
  return Math.round(Math.min(...rates.map((r, i) => r / (i + 1))));
}

// ---- the hours and people counters, as booking questions ----
//
// A priced lesson's "How many hours?" and "How many people?" counters are
// ordinary "A number" questions in the admin panel, like the time picker:
// their wording, note, and (for hours) lowest/highest come from there. They
// are tagged with a role; an older question is recognised by its wording.

export const HOURS_ROLE = 'hours';
export const PEOPLE_ROLE = 'people';

const HOURS_WORDS = /hour|საათ|час|小时/i;
const PEOPLE_WORDS = /people|person|guest|ადამიან|человек|人/i;

/** The admin's hours counter question. */
export const isHoursQuestion = (q) => q?.type === 'number'
  && (q.role === HOURS_ROLE || (!q.role && HOURS_WORDS.test(String(q.label ?? ''))));

/** The admin's people counter question. */
export const isPeopleQuestion = (q) => q?.type === 'number'
  && (q.role === PEOPLE_ROLE || (!q.role && PEOPLE_WORDS.test(String(q.label ?? ''))));

/** What a lesson starts with in the admin panel. */
export const defaultHoursQuestion = () => ({
  label: 'How many hours?', type: 'number', min: LESSON_MIN_HOURS, max: LESSON_MAX_HOURS,
  unit: 'hours', required: true, hint: '', role: HOURS_ROLE,
});
export const defaultPeopleQuestion = (max = 4) => ({
  label: 'How many people?', type: 'number', min: 1, max,
  unit: 'people', required: true, hint: 'Everyone in the group is taught together', role: PEOPLE_ROLE,
});

/**
 * The hours a lesson can be booked for, from its admin hours question:
 * { min, max }, falling back to 2–8 for anything missing or odd.
 */
export function lessonHours(tour) {
  const q = (Array.isArray(tour?.booking_fields) ? tour.booking_fields : []).find(isHoursQuestion);
  const whole = (v) => (v === '' || v == null ? null : (Number.isInteger(Number(v)) && Number(v) > 0 ? Number(v) : null));
  let min = whole(q?.min) ?? LESSON_MIN_HOURS;
  let max = whole(q?.max) ?? LESSON_MAX_HOURS;
  if (min > max) [min, max] = [max, min];
  return { min, max };
}

/** True for a whole number of hours this lesson can be booked for. */
export function validHours(hours, tour = null) {
  const { min, max } = tour ? lessonHours(tour) : { min: LESSON_MIN_HOURS, max: LESSON_MAX_HOURS };
  return Number.isInteger(hours) && hours >= min && hours <= max;
}

// ---- lessons over several days ----
//
// A lesson can be booked for several days in a row: the same start time and
// the same hours each day, in one booking. The admin's "How many days?"
// number question (role 'days') sets the lowest and highest; without one a
// lesson is a single day, as before. The price is rate × hours × days, and
// every day must be free at that time. The days ride in the answers as
// { "Days": "3" } (bookings has no column for them), next to "End date".

export const DAYS_ROLE = 'days';
export const DAYS_ANSWER = 'Days';
const DAYS_WORDS = /days?|დღ|дн|день|天/i;

/** The admin's days counter question. */
export const isDaysQuestion = (q) => q?.type === 'number'
  && (q.role === DAYS_ROLE || (!q.role && DAYS_WORDS.test(String(q.label ?? '')) && !HOURS_WORDS.test(String(q.label ?? ''))));

/** What a lesson gets in the admin panel: 1 to 7 days. */
export const defaultDaysQuestion = () => ({
  label: 'How many days?', type: 'number', min: 1, max: 7,
  unit: 'days', required: true, hint: 'Same time and length each day, on days in a row', role: DAYS_ROLE,
});

/** The days a lesson can be booked for: { min, max }, or 1–1 with no days question. */
export function lessonDays(tour) {
  const q = (Array.isArray(tour?.booking_fields) ? tour.booking_fields : []).find(isDaysQuestion);
  if (!q) return { min: 1, max: 1 };
  const whole = (v) => (v === '' || v == null ? null : (Number.isInteger(Number(v)) && Number(v) > 0 ? Number(v) : null));
  let min = whole(q.min) ?? 1;
  let max = Math.min(whole(q.max) ?? 7, 30);
  if (min > max) [min, max] = [max, min];
  return { min, max };
}

/** True for a whole number of days this lesson can be booked for. */
export function validDays(days, tour) {
  const { min, max } = lessonDays(tour);
  return Number.isInteger(days) && days >= min && days <= max;
}

// ---- slots that can no longer be booked today ----

// How much notice we need for a same-day booking, in minutes. A slot that
// starts sooner than this (Tbilisi time) cannot be picked online; the visitor
// can still ask in the chat. Change the number to change the rule: 120 = 2 hours.
export const SAME_DAY_LEAD_MINUTES = 120;

const slotMinutes = (slot) => {
  const [h, m] = String(slot).split(':').map(Number);
  return h * 60 + (m || 0);
};

/**
 * Why a slot on this day cannot be booked any more, by the clock alone:
 * 'passed' (already started in Tbilisi), 'soon' (inside the lead time) or null.
 * Whether someone else holds it is availability's job, not this one.
 */
export function slotTimeState(date, slot, now = tbilisiNow()) {
  if (!date) return null;
  const day = iso(date);
  const today = iso(now.today);
  if (day < today) return 'passed';
  if (day > today) return null;
  const start = slotMinutes(slot);
  if (start <= now.minutes) return 'passed';
  return start < now.minutes + SAME_DAY_LEAD_MINUTES ? 'soon' : null;
}

// ---- a lesson longer than one hour holds every hour it covers ----
//
// A 4-hour lesson at 10:00 holds 10:00, 11:00, 12:00 and 13:00, and each of
// those hours counts one booking against the trip's slot_limit. The day ends
// one hour after the last time offered (times 10:00–16:00 → 17:00), so a
// lesson that would run past that cannot start there. Shared by the booking
// dialog (lib/availability.js) and the server check (app/api/bookings).

/** Whole hours a booked row lasts: its hours, or 1 when it has none. */
export function spanHours(value) {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

/** Bookings already holding this slot: every row whose span covers it. */
export function slotLoad(rows, slot) {
  const at = slotMinutes(slot);
  return rows.reduce((n, r) => {
    if (!r?.lesson_time) return n;
    const start = slotMinutes(r.lesson_time);
    return at >= start && at < start + spanHours(r.hours) * 60 ? n + (r.bookings ?? 1) : n;
  }, 0);
}

/** True when a lesson of this length starting here ends by the day's close. */
export function fitsDay(start, hours, offered) {
  const times = (offered ?? []).map(slotMinutes).filter(Number.isFinite);
  if (times.length === 0) return true;
  return slotMinutes(start) + spanHours(hours) * 60 <= Math.max(...times) + 60;
}

/** True when some hour of this lesson already holds `limit` bookings. */
export function spanFull(rows, start, hours, limit) {
  if (limit === Infinity) return false;
  const from = slotMinutes(start);
  for (let k = 0; k < spanHours(hours); k += 1) {
    const m = from + k * 60;
    const slot = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    if (slotLoad(rows, slot) >= limit) return true;
  }
  return false;
}
