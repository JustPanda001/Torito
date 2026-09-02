// Star ratings: the score shown on the cards and the trip page, and the
// dialog that collects one.
//
// Rating requires an account. That is enforced by the database (the insert
// policy checks user_id = auth.uid(), which a guest can never satisfy), so the
// signed-out branch of the dialog below is a courtesy, not the lock.

const STAR_PATH = 'M12 3.4l2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.8l6.1-.9z';

// slug -> { avg, count }, filled once per page and reused when the listing
// re-renders under a filter
const cache = new Map();
let loaded = null;

function starSvg(size, fill) {
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="${fill ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="${STAR_PATH}"/></svg>`;
}

/**
 * Read-only stars. `avg` may be fractional — the filled row is clipped to the
 * exact percentage, so 4.3 stars looks like 4.3 stars rather than rounding.
 */
export function starsHtml(avg, count, { size = 15, showCount = true } = {}) {
  if (!count) {
    return `<span class="stars-wrap"><span class="stars" aria-hidden="true">
      <span class="stars-row">${starSvg(size, false).repeat(5)}</span>
    </span><span class="stars-count">No ratings yet</span></span>`;
  }

  const pct = (Math.max(0, Math.min(5, avg)) / 5) * 100;
  const label = `${avg.toFixed(1)} out of 5 from ${count} ${count === 1 ? 'rating' : 'ratings'}`;

  return `<span class="stars-wrap" title="${label}">
    <span class="stars" role="img" aria-label="${label}">
      <span class="stars-row">${starSvg(size, false).repeat(5)}</span>
      <span class="stars-fill" style="width:${pct}%">${starSvg(size, true).repeat(5)}</span>
    </span>
    <span class="stars-count">${avg.toFixed(1)}${showCount ? ` <em>(${count})</em>` : ''}</span>
  </span>`;
}

/** Averages for every trip, fetched once. Never throws: no rows means no stars. */
export async function loadRatings() {
  if (loaded) return loaded;

  loaded = (async () => {
    try {
      const { supabase } = await import('./supabase.js');
      const { data, error } = await supabase.from('tour_reviews').select('tour_slug, rating');
      if (error || !data) return cache;

      const totals = new Map();
      for (const row of data) {
        const t = totals.get(row.tour_slug) || { sum: 0, count: 0 };
        t.sum += row.rating;
        t.count += 1;
        totals.set(row.tour_slug, t);
      }
      totals.forEach((t, slug) => cache.set(slug, { avg: t.sum / t.count, count: t.count }));
    } catch (err) {
      console.warn('Ratings unavailable:', err.message);
    }
    return cache;
  })();

  return loaded;
}

export function ratingFor(slug) {
  return cache.get(slug) || { avg: 0, count: 0 };
}

