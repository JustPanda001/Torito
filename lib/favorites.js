'use client';

// Saved trips.
//
// Loaded once per session rather than per card, so a listing of nine trips
// makes one query instead of nine. Signed-out visitors get an empty set and a
// prompt to create an account.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase, currentUser } from './supabaseClient';

const FavContext = createContext({
  favorites: new Set(),
  isFavorite: () => false,
  toggle: () => {},
  signedIn: false,
  prompt: null,
  closePrompt: () => {},
});

export function FavoritesProvider({ children }) {
  const [userId, setUserId] = useState(null);
  const [favorites, setFavorites] = useState(() => new Set());
  const [prompt, setPrompt] = useState(null);   // slug that triggered the prompt

  useEffect(() => {
    let alive = true;

    async function load() {
      const user = await currentUser();
      if (!alive) return;

      if (!user) { setUserId(null); setFavorites(new Set()); return; }
      setUserId(user.id);

      const { data, error } = await supabase
        .from('favorites')
        .select('tour_slug')
        .eq('user_id', user.id);

      if (!alive) return;
      if (error) { console.warn('Could not load favourites:', error.message); return; }
      setFavorites(new Set((data ?? []).map((r) => r.tour_slug)));
    }

    load();
    // signing in or out has to refresh the list, or the hearts show the
    // previous visitor's saved trips
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());

    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);

  const toggle = useCallback(async (slug) => {
    if (!userId) { setPrompt(slug); return; }

    const saved = favorites.has(slug);

    // update on screen first, then undo if the write fails — a heart that waits
    // on a round trip feels broken
    setFavorites((prev) => {
      const next = new Set(prev);
      if (saved) next.delete(slug); else next.add(slug);
      return next;
    });

    const { error } = saved
      ? await supabase.from('favorites').delete().eq('user_id', userId).eq('tour_slug', slug)
      : await supabase.from('favorites').insert({ user_id: userId, tour_slug: slug });

    if (error) {
      console.warn('Could not save favourite:', error.message);
      setFavorites((prev) => {
        const next = new Set(prev);
        if (saved) next.add(slug); else next.delete(slug);
        return next;
      });
    }
  }, [userId, favorites]);

  const value = useMemo(() => ({
    favorites,
    isFavorite: (slug) => favorites.has(slug),
    toggle,
    signedIn: Boolean(userId),
    prompt,
    closePrompt: () => setPrompt(null),
  }), [favorites, toggle, userId, prompt]);

  return <FavContext.Provider value={value}>{children}</FavContext.Provider>;
}

export function useFavorites() {
  return useContext(FavContext);
}
