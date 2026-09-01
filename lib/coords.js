// Coordinates as they are actually copied.
//
// Google Maps shows a place as 42°27'54.3"N 44°29'04.4"E, and that is what
// lands on the clipboard from the label — decimal degrees only appear if you
// know to look in the URL or right-click the pin. Rather than asking anyone to
// convert by hand, both forms are accepted and stored as decimal.

const DMS = /(\d+(?:\.\d+)?)\s*°\s*(?:(\d+(?:\.\d+)?)\s*['′]\s*)?(?:(\d+(?:\.\d+)?)\s*["″]?\s*)?([NSEW])?/i;

/**
 * One coordinate, decimal or degrees-minutes-seconds, as a number.
 * Returns null for anything that is not a coordinate at all.
 */
export function parseCoord(value) {
  const text = String(value ?? '').trim();
  if (!text) return null;

  // plain decimal, with or without a hemisphere letter
  const plain = text.match(/^(-?\d+(?:\.\d+)?)\s*([NSEW])?$/i);
  if (plain) {
    const n = Number(plain[1]);
    return /[SW]/i.test(plain[2] ?? '') ? -Math.abs(n) : n;
  }

  const dms = text.match(DMS);
  if (!dms) return null;

  const degrees = Number(dms[1]) + Number(dms[2] ?? 0) / 60 + Number(dms[3] ?? 0) / 3600;
  const south = /[SW]/i.test(dms[4] ?? '');
  return Number((south ? -degrees : degrees).toFixed(6));
}

/**
 * A pasted pair — "42.4651, 44.4846" or the whole DMS string with both halves.
 * Returns [lat, lng], or null when only one coordinate is present.
 */
export function parsePair(value) {
  const text = String(value ?? '').trim();
  if (!text) return null;

  const decimals = text.match(/^\s*(-?\d+\.\d+)\s*[,\s]\s*(-?\d+\.\d+)\s*$/);
  if (decimals) return [Number(decimals[1]), Number(decimals[2])];

  // split a DMS pair on the hemisphere letter that ends the first half
  const halves = text.split(/(?<=[NS])\s*,?\s*/i).filter(Boolean);
  if (halves.length === 2) {
    const lat = parseCoord(halves[0]);
    const lng = parseCoord(halves[1]);
    if (lat != null && lng != null) return [lat, lng];
  }
  return null;
}
