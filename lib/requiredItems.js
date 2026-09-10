// Kit the visitor has to bring themselves.
//
// Not the same as "not included". Not-included is about money — a lunch you
// will end up paying for on the day. This is about turning up able to go at
// all: a tent on a trip that camps, a sleeping bag rated for the altitude.
// Someone who arrives without it cannot be taken along, so the trip page says
// so plainly and the booking window makes them tick each one before it will
// take the request.
//
// Stored on tours.required_items as a json array of { title, note }.

/** The items a trip requires, ignoring half-written rows. */
export function requiredItems(tour) {
  const raw = tour?.required_items;
  const list = Array.isArray(raw) ? raw : [];

  return list
    .map((item) => (Array.isArray(item)
      ? { title: item[0], note: item[1] }
      : { title: item?.title, note: item?.note }))
    .map((item) => ({
      title: String(item.title ?? '').trim(),
      note: String(item.note ?? '').trim(),
    }))
    .filter((item) => item.title);
}
