// Renders the activity listing.
//
// Placeholder trips paint straight away, so the page is never blank. The
// database client is a CDN module ~15 files deep, so it is imported lazily
// afterwards and only swaps the cards out once real rows come back.

import { TOURS } from './tours-data.js';
import { initDateFilter, seasonCovers, seasonLabel } from './date-filter.js';
import { loadRatings, ratingFor, starsHtml } from './ratings.js';

const listing = document.getElementById('listing');
const countEl = document.getElementById('listingCount');

let allTours = [];
const filters = { category: 'all', from: null, to: null };

function applyFilters({ stagger = false } = {}) {
  const shown = allTours.filter((t) =>
    (filters.category === 'all' || t.category === filters.category) &&
    seasonCovers(t, filters.from, filters.to));

  if (!shown.length) {
    listing.innerHTML = `<p class="form-note">No trips match those dates. Try a wider range.</p>`;
    if (countEl) countEl.textContent = '0 trips available';
    return;
  }

  listing.innerHTML = shown.map(card).join('');
  if (countEl) countEl.textContent = `${shown.length} trips available`;
  paintRatings();

  // cards are added after the scroll observer ran, so bring them in here
  requestAnimationFrame(() => {
    document.querySelectorAll('#listing .reveal').forEach((el, i) => {
      if (stagger) setTimeout(() => el.classList.add('visible'), i * 70);
      else el.classList.add('visible');
    });
  });
}

async function loadFromDatabase() {
  const { supabase } = await import('./supabase.js');

  const { data, error } = await supabase
    .from('tours')
    .select('*')
    .eq('published', true)
    .order('created_at', { ascending: false });

  // nothing published yet, or the database is unreachable — the placeholders
  // on screen are already a better answer than an error, so leave them be
  if (error || !data || !data.length) return;

  allTours = data;
  applyFilters();
}

function main() {
  if (!listing) return;

  allTours = TOURS;
  wireCategoryChips();
  wireCardClicks();
  wireDatePicker();
  applyFilters({ stagger: true });
  loadFromDatabase();
  // stars arrive after the cards, so the listing never waits on them
  loadRatings().then(paintRatings);
}

// Averages are cached per slug, so this is safe to call on every re-render:
// before they load it paints "No ratings yet", afterwards the real score.
function paintRatings() {
  document.querySelectorAll('#listing .tour-rating').forEach((el) => {
    const { avg, count } = ratingFor(el.dataset.slug);
    el.innerHTML = starsHtml(avg, count, { size: 14 });
  });
}

function icon(path) {
  return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7">${path}</svg>`;
}
const ICONS = {
  distance: '<path d="M4 18h16"/><path d="M7 18l5-12 5 12"/>',
  clock: '<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>',
  peak: '<path d="M3 20l7-14 4 8 3-5 4 11z"/>',
  house: '<path d="M4 20V10l8-6 8 6v10"/><path d="M9 20v-6h6v6"/>',
};

function card(t) {
  const full = t.spots_left === 0;
  const badge = t.badge === 'top' ? '<span class="badge badge-top">TOP</span>'
    : t.badge === 'new' ? '<span class="badge badge-new">NEW</span>' : '';
  const season = seasonLabel(t);
  const href = `tour.html?tour=${t.slug}`;

  return `
  <article class="tour-card reveal" data-category="${t.category}" data-href="${href}">
    <a class="tour-photo" href="${href}" tabindex="-1"><img src="${t.cover_image || 'assets/hero.svg'}" alt="${t.title}" loading="lazy" decoding="async"></a>

    <div class="tour-main">
      <h2 class="tour-title">${t.title}${t.subtitle ? ` <span class="tour-sub">${t.subtitle}</span>` : ''}</h2>

      <ul class="spec-grid">
        <li>${icon(ICONS.distance)}<span>${t.distance || '—'}</span></li>
        <li>${icon(ICONS.clock)}<span>${t.duration || '—'}</span></li>
        <li>${icon(ICONS.peak)}<span>${t.difficulty || '—'}</span></li>
        <li>${icon(ICONS.house)}<span>${t.stay || '—'}</span></li>
      </ul>

      <div class="tour-meta">
        ${badge}
        <span>${t.region || ''}</span>
        ${season ? `<span class="tour-season">${season}</span>` : ''}
        <span class="tour-rating" data-slug="${t.slug}"></span>
      </div>
    </div>

    <div class="tour-side">
      <div class="tour-region">${t.region || ''}</div>
      <div class="tour-status ${full ? 'full' : 'open'}">${full ? 'Fully booked' : 'Spots open'}</div>

      <div class="tour-capacity">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7">
          <circle cx="9" cy="8" r="3.2"/><path d="M2.5 19c0-3.4 2.9-5.5 6.5-5.5s6.5 2.1 6.5 5.5"/>
          <circle cx="17.5" cy="9" r="2.6"/><path d="M17.5 14c2.6 0 4 1.8 4 4"/>
        </svg>
        <strong>${t.capacity}</strong><span class="cap-label">people max</span>
      </div>

      <a class="tour-btn ${full ? 'ghost' : ''}" href="${href}">
        ${full ? 'Join waitlist' : 'View trip'}
      </a>
    </div>
  </article>`;
}

function wireCategoryChips() {
  const chips = document.querySelectorAll('.filter-bar .chip');
  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      chips.forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      filters.category = chip.dataset.filter;
      applyFilters();
    });
  });
}

function wireDatePicker() {
  const button = document.getElementById('dateBtn');
  const label = document.getElementById('dateLabel');
  if (!button || !label) return;

  initDateFilter({
    button,
    label,
    onChange: ({ from, to }) => {
      filters.from = from;
      filters.to = to;
      applyFilters();
    },
  });
}

// Anywhere on a card opens the trip. Delegated, so it survives re-renders and
// still lets the real links (and any text the visitor selects) behave normally.
function wireCardClicks() {
  listing.addEventListener('click', (e) => {
    const card = e.target.closest('.tour-card');
    if (!card || e.target.closest('a')) return;
    if (window.getSelection().toString()) return;

    window.location.href = card.dataset.href;
  });
}

// renders synchronously, so it must come after every const it touches
main();
