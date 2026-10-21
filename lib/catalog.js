// What the site sells, and how the listing narrows it down.
//
// Outdoors only. Winter comes first because it is where the season's money
// is: instructors and schools, freeride, snowmobile rides and paragliding over
// Gudauri all live under it. After that hikes, camping and mountaineering, and
// transfers to get people to any of them.
//
// Cultural day tours are no longer sold. Rows still stored as `tours` or
// `culture` resolve to RETIRED and are kept off the listing and home page.

export const CATEGORIES = ['ski', 'hiking', 'camping', 'mountaineering', 'transfer'];

export const RETIRED = 'retired';

// Rows written before a reshuffle still carry old values; reading through this
// map means no migration has to run for the site to be correct.
const LEGACY = {
  winter: 'ski',
  tours: RETIRED,
  culture: RETIRED,
  other: RETIRED,
  lesson: 'ski',
  freeride: 'ski',
  snowmobile: 'ski',
  paragliding: 'ski',
};

/** The category a trip belongs to now, whatever it was stored as. */
export function categoryOf(tour) {
  const raw = tour?.category;
  return LEGACY[raw] ?? raw ?? RETIRED;
}

/** False for anything the site has stopped selling. */
export function isOffered(tour) {
  return CATEGORIES.includes(categoryOf(tour));
}

/** Winter first, then the rest in catalogue order. Stable within a category. */
export function byCatalogOrder(a, b) {
  return CATEGORIES.indexOf(categoryOf(a)) - CATEGORIES.indexOf(categoryOf(b));
}

/** Winter trips carry a second choice: what the visitor actually wants. */
export function subtypeOf(tour) {
  if (tour?.subtype) return tour.subtype;
  // before the column existed, this lived in the category
  if (tour?.category === 'lesson') return 'lessons';
  if (['freeride', 'snowmobile', 'paragliding'].includes(tour?.category)) return tour.category;
  return null;
}

// The labels below are i18n keys (see lib/strings/catalog.js); the listing page
// runs them through t().
export const WINTER_TYPES = [
  ['lessons', 'filter.winter.lessons'],
  ['freeride', 'filter.winter.freeride'],
  ['freestyle', 'filter.winter.freestyle'],
  ['snowmobile', 'filter.winter.snowmobile'],
  ['paragliding', 'filter.winter.paragliding'],
];

const DIFFICULTY_OPTIONS = [
  ['easy', 'filter.diff.easy'],
  ['intermediate', 'filter.diff.intermediate'],
  ['hard', 'filter.diff.hard'],
];

export const SUB_FILTERS = {
  ski: {
    group: 'filter.group.ski',
    label: 'filter.any.ski',
    options: WINTER_TYPES,
  },
  hiking: {
    group: 'filter.group.difficulty',
    label: 'filter.any.difficulty',
    options: DIFFICULTY_OPTIONS,
  },
  camping: {
    group: 'filter.group.length',
    label: 'filter.any.length',
    options: [
      ['1-2', 'filter.len.short'],
      ['3-4', 'filter.len.mid'],
      ['5+', 'filter.len.long'],
    ],
  },
  mountaineering: {
    group: 'filter.group.difficulty',
    label: 'filter.any.difficulty',
    options: DIFFICULTY_OPTIONS,
  },
  transfer: {
    group: 'filter.group.size',
    label: 'filter.any.size',
    options: [
      ['1-2', 'filter.size.small'],
      ['3-5', 'filter.size.mid'],
      ['5+', 'filter.size.large'],
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
    case 'camping': {
      const d = daysOf(tour);
      if (d == null) return false;
      if (value === '1-2') return d <= 2;
      if (value === '3-4') return d >= 3 && d <= 4;
      return d >= 5;
    }
    case 'hiking':
    case 'mountaineering': {
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
