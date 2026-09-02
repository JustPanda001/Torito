// Fills the trip detail page from ?tour=<slug>.
//
// The page ships as an empty shell and every trip renders through it, so the
// nine placeholder trips all have a working page instead of one hard-coded one.

import { findTour } from './tours-data.js';
import { openBooking } from './booking.js';
import { loadRatings, ratingFor, starsHtml, fetchReviews, openReviewModal, escapeHtml as esc } from './ratings.js';
import { bumpTourView } from './popular.js';

const ICONS = {
  distance: '<path d="M4 18h16"/><path d="M7 18l5-12 5 12"/>',
  clock: '<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>',
  peak: '<path d="M3 20l7-14 4 8 3-5 4 11z"/>',
  gain: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18"/>',
  house: '<path d="M4 20V10l8-6 8 6v10"/><path d="M9 20v-6h6v6"/>',
};

const params = new URLSearchParams(location.search);
const tour = findTour(params.get('tour'));

if (!tour) notFound();
else render(tour);

function el(id) { return document.getElementById(id); }

function notFound() {
  const wanted = params.get('tour');
  el('tourTitle').textContent = 'Trip not found';
  el('crumbHere').textContent = 'Not found';
  el('tourLead').innerHTML = wanted
    ? `We could not find a trip called <strong>${escapeHtml(wanted)}</strong>. It may have been renamed or taken down. <a class="auth-link" href="tours.html">Browse all activities</a>.`
    : `No trip was requested. <a class="auth-link" href="tours.html">Browse all activities</a>.`;
}

function render(t) {
  const name = t.full_title || t.title;
  const full = t.spots_left === 0;

  document.title = `${name} — Torito`;
  el('crumbHere').textContent = name;
  el('tourTitle').textContent = name;

  // badge sits before the title, same as the listing cards
  if (t.badge) {
    const badge = document.createElement('span');
    badge.className = `badge badge-${t.badge}`;
    badge.textContent = t.badge.toUpperCase();
    el('detailHeadLeft').prepend(badge);
  }

  el('detailHeadRight').innerHTML = `
    <span class="head-rating" id="headRating"></span>
    <span class="dot">·</span>
    <span>${t.region || ''}</span>
    <span class="dot">·</span>
    <span>${t.views} views</span>
    <span class="dot">·</span>
    <span>${t.season_text || ''}</span>
    <span class="tour-id">ID ${t.id}</span>`;

  // counts towards the home page's "Hot right now" strip
  bumpTourView(t.slug);

  renderGallery(t, name);

  const status = el('bookStatus');
  status.className = `book-status ${full ? 'full' : 'open'}`;
  status.textContent = full ? 'Fully booked' : 'Spots open';

  el('bookCapacity').innerHTML = `
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.7">
      <circle cx="9" cy="8" r="3.2"/><path d="M2.5 19c0-3.4 2.9-5.5 6.5-5.5s6.5 2.1 6.5 5.5"/>
      <circle cx="17.5" cy="9" r="2.6"/><path d="M17.5 14c2.6 0 4 1.8 4 4"/>
    </svg>
    <strong>${t.capacity}</strong>
    <span>people max <em>· ${full ? 'no spots left' : `${t.spots_left} spots left`}</em></span>`;

  el('factList').innerHTML = [
    [ICONS.distance, 'Distance', t.distance],
    [ICONS.clock, 'Duration', t.duration_long || t.duration],
    [ICONS.peak, 'Difficulty', t.difficulty],
    [ICONS.gain, 'Elevation gain', t.elevation_gain],
    [ICONS.calendar, 'Season', t.season_text],
    [ICONS.globe, 'Languages', t.languages],
    [ICONS.house, 'Stay', t.stay],
  ].map(([path, label, value]) => `
    <li>
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7">${path}</svg>
      <span class="fact-label">${label}</span><span class="fact-value">${value || '—'}</span>
    </li>`).join('');

  const book = el('bookBtn');
  book.textContent = full ? 'Join waitlist' : 'Book a spot';
  if (full) book.classList.add('secondary');
  book.addEventListener('click', (e) => {
    e.preventDefault();
    openBooking(t);
  });

  el('guideRow').innerHTML = `
    <div class="guide-avatar">
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7">
        <circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>
      </svg>
    </div>
    <div>
      <strong>${t.guide?.name || 'Torito guide'}</strong>
      <span>${t.guide?.role || ''}</span>
    </div>`;

  el('tourLead').textContent = t.summary || '';

  el('infoGrid').innerHTML = [
    ['Departure point', t.info?.departure_point],
    ['Departure time', t.info?.departure_time],
    ['Return', t.info?.return_info],
    ['Transport', t.info?.transport],
    ['Group size', t.info?.group_size],
    ['Walking per day', t.info?.walking_per_day],
  ].map(([label, value]) => `
    <div class="info-item">
      <span class="info-label">${label}</span>
      <span class="info-value">${value || '—'}</span>
    </div>`).join('');

  const single = t.itinerary.length === 1;
  el('itinerary').innerHTML = t.itinerary.map(([title, text], i) => `
    <li>
      <span class="day">${single ? 'Plan' : `Day ${i + 1}`}</span>
      <div>
        <strong>${title}</strong>
        <p>${text}</p>
      </div>
    </li>`).join('');

  el('includedGrid').innerHTML = [
    ...t.included.map((x) => item('yes', '✓', x)),
    ...t.excluded.map((x) => item('no', '×', x)),
  ].join('');

  renderReviews(t);
}

