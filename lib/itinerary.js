// How a trip's plan is counted.
//
// A trek is counted in days — day one gets you to Mestia, day four brings you
// back. A day tour is not: it is one day with several places in it, and
// labelling the second of them "Day 2" tells the visitor they are away
// overnight when they are home by evening.
//
// So the trip says which it is, rather than the page guessing from how many
// rows happen to be filled in.

export const ITINERARY_MODES = [
  ['days', 'Several days', 'Day 1, Day 2 — one row per day'],
  ['stops', 'One day', 'Stop 1, Stop 2 — places visited in a single day'],
];

/**
 * The mode a trip is in.
 *
 * Rows written before the column existed have nothing set, so they fall back
 * to what the page used to assume: a single row was a one-day plan, anything
 * longer was counted in days. That keeps every existing trip reading the way
 * it already did until someone chooses otherwise in the admin panel.
 */
export function itineraryMode(tour) {
  const raw = tour?.itinerary_mode;
  if (raw === 'days' || raw === 'stops') return raw;
  return (tour?.itinerary?.length ?? 0) <= 1 ? 'stops' : 'days';
}

/** What to call the nth row: "Day 3", or "Stop 3" on a single-day trip. */
export function stepLabel(mode, index) {
  return `${mode === 'stops' ? 'Stop' : 'Day'} ${index + 1}`;
}
