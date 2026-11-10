// Which categories can be booked right now. The team runs winter activities
// this season; everything else shows as unavailable.
export const BOOKABLE_CATEGORIES = ['ski'];

/** True when customers may book or join the waitlist for this trip. */
export function isBookable(tour) {
  return Boolean(tour) && BOOKABLE_CATEGORIES.includes(tour.category);
}
