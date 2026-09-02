'use client';

// How often each trip's page gets opened.
//
// This is what "Hot right now" ranks on. The count is bumped through an RPC
// rather than an update, because a visitor has no write permission on the
// table — bump_tour_view is security definer, so it can add one without
// letting anyone set the number to whatever they like.

import { supabase } from './supabaseClient';

/** Counts one page open. Fire and forget: a missing table must not break the page. */
export async function bumpTourView(slug) {
  if (!slug) return;
  const { error } = await supabase.rpc('bump_tour_view', { slug });
  if (error) console.warn('View not counted:', error.message);
}

/** slug -> views. Empty when the table is not there yet. */
export async function fetchViewCounts() {
  const { data, error } = await supabase.from('tour_views').select('tour_slug, views');
  if (error) {
    console.warn('View counts unavailable:', error.message);
    return new Map();
  }
  return new Map((data ?? []).map((row) => [row.tour_slug, Number(row.views) || 0]));
}

/** December–February is winter, and so on around the year. */
export function seasonOf(date = new Date()) {
  const m = date.getMonth();
  if (m === 11 || m <= 1) return 'winter';
  if (m <= 4) return 'spring';
  if (m <= 7) return 'summer';
  return 'autumn';
}
