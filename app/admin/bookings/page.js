'use client';

// Admin: answer booking requests. Every "Book a spot" / "Book a lesson" /
// waitlist request lands in the bookings table as status 'new'; here the admin
// confirms or declines it (and can undo back to 'new').
//
// The gate below only hides the UI. The "admins manage bookings" policy
// (is_admin()) is what actually lets a status change through, so a non-admin
// who reaches this page sees nothing and cannot update anything.
//
// No emails are sent from here: this only changes bookings.status, which the
// customer sees on My bookings. The change goes through
// /api/admin/booking-status, which also updates the Status column of the
// owner's Google Sheet. Admin pages are English-only.

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import { supabase, currentProfile, friendlyError } from '@/lib/supabaseClient';
import { bookingRef } from '@/lib/bookingRef';
import { markAdminBookingsSeen } from '@/lib/badges';
import { money } from '@/lib/season';

const TABS = [
  ['new', 'Needs answer'],
  ['confirmed', 'Confirmed'],
  ['declined', 'Declined'],
  ['all', 'All'],
];

const EMPTY = {
  new: 'Nothing is waiting for an answer.',
  confirmed: 'No confirmed bookings.',
  declined: 'No declined bookings.',
  all: 'No bookings yet.',
};

const STATUS_LABEL = { new: 'Needs answer', confirmed: 'Confirmed', declined: 'Declined' };
// only ski/snowboard lessons are 'lesson'; paragliding, snowmobiles, hikes and
// transfers are all 'trip'
const KIND_LABEL = { trip: 'Activity', lesson: 'Lesson', waitlist: 'Waitlist' };

// "2026-12-28" -> "28 Dec 2026". The date has no time zone, so format as UTC
// to keep the day from shifting.
function formatDay(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value ?? ''));
  if (!m) return '';
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(d);
}

// "5 minutes ago", "3 hours ago", "2 days ago"; a plain date after a month
const REL = new Intl.RelativeTimeFormat('en', { numeric: 'always' });
function timeAgo(iso, now) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const secs = Math.max(0, Math.round((now - then) / 1000));
  if (secs < 60) return 'just now';
  const mins = Math.round(secs / 60);
  if (mins < 60) return REL.format(-mins, 'minute');
  const hours = Math.round(secs / 3600);
  if (hours < 24) return REL.format(-hours, 'hour');
  const days = Math.round(secs / 86400);
  if (days < 31) return REL.format(-days, 'day');
  return new Date(then).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const fullTime = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
};

// dialable form of a phone number as the visitor typed it
const telHref = (phone) => `tel:${String(phone).replace(/[^\d+]/g, '')}`;

