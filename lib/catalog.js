// What the site sells, and how the listing narrows it down.
//
// Four things, not seven: tours around the country, hikes, ski & snowboard,
// and transfers. Camping folded into hiking, culture became tours, and lessons
// and freeride stopped being categories of their own — they are what you pick
// once you are already looking at ski & snowboard.
//
// Every category then has one filter of its own, in the place where a second
// category chip row would otherwise go: trip length for tours, difficulty for
// hikes, what you want from the instructor for ski, and group size for a
// transfer.

export const CATEGORIES = ['tours', 'hiking', 'ski', 'transfer'];

// Rows written before this reshuffle still carry the old values, and so do any
// trips added while the change was in flight. Reading through this map means no
// migration has to run for the site to be correct.
const LEGACY = {
  culture: 'tours',
  camping: 'hiking',
  lesson: 'ski',
  freeride: 'ski',
  other: 'tours',
};

/** The category a trip belongs to now, whatever it was stored as. */
export function categoryOf(tour) {
  const raw = tour?.category;
  return LEGACY[raw] ?? raw ?? 'tours';
}

/** Ski trips carry a second choice: what the visitor actually wants. */
export function subtypeOf(tour) {
  if (tour?.subtype) return tour.subtype;
  // before the column existed, this lived in the category
  if (tour?.category === 'lesson') return 'lessons';
  if (tour?.category === 'freeride') return 'freeride';
  return null;
}

export const SUB_FILTERS = {
  tours: {
    label: 'Any length',
    options: [
      ['1-2', '1 – 2 day tours'],
      ['3-4', '3 – 4 day tours'],
      ['5+', '5+ day tours'],
    ],
  },
  hiking: {
    label: 'Any difficulty',
    options: [
      ['easy', 'Easy'],
      ['intermediate', 'Intermediate'],
      ['hard', 'Hard'],
    ],
  },
  ski: {
    label: 'Anything on snow',
    options: [
      ['lessons', 'Lessons'],
      ['freeride', 'Freeride'],
      ['freestyle', 'Freestyle'],
    ],
  },
  transfer: {
    label: 'Any group size',
    options: [
      ['1-2', '1 – 2 people'],
      ['3-5', '3 – 5 people'],
      ['5+', '5+ people'],
    ],
  },
};

/** "4 days / 3 nights" and "2 hours" both have to give a usable number. */
function daysOf(tour) {
  const text = `${tour.duration_long ?? ''} ${tour.duration ?? ''}`.toLowerCase();
  const days = text.match(/(\d+)\s*day/);
  if (days) return Number(days[1]);
  // an hours-long thing is a single day out, not a multi-day trip
  return /hour|hrs|\bhr\b/.test(text) ? 1 : null;
}

const DIFFICULTY = {
  easy: ['easy', 'gentle', 'beginner'],
  intermediate: ['moderate', 'intermediate', 'medium'],
  hard: ['hard', 'difficult', 'demanding', 'strenuous'],
};

/**
 * Whether a trip survives the category's own filter. An unset filter, or a
 * category without one, never removes anything.
 */
export function matchesSubFilter(tour, category, value) {
  if (!value) return true;

  switch (category) {
    case 'tours': {
      const d = daysOf(tour);
      if (d == null) return false;
      if (value === '1-2') return d <= 2;
      if (value === '3-4') return d >= 3 && d <= 4;
      return d >= 5;
    }
    case 'hiking': {
      const text = (tour.difficulty ?? '').toLowerCase();
      return (DIFFICULTY[value] ?? []).some((word) => text.includes(word));
    }
    case 'ski':
      return subtypeOf(tour) === value;

    case 'transfer': {
      const seats = tour.capacity ?? 0;
      if (value === '1-2') return seats <= 2;
      if (value === '3-5') return seats >= 3 && seats <= 5;
      return seats > 5;
    }
    default:
      return true;
  }
}
