// Season maths, shared by the listing filter and the booking calendar so the
// two can never disagree about when a trip runs.

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
export const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export const midnight = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const sameDay = (a, b) => Boolean(a && b) && iso(a) === iso(b);
export const monthDay = (d) => `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** True when a single date falls inside the trip's recurring season window. */
export function inSeason(tour, date) {
  if (!tour?.season_from || !tour?.season_to) return true;   // runs all year

  const md = monthDay(date);
  const { season_from: start, season_to: finish } = tour;

  // winter seasons wrap the new year, e.g. 12-01 -> 04-15
  return start > finish ? (md >= start || md <= finish) : (md >= start && md <= finish);
}

/** True when the trip's season covers any day in the chosen range. */
export function seasonCovers(tour, from, to) {
  if (!from) return true;                                    // no filter set
  if (!tour?.season_from || !tour?.season_to) return true;    // runs all year

  const end = to || from;
  const cursor = new Date(from);

  for (let guard = 0; cursor <= end && guard < 400; guard++) {
    if (inSeason(tour, cursor)) return true;
    cursor.setDate(cursor.getDate() + 1);
  }
  return false;
}

/** "Jun – Oct", or "All year" for trips that run every month. */
export function seasonLabel(tour) {
  if (!tour?.season_from || !tour?.season_to) return '';
  if (tour.season_from === '01-01' && tour.season_to === '12-31') return 'All year';
  const mon = (md) => MONTHS_SHORT[Number(md.slice(0, 2)) - 1];
  return `${mon(tour.season_from)} – ${mon(tour.season_to)}`;
}

export const money = (n) => `${Number(n || 0).toLocaleString('en-US')} ₾`;
