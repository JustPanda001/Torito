'use client';

// Saved trips.
//
// Loaded once per session rather than per card, so a listing of nine trips
// makes one query instead of nine. Signed-out visitors get an empty set and a
// prompt to create an account.
//
// `unseen` drives the "!" on the header heart: it turns on when the visitor adds
// a favorite, off when they open the saved view (markSeen), and removing never
// turns it on. It is remembered per account in localStorage (lib/badges.js).

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase, currentUser } from './supabaseClient';
import { favKey, readStore, writeStore } from './badges';

const FavContext = createContext({
  favorites: new Set(),
  isFavorite: () => false,
  toggle: () => {},
  signedIn: false,
  prompt: null,
  closePrompt: () => {},
  unseen: false,
  markSeen: () => {},
});

export function FavoritesProvider({ children }) {
  const [userId, setUserId] = useState(null);
  const [favorites, setFavorites] = useState(() => new Set());
  const [prompt, setPrompt] = useState(null);   // slug that triggered the prompt
  const [unseen, setUnseenState] = useState(false);
  // the ref is what toggle/markSeen read, so they never act on a stale render
  const unseenRef = useRef(false);
  const userRef = useRef(null);

  // the one place that changes the flag, so state, ref and storage agree
  const setUnseen = useCallback((value) => {
    unseenRef.current = value;
    setUnseenState(value);
    if (userRef.current) writeStore(favKey(userRef.current), value ? '1' : null);
  }, []);

  useEffect(() => {
    let alive = true;

    async function load() {
      const user = await currentUser();
      if (!alive) return;

      if (!user) {
        userRef.current = null;
        setUserId(null);
        setFavorites(new Set());
        unseenRef.current = false;
        setUnseenState(false);
        return;
      }
      userRef.current = user.id;
      setUserId(user.id);
      // favorites read from the database are not "new": only an add made in
      // this browser and not looked at yet is
      const stored = readStore(favKey(user.id)) === '1';
      unseenRef.current = stored;
      setUnseenState(stored);

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
    const hadUnseen = unseenRef.current;

    // update on screen first, then undo if the write fails — a heart that waits
    // on a round trip feels broken
    setFavorites((prev) => {
      const next = new Set(prev);
      if (saved) next.delete(slug); else next.add(slug);
      return next;
    });
    // adding shows the "!" again; removing leaves it exactly as it was
    if (!saved) setUnseen(true);

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
      if (!saved) setUnseen(hadUnseen);
    }
  }, [userId, favorites, setUnseen]);

  // the saved view was opened: the "!" has done its job
  const markSeen = useCallback(() => {
    if (unseenRef.current) setUnseen(false);
  }, [setUnseen]);

  // another tab of the same browser opened the saved view, or added a favorite
  useEffect(() => {
    if (!userId) return undefined;
    const onStorage = (e) => {
      if (e.key !== favKey(userId)) return;
      const value = e.newValue === '1';
      unseenRef.current = value;
      setUnseenState(value);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [userId]);

  const value = useMemo(() => ({
    favorites,
    isFavorite: (slug) => favorites.has(slug),
    toggle,
    signedIn: Boolean(userId),
    prompt,
    closePrompt: () => setPrompt(null),
    unseen,
    markSeen,
  }), [favorites, toggle, userId, prompt, unseen, markSeen]);

  return <FavContext.Provider value={value}>{children}</FavContext.Provider>;
}

export function useFavorites() {
  return useContext(FavContext);
}
