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
// A lesson can carry a rate table: what one hour costs for 1, 2, 3 or 4
// people. The total is then rate[people] × hours, and the visitor picks the
// hours (2 to 8) as well as the group size (up to 4). A lesson without a table
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

// biggest group one instructor takes; one rate per group size
export const LESSON_MAX_GROUP = 4;

// what the admin form offers to fill in, per hour for 1, 2, 3 and 4 people
export const SUGGESTED_HOURLY_RATES = [130, 175, 220, 260];

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
  if (!Array.isArray(raw) || raw.length !== LESSON_MAX_GROUP) return null;
  const rates = raw.map(Number);
  return rates.every((r) => Number.isFinite(r) && r > 0) ? rates : null;
}

/** True for a whole number of hours a lesson can be booked for. */
export function validHours(hours) {
  return Number.isInteger(hours) && hours >= LESSON_MIN_HOURS && hours <= LESSON_MAX_HOURS;
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
