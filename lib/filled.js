/**
 * Whether a field is worth showing at all.
 *
 * A trip only fills in what applies to it — a day tour covers no distance, a
 * lesson has no elevation gain — and the admin form writes an empty string for
 * anything left blank. A dash in those rows tells the visitor nothing except
 * that the page has a hole in it, so the row is dropped instead. Blanking a
 * field in the admin panel is what hides it.
 *
 * A dash typed in by hand counts as empty too: someone filling the form in has
 * no way of knowing that leaving it alone does the same job.
 */
export const filled = (value) => {
  const text = String(value ?? '').trim();
  return text !== '' && text !== '—' && text !== '-' && text !== '–';
};
