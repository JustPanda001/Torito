// What a booking costs, and what it is called.
//
// One place, used by BOTH the booking dialog (to show the visitor the total)
// and the bookings API (to work out the total it actually stores). Keeping the
// rule here means the two can never drift: the browser's total is only ever a
// preview, the server's is the record.
//
// The rule is deliberately plain: the price of the chosen option (or the
// trip's own price when it has no options), times the number of people.
// Snowmobile, paragliding, trips and transfers all price this way, and so do
// lessons without a rate table.
//
// A lesson WITH a rate table (see hourlyRates() in lib/lessons.js) is priced
// as the hourly rate for its group size times the hours booked instead.

import { tourOptions } from './options';
import { hourlyRates, validHours } from './lessons';

// what goes between the trip's name and the chosen option's name
const OPTION_JOINER = ' — ';

/** Price for one person: the picked option's, or the trip's own. */
export function unitPrice(tour, option = null) {
  return option ? option.price : tour.price;
}

/**
 * Per-hour price for this group on a lesson with a rate table, or null (no
 * table, or a group size the table does not cover).
 */
export function hourlyRate(tour, people) {
  const rates = hourlyRates(tour);
  return rates && Number.isInteger(people) && people >= 1 && people <= rates.length
    ? rates[people - 1]
    : null;
}

/**
 * What the booking costs in total. `hours` only matters for a lesson with a
 * rate table; there an out-of-range group or hours gives null, not a guess.
 */
export function bookingTotal(tour, option, people, hours = null) {
  if (hourlyRates(tour)) {
    const rate = hourlyRate(tour, people);
    return rate != null && validHours(hours, tour) ? rate * hours : null;
  }
  return unitPrice(tour, option) * people;
}

/** The trip's name as the team sees it, with the option when one was picked. */
export function bookingTitle(tour, option = null) {
  return `${tour.full_title || tour.title}${option ? `${OPTION_JOINER}${option.name}` : ''}`;
}

/**
 * Which of the trip's options a request is for, or null.
 *
 * `name` is the option's name when the caller sent it. Older callers sent only
 * the title ("Trip — Option"), so when there is no name the end of the title is
 * read instead; the longest matching name wins so "Flight" never shadows
 * "Acro Flight". Only the NAME is taken from the request — the price always
 * comes from the trip's own option.
 */
export function findOption(tour, name, title) {
  const options = tourOptions(tour);
  if (typeof name === 'string' && name.trim()) {
    const wanted = name.trim();
    return options.find((o) => o.name === wanted) ?? null;
  }
  if (typeof title === 'string') {
    const text = title.trim();
    const hit = [...options]
      .sort((a, b) => b.name.length - a.name.length)
      .find((o) => text.endsWith(`${OPTION_JOINER}${o.name}`));
    if (hit) return hit;
  }
  return null;
}
