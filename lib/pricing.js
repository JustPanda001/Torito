// What a booking costs, and what it is called.
//
// One place, used by BOTH the booking dialog (to show the visitor the total)
// and the bookings API (to work out the total it actually stores). Keeping the
// rule here means the two can never drift: the browser's total is only ever a
// preview, the server's is the record.
//
// The rule is deliberately plain: the price of the chosen option (or the
// trip's own price when it has no options), times the number of people.
// Lessons, snowmobile, paragliding, trips and transfers all price this way.

import { tourOptions } from './options';

// what goes between the trip's name and the chosen option's name
const OPTION_JOINER = ' — ';

/** Price for one person: the picked option's, or the trip's own. */
export function unitPrice(tour, option = null) {
  return option ? option.price : tour.price;
}

/** What the booking costs in total. */
export function bookingTotal(tour, option, people) {
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
