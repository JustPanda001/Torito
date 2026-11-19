// Compares a secret from a request header with the expected one in constant
// time (SEC-04), so the response time leaks nothing about how much matched.
// An empty expected secret never matches.

import { timingSafeEqual, createHash } from 'node:crypto';

export function secretMatches(given, expected) {
  if (!expected || typeof given !== 'string' || !given) return false;
  // hash both to the same length first: timingSafeEqual needs equal-length buffers
  const a = createHash('sha256').update(given).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}
