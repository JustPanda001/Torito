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

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase, currentUser } from './supabaseClient';

const RatingsContext = createContext({
  ratingFor: () => ({ avg: 0, count: 0 }),
  refresh: () => {},
  ready: false,
});

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
    const { data, error } = await supabase.from('tour_reviews').select('tour_slug, rating');

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

/** Every review for one trip, newest first. */
export async function fetchReviews(slug) {
  const { data, error } = await supabase
    .from('tour_reviews')
    .select('id, user_id, author_name, rating, recommend, body, created_at')
    .eq('tour_slug', slug)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('Could not load reviews:', error.message);
    return [];
  }
  return data ?? [];
}

/** This visitor's own review of a trip, or null. */
export async function myReview(slug) {
  const user = await currentUser();
  if (!user) return null;

  const { data } = await supabase
    .from('tour_reviews')
    .select('id, rating, recommend, body')
    .eq('tour_slug', slug)
    .eq('user_id', user.id)
    .maybeSingle();

  return data ?? null;
}

/**
 * Writes the visitor's review. One per person per trip: the unique constraint
 * on (tour_slug, user_id) means a second rating updates the first rather than
 * stacking, so upsert is the whole story.
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
}
