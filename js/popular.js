// "Hot right now" — the four trips people are opening most, out of the ones
// that actually run in the season we are in today.
//
// Popularity comes from public.tour_views, bumped once per trip page open.
// Until that table has numbers in it (a fresh install, or the SQL not run yet)
// the placeholder `views` counts in tours-data.js stand in, so the strip is
// never empty.

import { TOURS } from './tours-data.js';
import { seasonCovers } from './date-filter.js';

const SEASONS = {
  winter: {
    label: 'Winter',
    lead: 'Winter in Georgia is snow season. Gudauri and Bakuriani fill up with skiers and snowboarders, the passes turn white, and the mountain villages are at their quietest and most beautiful.',
  },
  spring: {
    label: 'Spring',
    lead: 'Spring is when Georgia turns green again. The lower trails open first, the valleys are full of wildflowers, and the wine country is warm long before the mountains are.',
  },
  summer: {
    label: 'Summer',
    lead: 'Summer in Georgia is a season of excitement and active fun. Long days in the high mountains, camping under clear skies, rivers to raft and ridge walks that stay open into the evening.',
  },
  autumn: {
    label: 'Autumn',
    lead: 'Autumn is harvest season. The trails are empty and golden, the air is sharp in the mornings, and Kakheti is in the middle of the grape picking.',
  },
};

const CATEGORY_LABEL = {
  hiking: 'Hiking',
  camping: 'Camping',
  ski: 'Ski & snowboard',
  culture: 'Culture',
};

/** December–February winter, and so on around the year. */
export function seasonOf(date = new Date()) {
  const m = date.getMonth();
  if (m === 11 || m <= 1) return 'winter';
  if (m <= 4) return 'spring';
  if (m <= 7) return 'summer';
  return 'autumn';
}

/** Counts one page open. Fire and forget: a missing table must not break the page. */
export async function bumpTourView(slug) {
  if (!slug) return;
  try {
    const { supabase } = await import('./supabase.js');
    await supabase.rpc('bump_tour_view', { slug });
  } catch (err) {
    console.warn('View not counted:', err.message);
  }
}

async function fetchViewCounts() {
  const counts = new Map();
  try {
    const { supabase } = await import('./supabase.js');
    const { data, error } = await supabase.from('tour_views').select('tour_slug, views');
    if (error || !data) return counts;
    data.forEach((row) => counts.set(row.tour_slug, Number(row.views) || 0));
  } catch (err) {
    console.warn('View counts unavailable:', err.message);
  }
  return counts;
}

async function fetchPublishedTours() {
  try {
    const { supabase } = await import('./supabase.js');
    const { data, error } = await supabase.from('tours').select('*').eq('published', true);
    if (error || !data || !data.length) return null;
    return data;
  } catch {
    return null;
  }
}

// In-season trips first, most-opened at the top. If the season is thin —
// nothing published for it yet — the rest of the catalogue fills the gap
// rather than leaving holes in the grid.
function pickHot(tours, counts, today, limit) {
  const score = (t) => counts.get(t.slug) ?? t.views ?? 0;
  const byScore = (a, b) => score(b) - score(a);

  const inSeason = tours.filter((t) => seasonCovers(t, today, today)).sort(byScore);
  if (inSeason.length >= limit) return inSeason.slice(0, limit);

  const rest = tours.filter((t) => !inSeason.includes(t)).sort(byScore);
  return [...inSeason, ...rest].slice(0, limit);
}

function tile(t, count) {
  const href = `tour.html?tour=${t.slug}`;
  return `
    <a class="hot-tile" href="${href}">
      <img src="${t.cover_image || 'assets/hero.svg'}" alt="${t.title}" loading="lazy" decoding="async">
      <span class="hot-tile-label">
        <strong>${t.title}</strong>
        <em>${CATEGORY_LABEL[t.category] || t.category || ''}${count ? ` · ${count} views` : ''}</em>
      </span>
    </a>`;
}

async function main() {
  const grid = document.getElementById('hotGrid');
  if (!grid) return;

  const today = new Date();
  const season = SEASONS[seasonOf(today)];

  document.getElementById('hotTitle').innerHTML =
    `Experience<br>Top Activities<br>in ${season.label}`;
  document.getElementById('hotLead').textContent = season.lead;

  const paint = (tours, counts) => {
    const hot = pickHot(tours, counts, today, 4);
    grid.innerHTML = hot.map((t) => tile(t, counts.get(t.slug) || 0)).join('');
  };

  // placeholders paint immediately, then the real catalogue and the real
  // counts replace them the moment they land
  paint(TOURS, new Map());

  const [published, counts] = await Promise.all([fetchPublishedTours(), fetchViewCounts()]);
  paint(published || TOURS, counts);
}

main();
