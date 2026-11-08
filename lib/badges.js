'use client';

// "Something new" badges: a single small "!" instead of number counters.
//
//   favorites   the heart in the header (state lives in lib/favorites.js, which
//               uses the storage helpers below)
//   admin       Chat and Booking requests links in the account menu: unread chat
//               conversations (chat_conversations.admin_unread) and bookings with
//               status 'new' newer than the last time /admin/bookings was opened
//   customer    My bookings link: a booking the customer has not looked at yet, or
//               one whose status changed since they last opened /bookings
//
// "Seen" is remembered in localStorage per signed-in user (every read and write
// is wrapped, storage can be missing or blocked). Checks are light: once on load,
// then every minute while the tab is visible, plus whenever something on the
// site says the answer may have changed (refreshBadges). No realtime channel.
//
// Database access is read-only and goes through the same policies as the pages:
// an admin may read every booking and conversation, a customer only their own
// bookings, and a signed-out visitor makes no request at all.

import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { useT } from './i18n';

export const BADGES_EVENT = 'mtani:badges-refresh';
const POLL_MS = 60 * 1000;

/* ---------------- storage ---------------- */

export function readStore(key) {
  try { return window.localStorage.getItem(key); } catch { return null; }
}

export function writeStore(key, value) {
  try {
    if (value == null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch { /* private mode or blocked storage: the badge just comes back next visit */ }
}

function readJSON(key) {
  try {
    const raw = readStore(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export const favKey = (userId) => `mtani.badge.fav.${userId}`;
const adminBookingsKey = (userId) => `mtani.badge.adminBookings.${userId}`;
const myBookingsKey = (userId) => `mtani.badge.myBookings.${userId}`;

/** Tells every mounted header to look again (a page just marked something seen,
 *  or something just happened that may deserve a "!"). */
export function refreshBadges() {
  try { window.dispatchEvent(new Event(BADGES_EVENT)); } catch { /* not in a browser */ }
}

const time = (iso) => {
  const n = Date.parse(iso);
  return Number.isNaN(n) ? 0 : n;
};

/* ---------------- "seen" markers, called by the pages ---------------- */

/** /admin/bookings: remembers the newest booking the admin has now been shown. */
export function markAdminBookingsSeen(userId, rows) {
  if (!userId || !Array.isArray(rows) || !rows.length) return;
  const newest = rows.reduce((max, r) => (time(r.created_at) > time(max) ? r.created_at : max), '');
  if (!newest) return;
  const prev = readStore(adminBookingsKey(userId));
  if (prev && time(prev) >= time(newest)) return;
  writeStore(adminBookingsKey(userId), newest);
  refreshBadges();
}

/** /bookings: remembers each of the customer's bookings with its current status. */
export function markMyBookingsSeen(userId, rows) {
  if (!userId || !Array.isArray(rows)) return;
  const map = {};
  rows.forEach((r) => { map[r.id] = r.status; });
  writeStore(myBookingsKey(userId), JSON.stringify(map));
  refreshBadges();
}

/* ---------------- checking ---------------- */

async function adminChatUnread() {
  const { count, error } = await supabase
    .from('chat_conversations')
    .select('id', { count: 'exact', head: true })
    .eq('admin_unread', true);
  return error ? null : (count ?? 0) > 0;
}

async function adminBookingsUnseen(userId) {
  const { data, error } = await supabase
    .from('bookings')
    .select('created_at')
    .eq('status', 'new')
    .order('created_at', { ascending: false })
    .limit(1);
  if (error) return null;
  const newest = data?.[0]?.created_at;
  if (!newest) return false;
  const seen = readStore(adminBookingsKey(userId));
  return !seen || time(newest) > time(seen);
}

async function myBookingsChanged(userId) {
  const { data, error } = await supabase
    .from('bookings')
    .select('id, status')
    // RLS alone is not enough: an admin may read every booking
    .eq('user_id', userId);
  if (error) return null;
  if (!data?.length) return false;
  const seen = readJSON(myBookingsKey(userId)) ?? {};
  return data.some((b) => seen[b.id] !== b.status);
}

const NONE = { chat: false, bookings: false, mine: false };

// Dev only, like ?mockuser=: ?mockuser=admin&mockbadges=chat,bookings,mine (or
// "all") shows the "!" without a database, so both themes can be checked.
function mockBadges() {
  if (process.env.NODE_ENV === 'production' || typeof window === 'undefined') return null;
  const want = new URLSearchParams(window.location.search).get('mockbadges');
  if (!want) return null;
  const on = (name) => want === 'all' || want.split(',').includes(name);
  return { chat: on('chat'), bookings: on('bookings'), mine: on('mine') };
}

/**
 * Which "!" the account menu should show for this profile:
 *   chat      admin only: unread conversations
 *   bookings  admin only: new booking requests not opened yet
 *   mine      any signed-in user: own bookings not looked at / changed status
 * Signed out (profile null) always gives all false and makes no request.
 */
export function useAccountBadges(profile) {
  const [state, setState] = useState(NONE);
  const userId = profile?.id ?? null;
  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (!userId) { setState(NONE); return undefined; }

    if (userId === 'mock') {
      setState(mockBadges() ?? NONE);
      return undefined;
    }

    let alive = true;
    const patch = (key, value) => {
      // null = the check failed: keep what was showing rather than flicker
      if (!alive || value === null) return;
      setState((s) => (s[key] === value ? s : { ...s, [key]: value }));
    };

    async function check() {
      if (document.hidden) return;
      const jobs = [myBookingsChanged(userId).then((v) => patch('mine', v))];
      if (isAdmin) {
        jobs.push(adminChatUnread().then((v) => patch('chat', v)));
        jobs.push(adminBookingsUnseen(userId).then((v) => patch('bookings', v)));
      }
      await Promise.allSettled(jobs);
    }

    check();
    const timer = setInterval(check, POLL_MS);
    const onVisible = () => { if (!document.hidden) check(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener(BADGES_EVENT, check);

    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener(BADGES_EVENT, check);
    };
  }, [userId, isAdmin]);

  return userId ? state : NONE;
}

/* ---------------- the "!" itself ---------------- */

const LABEL = {
  en: 'New',
  ka: 'ახალი',
  ru: 'Новое',
  zh: '有新内容',
};

/** The words a screen reader gets for the "!" (the glyph alone says nothing). */
export function useBangLabel() {
  const { lang } = useT();
  return LABEL[lang] || LABEL.en;
}

/**
 * The round "!" badge. Inside a link or button that carries its own aria-label,
 * pass `decorative` and add useBangLabel() to that label instead, because an
 * aria-label replaces everything inside it.
 */
export function Bang({ className = '', decorative = false }) {
  const label = useBangLabel();
  const cls = `bang${className ? ` ${className}` : ''}`;
  return decorative
    ? <span className={cls} aria-hidden="true">!</span>
    : <span className={cls} role="img" aria-label={label}>!</span>;
}