export default function AdminBookingsPage() {
  const [profile, setProfile] = useState(undefined);   // undefined = still checking
  const [rows, setRows] = useState(null);               // null = still loading
  const [tab, setTab] = useState('new');
  const [query, setQuery] = useState('');
  const [loadError, setLoadError] = useState(null);
  // per-booking save errors, and the ids with a save in flight
  const [rowErrors, setRowErrors] = useState({});
  const [busy, setBusy] = useState(() => new Set());
  // re-rendered every minute so "x minutes ago" stays honest
  const [now, setNow] = useState(() => Date.now());
  const userId = profile?.id ?? null;

  useEffect(() => {
    currentProfile().then(setProfile).catch(() => setProfile(null));
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const load = useCallback(async () => {
    setLoadError(null);
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      setRows((prev) => prev ?? []);
      setLoadError(friendlyError(error));
      return;
    }
    setRows(data ?? []);
    setNow(Date.now());
    // opening the list is what clears the "!" on Booking requests
    markAdminBookingsSeen(userId, data ?? []);
  }, [userId]);

  useEffect(() => { if (profile?.role === 'admin') load(); }, [profile, load]);

  const counts = useMemo(() => {
    const c = { new: 0, confirmed: 0, declined: 0, all: 0 };
    for (const r of rows ?? []) {
      c.all += 1;
      if (c[r.status] !== undefined) c[r.status] += 1;
    }
    return c;
  }, [rows]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (rows ?? []).filter((r) => {
      if (tab !== 'all' && r.status !== tab) return false;
      if (!q) return true;
      return [r.name, r.email, r.phone, r.tour_title, bookingRef(r.id)]
        .some((field) => String(field ?? '').toLowerCase().includes(q));
    });
  }, [rows, tab, query]);

  if (profile === undefined) {
    return <Denied message="Checking your account…" />;
  }
  if (!profile) {
    return <Denied message="You are not signed in." />;
  }
  if (profile.role !== 'admin') {
    return <Denied message={`Signed in as ${profile.email ?? 'this account'}, but this account is not an admin.`} />;
  }

  // Optimistic: the card moves to its new tab at once, and moves back with an
  // error under it if the database refuses.
  async function change(booking, status) {
    if (status === 'declined') {
      const who = booking.name || booking.email || 'this customer';
      if (!window.confirm(`Decline ${bookingRef(booking.id)} from ${who}? They will see it as declined on My bookings.`)) return;
    }

    const before = booking.status;
    setRowErrors((prev) => ({ ...prev, [booking.id]: null }));
    setBusy((prev) => new Set(prev).add(booking.id));
    setRows((list) => list.map((r) => (r.id === booking.id ? { ...r, status } : r)));

    try {
      // The server route makes the change as this admin (their own token, so
      // the database policy still decides) and then updates the Google Sheet.
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error('Your session has expired. Please sign in again.');

      const res = await fetch('/api/admin/booking-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: booking.id, status }),
      });
      const result = await res.json().catch(() => null);
      if (!res.ok) throw new Error(result?.error || 'The database did not accept the change. Check that you are signed in as an admin.');
      if (!result?.id) throw new Error('The database did not accept the change. Check that you are signed in as an admin.');
      setRows((list) => list.map((r) => (r.id === booking.id ? { ...r, id: result.id, status: result.status } : r)));
    } catch (error) {
      setRows((list) => list.map((r) => (r.id === booking.id ? { ...r, status: before } : r)));
      setRowErrors((prev) => ({
        ...prev,
        [booking.id]: `Could not save this change: ${friendlyError(error)}`,
      }));
    } finally {
      setBusy((prev) => { const next = new Set(prev); next.delete(booking.id); return next; });
    }
  }

  return (
    <div className="subpage-shell">
      <SiteHeader solid />
      <main className="detail-page rev-admin">
        <div className="listing-head rev-admin-head">
          <h1>Bookings</h1>
          <Link className="auth-link" href="/admin">Manage activities</Link>
        </div>
        <p className="rev-admin-intro">
          Requests from the booking form, newest first. Confirming or declining changes the status the customer sees on My bookings. No email is sent from here, so reply to the customer yourself.
        </p>

        <div className="rev-tabs" role="tablist" aria-label="Filter bookings by status">
          {TABS.map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              className={`rev-tab${tab === value ? ' on' : ''}`}
              onClick={() => setTab(value)}
            >
              {label}
              <span className="rev-tab-count">{rows ? counts[value] : '…'}</span>
            </button>
          ))}
        </div>

        <div className="ab-tools">
          <input
            type="search"
            className="ab-search"
            placeholder="Search name, email, phone, trip or reference"
            aria-label="Search bookings"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="button" className="rev-btn" onClick={load}>Refresh</button>
        </div>

        {loadError && <p className="rev-error" role="alert">Could not load bookings: {loadError}</p>}

        {rows === null ? (
          <p className="rev-empty">Loading bookings…</p>
        ) : shown.length === 0 ? (
          !loadError && (
            <p className="rev-empty">
              {query.trim() ? 'No bookings match your search.' : EMPTY[tab]}
            </p>
          )
        ) : (
          <ul className="rev-list" role="tabpanel">
            {shown.map((b) => {
              const saving = busy.has(b.id);
              const status = b.status in STATUS_LABEL ? b.status : 'new';
              const when = [formatDay(b.wanted_date), b.lesson_time].filter(Boolean).join(' · ');
              const lesson = [b.lesson_type, b.skill_level].filter(Boolean).join(' · ');
              return (
                <li className="rev-card ab-card" key={b.id}>
                  <div className="ab-top">
                    <div className="ab-head">
                      <span className="ab-ref">{bookingRef(b.id)}</span>
                      <span className={`ab-kind kind-${b.kind}`}>{KIND_LABEL[b.kind] ?? b.kind}</span>
                    </div>
                    <span className={`ab-status is-${status}`}>{STATUS_LABEL[status]}</span>
                  </div>

                  <h2 className="ab-title">
                    {b.tour_slug
                      ? <Link href={`/activities/${b.tour_slug}`}>{b.tour_title || b.tour_slug}</Link>
                      : (b.tour_title || 'Booking request')}
                  </h2>

                  <dl className="ab-meta">
                    <div><dt>Wanted</dt><dd>{when || 'No date (waitlist)'}</dd></div>
                    <div><dt>People</dt><dd>{b.people ?? '-'}</dd></div>
                    <div><dt>Total</dt><dd>{b.total != null ? money(b.total) : '-'}</dd></div>
                    {lesson && <div><dt>Lesson</dt><dd>{lesson}</dd></div>}
                  </dl>

                  <dl className="ab-meta ab-contact">
                    <div><dt>Name</dt><dd>{b.name || '-'}</dd></div>
                    <div>
                      <dt>Email</dt>
                      <dd>{b.email ? <a href={`mailto:${b.email}`}>{b.email}</a> : '-'}</dd>
                    </div>
                    <div>
                      <dt>Phone</dt>
                      <dd>{b.phone ? <a href={telHref(b.phone)}>{b.phone}</a> : '-'}</dd>
                    </div>
                  </dl>

                  <p className="ab-created" title={fullTime(b.created_at)}>
                    Requested {timeAgo(b.created_at, now)}
                  </p>

                  {rowErrors[b.id] && <p className="rev-error" role="alert">{rowErrors[b.id]}</p>}

                  <div className="rev-actions">
                    {b.status !== 'confirmed' && (
                      <button type="button" className="rev-btn approve" disabled={saving} onClick={() => change(b, 'confirmed')}>
                        Confirm
                      </button>
                    )}
                    {b.status !== 'declined' && (
                      <button type="button" className="rev-btn reject" disabled={saving} onClick={() => change(b, 'declined')}>
                        Decline
                      </button>
                    )}
                    {b.status !== 'new' && (
                      <button type="button" className="rev-btn" disabled={saving} onClick={() => change(b, 'new')}>
                        Undo (back to needs answer)
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}

// same gate screen as app/admin/page.js
function Denied({ message }) {
  return (
    <main className="auth-page">
      <div className="auth-card">
        <Link className="auth-logo" href="/">
          <img src="/assets/mtani-mark.svg" alt="" /><span>MTANI</span>
        </Link>
        <h1>Admins only</h1>
        <p className="form-note">{message}</p>
        <p className="auth-foot">
          <Link className="auth-link" href="/login">Sign in</Link> · <Link className="auth-link" href="/">Back to site</Link>
        </p>
      </div>
    </main>
  );
}
