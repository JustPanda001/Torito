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

// ---- dates in the visitor's language ----

// Site language -> the locale Intl formats dates with.
export const LOCALE_TAGS = { en: 'en-GB', ka: 'ka-GE', ru: 'ru-RU', zh: 'zh-CN' };
export const localeTag = (lang) => LOCALE_TAGS[lang] ?? LOCALE_TAGS.en;

export const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const monthStart = (d) => new Date(d.getFullYear(), d.getMonth(), 1);

/** A date written out in `lang`, e.g. { day: 'numeric', month: 'short' } -> "2 Dec". */
export function fmtDate(date, lang, opts = { day: 'numeric', month: 'long', year: 'numeric' }) {
  try {
    return new Intl.DateTimeFormat(localeTag(lang), opts).format(date);
  } catch {
    return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
  }
}

/** "December 2026" / "Декабрь 2026 г." — Russian capitalised, its months are not. */
export function monthTitle(date, lang) {
  const s = fmtDate(date, lang, { month: 'long', year: 'numeric' });
  // only Russian: Georgian has no capitals (upper-casing turns ა into Mtavruli)
  return lang === 'ru' ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/** Short weekday names, Monday first, in `lang`. */
export function weekdayNames(lang) {
  // 1 January 2024 was a Monday
  return Array.from({ length: 7 }, (_, i) => fmtDate(new Date(2024, 0, 1 + i), lang, { weekday: 'short' }));
}

/** "2 Dec – 3 Dec", or just "2 Dec" for a single day. */
export function rangeText(from, to, lang) {
  const short = (d) => fmtDate(d, lang, { day: 'numeric', month: 'short' });
  return !to || sameDay(from, to) ? short(from) : `${short(from)} – ${short(to)}`;
}

/**
 * Which plural form a count takes in `lang`: 'One', 'Few', 'Many' or 'Other'.
 * Used as a key suffix, e.g. t(`cal.days${pluralForm(lang, n)}`, { n }) —
 * Russian needs three forms (1 день, 2 дня, 5 дней), English two, Chinese one.
 */
export function pluralForm(lang, n) {
  let form = 'other';
  try { form = new Intl.PluralRules(localeTag(lang)).select(n); } catch { form = n === 1 ? 'one' : 'other'; }
  return form.charAt(0).toUpperCase() + form.slice(1);
}

// ---- "today" and "now" in Georgia ----
//
// Bookings are for Gudauri, so "today" is the day in Tbilisi, whatever the
// visitor's phone is set to: a visitor still on Beijing or Moscow time must not
// be offered a slot that has already started in Georgia. Georgia is UTC+4 all
// year (no summer time); Intl is used first so a future change is picked up.

export const BOOKING_TZ = 'Asia/Tbilisi';
const TBILISI_OFFSET_MIN = 4 * 60;

let tbilisiFmt;
try {
  tbilisiFmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: BOOKING_TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  });
} catch { tbilisiFmt = null; }

let cached = { at: 0, value: null };

/**
 * { today, minutes }: today's date in Tbilisi (as a local midnight Date, the
 * same shape every calendar day here uses) and minutes since midnight there.
 * Cached for a few seconds, since a calendar asks once per day cell.
 */
export function tbilisiNow(now = Date.now()) {
  if (cached.value && Math.abs(now - cached.at) < 5000) return cached.value;
  let y; let mo; let d; let h; let mi;
  const parts = tbilisiFmt?.formatToParts(new Date(now));
  if (parts) {
    const get = (type) => Number(parts.find((p) => p.type === type)?.value);
    [y, mo, d, h, mi] = [get('year'), get('month'), get('day'), get('hour') % 24, get('minute')];
  } else {
    const s = new Date(now + TBILISI_OFFSET_MIN * 60000);
    [y, mo, d, h, mi] = [s.getUTCFullYear(), s.getUTCMonth() + 1, s.getUTCDate(), s.getUTCHours(), s.getUTCMinutes()];
  }
  const value = { today: new Date(y, mo - 1, d), minutes: h * 60 + mi };
  cached = { at: now, value };
  return value;
}

// ---- trip length ----

/**
 * How many calendar days one booking covers: 3 for "3 days / 2 nights",
 * 1 for "1 day", "2 hours" or anything without a day count. Reads the original
 * English fields (duration_long, then duration), never translated text.
 */
export function tripDays(tour) {
  for (const text of [tour?.duration_long, tour?.duration]) {
    const m = String(text ?? '').match(/(\d+)\s*days?\b/i);
    if (m) return Math.min(30, Math.max(1, Number(m[1])));
  }
  return 1;
}
