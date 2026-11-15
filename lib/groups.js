// How many people and groups a trip takes (the owner's rule, 2026-11-15).
//
// Group size ("2 – 8 people") is how many people fit in ONE booking.
// "Groups at the same time" (the slot_limit column) is how many separate
// bookings one time (lessons, snowmobile, paragliding) or one departure date
// (trips) can take. There is no separate head-count capacity any more.

import { parseGroupSize } from './lessons';

// when a trip has no group size written, one booking may still not be huge
export const DEFAULT_GROUP_MAX = 20;

/** Most people one booking can bring. */
export function groupMax(tour) {
  return parseGroupSize(tour?.group_size)?.max ?? DEFAULT_GROUP_MAX;
}

/** How many separate bookings one time or date takes; Infinity for 'unlimited'. */
export function groupsLimit(tour) {
  return tour?.slot_limit === 'unlimited' ? Infinity : (Number(tour?.slot_limit) || 1);
}