/** Every review left on one trip, newest first. */
export async function fetchReviews(slug) {
  try {
    const { supabase } = await import('./supabase.js');
    const { data, error } = await supabase
      .from('tour_reviews')
      .select('*')
      .eq('tour_slug', slug)
      .order('created_at', { ascending: false })
      .limit(30);
    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

/**
 * The rate-this-trip dialog. `onSaved` is called once a review is stored, so
 * the page can repaint its average without a reload.
 */
export async function openReviewModal(tour, { onSaved } = {}) {
  const slug = tour.slug;

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="booking-modal" role="dialog" aria-modal="true" aria-labelledby="rvTitle">
      <div class="bm-head">
        <div>
          <h2 id="rvTitle">Rate this trip</h2>
          <p class="bm-sub">${tour.full_title || tour.title}</p>
        </div>
        <button type="button" class="bm-close" aria-label="Close">&times;</button>
      </div>
      <div class="bm-body"><p class="bm-hint">Loading…</p></div>
    </div>`;

  const body = backdrop.querySelector('.bm-body');

  function close() {
    backdrop.remove();
    document.body.classList.remove('modal-open');
    document.removeEventListener('keydown', onKey);
  }
  function onKey(e) { if (e.key === 'Escape') close(); }

  backdrop.querySelector('.bm-close').addEventListener('click', close);
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
  document.addEventListener('keydown', onKey);

  document.body.appendChild(backdrop);
  document.body.classList.add('modal-open');

  const { supabase, currentProfile } = await import('./supabase.js');
  const profile = await currentProfile();

  if (!profile) {
    body.innerHTML = `
      <p class="bm-note">You need an account to rate a trip. Ratings are tied to a person, so every trip shows what real travellers thought.</p>
      <a class="book-btn" href="login.html">Log in</a>
      <p class="bm-hint">No account yet? <a class="auth-link" href="signup.html">Sign up</a> — it takes a moment.</p>`;
    return;
  }

  // an existing review is edited in place rather than added again, matching the
  // one-row-per-person rule the database enforces
  const { data: mine } = await supabase
    .from('tour_reviews')
    .select('*')
    .eq('tour_slug', slug)
    .eq('user_id', profile.id)
    .maybeSingle();

  let rating = mine?.rating ?? 0;
  let recommend = mine?.recommend ?? null;
  let text = mine?.body ?? '';

  backdrop.querySelector('#rvTitle').textContent = mine ? 'Update your review' : 'Rate this trip';
  draw();

  function draw() {
    body.innerHTML = `
      <section class="bm-section">
        <h3>How was it?</h3>
        <div class="star-pick" role="group" aria-label="Rating out of 5">
          ${[1, 2, 3, 4, 5].map((n) => `
            <button type="button" class="star-btn${n <= rating ? ' on' : ''}" data-star="${n}"
              aria-label="${n} ${n === 1 ? 'star' : 'stars'}" aria-pressed="${n <= rating}">
              ${starSvg(30, n <= rating)}
            </button>`).join('')}
          <span class="star-pick-label">${rating ? `${rating} / 5` : 'Tap a star'}</span>
        </div>
      </section>

      <section class="bm-section">
        <h3>Tell us about your experience</h3>
        <textarea class="rv-text" rows="5" maxlength="1000"
          placeholder="What was the trip like — the route, the guide, the food, the pace?">${escapeHtml(text)}</textarea>
        <p class="bm-hint"><span id="rvLeft">${1000 - text.length}</span> characters left</p>
      </section>

      <section class="bm-section">
        <h3>Would you recommend it?</h3>
        <div class="rec-pick">
          <button type="button" class="rec-btn yes${recommend === true ? ' on' : ''}" data-rec="yes">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 22V10l5-8 1.5 1a2 2 0 0 1 .7 2L13 10h5.5a2 2 0 0 1 2 2.4l-1.6 7A2 2 0 0 1 17 21H7z"/><path d="M7 10H4v12h3"/></svg>
            Recommend
          </button>
          <button type="button" class="rec-btn no${recommend === false ? ' on' : ''}" data-rec="no">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 2v12l-5 8-1.5-1a2 2 0 0 1-.7-2L11 14H5.5a2 2 0 0 1-2-2.4l1.6-7A2 2 0 0 1 7 3h10z"/><path d="M17 14h3V2h-3"/></svg>
            Not recommend
          </button>
        </div>
      </section>

      <p class="bm-note err" id="rvError" hidden></p>
      <button type="button" class="book-btn" id="rvSubmit"${rating ? '' : ' disabled'}>
        ${rating ? (mine ? 'Update review' : 'Post review') : 'Choose a rating first'}
      </button>`;

    wire();
  }

  function wire() {
    const area = body.querySelector('.rv-text');

    body.querySelectorAll('.star-btn').forEach((b) => {
      b.addEventListener('click', () => {
        text = area.value;                 // keep whatever is already typed
        rating = Number(b.dataset.star);
        draw();
      });
    });

    body.querySelectorAll('.rec-btn').forEach((b) => {
      b.addEventListener('click', () => {
        text = area.value;
        recommend = b.dataset.rec === 'yes';
        draw();
      });
    });

    const left = body.querySelector('#rvLeft');
    area.addEventListener('input', () => { left.textContent = 1000 - area.value.length; });

    body.querySelector('#rvSubmit').addEventListener('click', async () => {
      if (!rating) return;

      const button = body.querySelector('#rvSubmit');
      const error = body.querySelector('#rvError');
      button.disabled = true;
      button.textContent = 'Sending…';

      const row = {
        tour_slug: slug,
        user_id: profile.id,
        author_name: profile.full_name || profile.email || 'Traveller',
        rating,
        recommend: recommend ?? true,
        body: area.value.trim() || null,
        updated_at: new Date().toISOString(),
      };

      const { data, error: saveError } = await supabase
        .from('tour_reviews')
        .upsert(row, { onConflict: 'tour_slug,user_id' })
        .select()
        .maybeSingle();

      if (saveError) {
        error.textContent = `Could not save your review: ${saveError.message}`;
        error.hidden = false;
        button.disabled = false;
        button.textContent = mine ? 'Update review' : 'Post review';
        return;
      }

      // the cached average is what the pages paint from, so move it here
      // instead of refetching the whole table
      const before = cache.get(slug) || { avg: 0, count: 0 };
      const had = Boolean(mine);
      const count = had ? Math.max(1, before.count) : before.count + 1;
      const sum = before.avg * before.count - (had ? mine.rating : 0) + rating;
      cache.set(slug, { avg: sum / count, count });

      body.innerHTML = `
        <p class="bm-note ok">Thank you — your review is live.</p>
        <div class="bm-summary">
          <div class="bm-line"><span>Your rating</span><span>${rating} / 5</span></div>
          <div class="bm-line"><span>Verdict</span><span>${row.recommend ? 'Recommends' : 'Does not recommend'}</span></div>
          <div class="bm-line bm-grand"><span>Trip average</span><span>${(sum / count).toFixed(1)} / 5</span></div>
        </div>
        <button type="button" class="book-btn secondary" id="rvDone">Close</button>`;

      body.querySelector('#rvDone').addEventListener('click', close);
      onSaved?.(data || row);
    });
  }
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