// ---------- reviews ----------

// The score is painted from the shared cache and the list from the trip's own
// rows, so posting a review can refresh both without reloading the page.
function renderReviews(t) {
  const refreshScore = () => {
    const { avg, count } = ratingFor(t.slug);
    const head = el('headRating');
    if (head) head.innerHTML = starsHtml(avg, count, { size: 15 });
    el('reviewsScore').innerHTML = starsHtml(avg, count, { size: 20 });
  };

  const refreshList = async () => {
    const reviews = await fetchReviews(t.slug);
    const list = el('reviewsList');

    if (!reviews.length) {
      list.innerHTML = `<p class="form-note">No reviews yet. If you have been on this trip, you can be the first — <button type="button" class="link-btn" id="rateFromList">rate it</button>.</p>`;
      list.querySelector('#rateFromList').addEventListener('click', rate);
      return;
    }

    list.innerHTML = reviews.map((r) => `
      <article class="review">
        <div class="review-head">
          <strong>${esc(r.author_name || 'Traveller')}</strong>
          ${starsHtml(r.rating, 1, { size: 14, showCount: false })}
          <span class="review-rec ${r.recommend ? 'yes' : 'no'}">${r.recommend ? 'Recommends' : 'Does not recommend'}</span>
          <span class="review-date">${new Date(r.created_at).toLocaleDateString()}</span>
        </div>
        ${r.body ? `<p>${esc(r.body)}</p>` : ''}
      </article>`).join('');
  };

  const rate = () => openReviewModal(t, { onSaved: () => { refreshScore(); refreshList(); } });

  el('rateBtn')?.addEventListener('click', rate);

  refreshScore();
  loadRatings().then(refreshScore);
  refreshList();
}

function item(kind, mark, { title, note }) {
  return `<div class="inc-item ${kind}"><span class="mark">${mark}</span><div><strong>${title}</strong><span>${note}</span></div></div>`;
}

// script.js wires galleries on load, before this module runs. Replacing the
// whole wrapper drops those stale listeners with the old nodes, so the arrows
// and thumbs are re-bound here against the real photo count.
function renderGallery(t, name) {
  const photos = t.gallery?.length ? t.gallery : [t.cover_image || 'assets/hero.svg'];
  const wrap = el('galleryWrap');

  wrap.innerHTML = `
    <div class="gallery detail-gallery">
      <div class="gallery-track">
        ${photos.map((src, i) => `<img src="${src}" alt="${name} photo ${i + 1}"${i ? ' loading="lazy"' : ''}>`).join('')}
      </div>
      <button class="gal-arrow prev" aria-label="Previous photo">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M15 5l-7 7 7 7"/></svg>
      </button>
      <button class="gal-arrow next" aria-label="Next photo">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M9 5l7 7-7 7"/></svg>
      </button>
    </div>
    <div class="gallery-thumbs">
      ${photos.map((src, i) => `<button class="gal-thumb${i ? '' : ' active'}"><img src="${src}" alt="" loading="lazy"></button>`).join('')}
    </div>`;

  const track = wrap.querySelector('.gallery-track');
  const thumbs = [...wrap.querySelectorAll('.gal-thumb')];
  let index = 0;

  const goTo = (i) => {
    index = (i + photos.length) % photos.length;   // wraps both ways
    track.style.transform = `translateX(-${index * 100}%)`;
    thumbs.forEach((th, n) => th.classList.toggle('active', n === index));
  };

  wrap.querySelector('.prev').addEventListener('click', () => goTo(index - 1));
  wrap.querySelector('.next').addEventListener('click', () => goTo(index + 1));
  thumbs.forEach((th, i) => th.addEventListener('click', () => goTo(i)));
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
