// Options on one service — e.g. a 10-minute and a 20-minute paragliding flight
// on the same page, instead of two near-identical services.
//
// tours.options:  [{ name, price, duration, note }]
// tours.compare:  [{ feature, values: [one cell per option] }]
//
// Both are written in the admin panel. A service with no options behaves
// exactly as before: one price, no cards, no table.

/** The options a customer can pick from, ignoring half-written rows. */
export function tourOptions(tour) {
  const raw = Array.isArray(tour?.options) ? tour.options : [];
  return raw
    .map((o) => ({
      name: String(o?.name ?? '').trim(),
      price: Number(o?.price),
      duration: String(o?.duration ?? '').trim(),
      note: String(o?.note ?? '').trim(),
    }))
    .filter((o) => o.name && Number.isFinite(o.price) && o.price >= 0);
}

/** The comparison rows, each with exactly one cell per option. */
export function compareRows(tour, count) {
  const raw = Array.isArray(tour?.compare) ? tour.compare : [];
  return raw
    .map((r) => ({
      feature: String(r?.feature ?? '').trim(),
      values: Array.from({ length: count }, (_, i) => String(r?.values?.[i] ?? '').trim()),
    }))
    .filter((r) => r.feature);
}

const YES = new Set(['yes', 'y', '✓', '✔', '+', 'true', 'included']);
const NO = new Set(['', 'no', 'n', '—', '-', '–', '×', 'x', 'false']);

/** What a table cell shows: a tick, a dash, or the text that was typed. */
export function cellKind(value) {
  const v = String(value ?? '').trim().toLowerCase();
  if (YES.has(v)) return 'yes';
  if (NO.has(v)) return 'no';
  return 'text';
}
