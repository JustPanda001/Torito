// Small copies of trip photos for cards and lists.
//
// Every photo in public/assets (and assets/trips) has a 640-px-wide copy next
// to it named "<name>-card.webp", made by a one-off sharp script (2026-11-17):
// a card shows the photo about 300 px wide, so the full 1600-px photo made
// some cards load seconds later than others. Photos uploaded later in admin
// (Supabase storage) have no copy and are used as they are. If a copy is ever
// missing, onCardImageError swaps the original back in.

const LOCAL = /^\/assets\/[^?#]+\.(webp|jpe?g)$/i;

/** The small version of a cover photo, or the photo itself when it has none. */
export function cardImage(src) {
  if (!src || !LOCAL.test(src) || /-card\.webp$/i.test(src)) return src;
  return src.replace(/\.(webp|jpe?g)$/i, '-card.webp');
}

/** onError for an <img> showing cardImage(original): fall back once. */
export function onCardImageError(original) {
  return (e) => {
    const img = e.currentTarget;
    if (original && img.dataset.fellBack !== '1') {
      img.dataset.fellBack = '1';
      img.src = original;
    }
  };
}
