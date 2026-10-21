'use client';

// Star ratings and written reviews.
//
// Scores are loaded once per page and shared, the way favourites are: a listing
// of nine trips makes one query rather than nine. Averages are computed here
// rather than in a database view, so no migration is needed when the shape of a
// review changes.
//
// Rating requires an account. That is enforced by the row-level policy on
// tour_reviews (the insert check is user_id = auth.uid(), which a signed-out
// visitor can never satisfy) — the signed-out branch in the dialog is a
// courtesy, not the lock.
//
// Reviews are moderated (REVIEWS-MODERATION.sql): only status = 'approved'
// counts or shows publicly. Row-level security already hides other people's
// pending rows, but it still lets an author see their own pending review and an
// admin see everything — so every public query here also asks for 'approved'
// explicitly, or an author would see their own unapproved stars in the average.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase, currentUser } from './supabaseClient';

const RatingsContext = createContext({
  ratingFor: () => ({ avg: 0, count: 0 }),
  refresh: () => {},
  ready: false,
});

// Postgres "undefined column": the moderation SQL has not been run yet, so
// there is no status column and every review is still public, as before.
const NO_STATUS_COLUMN = '42703';

/**
 * Runs a public reviews query with status = 'approved'. Before the moderation
 * SQL exists, retries without the filter so reviews do not vanish meanwhile.
 */
async function approvedOnly(build) {
  const first = await build().eq('status', 'approved');
  if (first.error?.code === NO_STATUS_COLUMN) return build();
  return first;
}

/** Rolls raw review rows up into { slug -> { avg, count } }. */
function summarise(rows) {
  const totals = new Map();

  for (const row of rows) {
    const entry = totals.get(row.tour_slug) ?? { sum: 0, count: 0 };
    entry.sum += Number(row.rating) || 0;
    entry.count += 1;
    totals.set(row.tour_slug, entry);
  }

  const scores = new Map();
  for (const [slug, { sum, count }] of totals) {
    scores.set(slug, { avg: sum / count, count });
  }
  return scores;
}

export function RatingsProvider({ children }) {
  const [scores, setScores] = useState(() => new Map());
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    const { data, error } = await approvedOnly(
      () => supabase.from('tour_reviews').select('tour_slug, rating'),
    );

    // A missing table is the normal state before the SQL has been run. Stars
    // then read "No ratings yet" instead of the page breaking.
    if (error) {
      console.warn('Ratings unavailable:', error.message);
      setReady(true);
      return;
    }
    setScores(summarise(data ?? []));
    setReady(true);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const value = useMemo(() => ({
    ratingFor: (slug) => scores.get(slug) ?? { avg: 0, count: 0 },
    refresh,
    ready,
  }), [scores, refresh, ready]);

  return <RatingsContext.Provider value={value}>{children}</RatingsContext.Provider>;
}

export function useRatings() {
  return useContext(RatingsContext);
}

/** Every approved review for one trip, newest first. */
export async function fetchReviews(slug) {
  const { data, error } = await approvedOnly(() => supabase
    .from('tour_reviews')
    .select('id, user_id, author_name, rating, recommend, body, created_at')
    .eq('tour_slug', slug)
    .order('created_at', { ascending: false }));

  if (error) {
    console.warn('Could not load reviews:', error.message);
    return [];
  }
  return data ?? [];
}

/**
 * This visitor's own review of a trip, or null. Includes its status, so the
 * dialog can say "waiting for approval" rather than implying it is live.
 * Before the moderation SQL runs there is no status column; status is then
 * null and the dialog shows no moderation note (the review is simply live).
 */
export async function myReview(slug) {
  const user = await currentUser();
  if (!user) return null;

  const query = (cols) => supabase
    .from('tour_reviews')
    .select(cols)
    .eq('tour_slug', slug)
    .eq('user_id', user.id)
    .maybeSingle();

  let { data, error } = await query('id, rating, recommend, body, status');
  if (error?.code === NO_STATUS_COLUMN) {
    ({ data } = await query('id, rating, recommend, body'));
    if (data) data = { ...data, status: null };
  }
  return data ?? null;
}

/**
 * Writes the visitor's review. One per person per trip: the unique constraint
 * on (tour_slug, user_id) means a second rating updates the first rather than
 * stacking, so upsert is the whole story.
 *
 * Status is never sent: the moderate_tour_review trigger sets a new or edited
 * review to 'pending' itself. Returns the status the database settled on
 * (null before the moderation SQL has run).
 */
export async function saveReview(slug, { rating, recommend, body, authorName }) {
  const user = await currentUser();
  if (!user) throw new Error('Please sign in to rate this trip.');

  const { error } = await supabase
    .from('tour_reviews')
    .upsert({
      tour_slug: slug,
      user_id: user.id,
      author_name: authorName || null,
      rating,
      recommend,
      body: body?.trim() || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'tour_slug,user_id' });

  if (error) throw error;

  const mine = await myReview(slug).catch(() => null);
  return mine?.status ?? null;
}

// ---------------------------------------------------------------------------
// Moderation (admin only). The admin page checks the role to hide its UI; the
// "admins manage reviews" policy and the moderate_tour_review trigger are what
// actually stop anyone else changing a status.
// ---------------------------------------------------------------------------

export const REVIEW_STATUSES = ['pending', 'approved', 'rejected'];

/** Every review at every status, newest first. Admins only (RLS). */
export async function fetchAllReviews() {
  const { data, error } = await supabase
    .from('tour_reviews')
    .select('id, tour_slug, user_id, author_name, rating, recommend, body, status, created_at, updated_at, reviewed_at')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/**
 * Sets one review's status. Asks for the row back: an update that RLS
 * silently filters out returns no error and no row, and that has to read as a
 * failure, not as success.
 */
export async function setReviewStatus(id, status) {
  if (!REVIEW_STATUSES.includes(status)) throw new Error(`Unknown status: ${status}`);

  const { data, error } = await supabase
    .from('tour_reviews')
    .update({ status })
    .eq('id', id)
    .select('id, status, reviewed_at');

  if (error) throw error;
  if (!data?.length) throw new Error('The review was not changed. Are you still signed in as an admin?');
  return data[0];
}
