// Search across the catalogue: forgiving of typos, aware of related words,
// and ranked so the best match comes first.
//
// How a trip is scored for a query:
//   1. Both are cut into words, lower-cased, with accents and punctuation gone.
//   2. Each query word is compared with every word of the trip, field by field.
//      An exact word beats a word it starts ("parag" → "paragliding"), which
//      beats a near-miss within one or two typos ("paraglaiding").
//   3. A hit in the title counts for more than one in the region, and that for
//      more than one buried in the summary.
//   4. Every service also carries the everyday words people search with — a
//      paragliding flight answers to "fly" and "tandem", lessons to
//      "instructor" and "school" — in English and in Georgian.
//
// A trip is a result when it answers most of the query's words. Where none
// answers all of them, the nearest ones are still shown as similar trips.

import { categoryOf, subtypeOf } from './catalog';

// what people type, for each kind of service
const ALIASES = {
  // winter types
  paragliding: 'paragliding paraglide paraglider parapente glide gliding fly flying flight tandem sky air პარაგლაიდინგი ფრენა',
  snowmobile: 'snowmobile snowmobiling skidoo ski-doo snowscooter sled scooter თოვლმავალი',
  lessons: 'lesson lessons instructor instructors teacher coach school class beginner learn ski snowboard ინსტრუქტორი გაკვეთილი სკოლა',
  freeride: 'freeride off-piste offpiste backcountry powder ფრირაიდი',
  freestyle: 'freestyle park jumps tricks ფრისტაილი',
  // categories
  ski: 'winter snow ski skiing skier snowboard snowboarding slope slopes resort ზამთარი თოვლი თხილამური სნოუბორდი',
  hiking: 'hike hikes hiking trek trekking walk walking trail trails ლაშქრობა',
  camping: 'camp camping tent tents campfire night ბანაკი კემპინგი',
  mountaineering: 'climb climbing summit peak alpine alpinism mountaineer glacier ალპინიზმი მწვერვალი',
  transfer: 'transfer taxi airport driver car ride pickup ტრანსფერი',
};

// field → weight; a word found in the title matters most
const FIELDS = [
  ['title', 6], ['full_title', 6], ['subtitle', 4], ['region', 4],
  ['_aliases', 3], ['_options', 3], ['difficulty', 1.5], ['season', 1], ['summary', 1],
];

const STOP = new Set(['in', 'the', 'a', 'an', 'and', 'of', 'to', 'for', 'at', 'on', 'with', 'tour', 'tours', 'trip', 'trips']);

/** Lower-case, accents off, punctuation to spaces. Georgian letters are kept. */
export function normalize(text) {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

const words = (text) => normalize(text).split(' ').filter(Boolean);

/** Edits between two words (insert, delete, change, swap neighbours). */
function distance(a, b, limit) {
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  const prev2 = []; let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = cur[0];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        cur[j] = Math.min(cur[j], prev2[j - 2] + 1);
      }
      rowMin = Math.min(rowMin, cur[j]);
    }
    if (rowMin > limit) return limit + 1;
    prev2.length = 0; prev2.push(...prev);
    prev = cur;
  }
  return prev[b.length];
}

// camping → camp, hikes → hike, lessons → lesson, climbing → climb
const stem = (w) => (w.length > 4 ? w.replace(/(ing|ers|er|es|s|ed)$/, '') : w);

/** How well one typed word matches one word of a trip, 0 to 1. */
function wordScore(q, w) {
  if (q === w) return 1;
  if (q.length >= 4 && stem(q) === stem(w)) return 0.9;
  if (q.length >= 2 && w.startsWith(q)) return 0.85;          // still typing
  if (q.length >= 5 && w.includes(q)) return 0.6;              // inside a longer word
  if (q.length < 4) return 0;                                   // too short to guess
  const limit = q.length >= 8 ? 2 : 1;
  const d = distance(q, w.slice(0, q.length + limit), limit);   // typo in a prefix too
  const full = distance(q, w, limit);
  const best = Math.min(d, full);
  // distance() answers limit + 1 for anything past the limit, so check the
  // limit first: with a limit of 1, a 2 means too far, not two typos
  if (best > limit) return 0;
  return best === 1 ? 0.7 : 0.55;
}

/** A trip prepared for searching: each field as a list of words. */
function indexOf(tour) {
  const cat = categoryOf(tour);
  const sub = subtypeOf(tour);
  const options = Array.isArray(tour.options) ? tour.options.map((o) => `${o?.name ?? ''} ${o?.note ?? ''}`).join(' ') : '';
  const doc = { ...tour, _aliases: `${ALIASES[cat] ?? ''} ${ALIASES[sub] ?? ''}`, _options: options };
  return FIELDS.map(([field, weight]) => [words(doc[field]), weight]);
}

const cache = new WeakMap();
const indexed = (tour) => {
  if (!cache.has(tour)) cache.set(tour, indexOf(tour));
  return cache.get(tour);
};

/** Every distinct word the catalogue knows, for "did you mean". */
function vocabulary(tours) {
  const out = new Set();
  for (const t of tours) for (const [list] of indexed(t)) for (const w of list) if (w.length >= 4) out.add(w);
  return out;
}

/**
 * Rank trips for a query.
 *
 * Returns { results, similar, corrected }:
 *   results   — trips that answer most of the query, best first
 *   similar   — when results is empty, the nearest trips anyway
 *   corrected — the query with its typos fixed, when a fix was found
 *               (e.g. "paraglaiding" → "paragliding"), else null
 */
export function searchTours(tours, query) {
  const terms = words(query).filter((w) => !STOP.has(w));
  if (!terms.length) return { results: tours.map((tour) => ({ tour, score: 0 })), similar: [], corrected: null };

  const scored = tours.map((tour) => {
    let total = 0;
    let hit = 0;
    for (const q of terms) {
      let best = 0;
      for (const [list, weight] of indexed(tour)) {
        for (const w of list) {
          const s = wordScore(q, w) * weight;
          if (s > best) best = s;
        }
      }
      if (best > 0) hit++;
      total += best;
    }
    return { tour, score: total, hit };
  });

  const needed = terms.length <= 2 ? terms.length : Math.ceil(terms.length * 0.66);
  const byScore = (a, b) => b.score - a.score;
  const results = scored.filter((s) => s.hit >= needed && s.score > 0).sort(byScore);
  const similar = results.length ? [] : scored.filter((s) => s.score > 0).sort(byScore).slice(0, 6);

  // "did you mean": each word that is not a known word, swapped for the
  // closest one that is
  const vocab = vocabulary(tours);
  let changed = false;
  const fixed = terms.map((q) => {
    if (vocab.has(q) || q.length < 4) return q;
    let pick = q; let bestD = q.length >= 8 ? 3 : 2;
    for (const w of vocab) {
      const d = distance(q, w, bestD - 1);
      if (d < bestD) { bestD = d; pick = w; }
    }
    if (pick !== q) changed = true;
    return pick;
  });

  return { results, similar, corrected: changed ? fixed.join(' ') : null };
}
