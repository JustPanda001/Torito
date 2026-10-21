'use client';

// Admin: approve or reject reviews before the public sees them.
//
// New reviews, and approved ones their author has edited, arrive as 'pending'
// (the moderate_tour_review trigger in REVIEWS-MODERATION.sql sets that). The
// gate below only hides the UI — the "admins manage reviews" policy and that
// trigger are what actually stop a non-admin changing a status.

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import Stars from '@/components/Stars';
import { supabase, currentProfile, friendlyError } from '@/lib/supabaseClient';
import { fetchAllReviews, setReviewStatus, useRatings } from '@/lib/ratings';
import { findTour } from '@/lib/tours-data';
import { useT } from '@/lib/i18n';

// Postgres "undefined column": the moderation SQL has not been run yet
const NO_STATUS_COLUMN = '42703';

const TABS = [
  ['pending', 'reviews.tabPending', 'Pending'],
  ['approved', 'reviews.tabApproved', 'Approved'],
  ['rejected', 'reviews.tabRejected', 'Rejected'],
];

const EMPTY = {
  pending: ['reviews.emptyPending', 'Nothing is waiting. New and edited reviews will appear here.'],
  approved: ['reviews.emptyApproved', 'No approved reviews yet.'],
  rejected: ['reviews.emptyRejected', 'No rejected reviews.'],
};

const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString() : '');

export default function AdminReviewsPage() {
  const [profile, setProfile] = useState(undefined);   // undefined = still checking
  const [reviews, setReviews] = useState(null);         // null = still loading
  const [titles, setTitles] = useState(() => new Map());
  const [tab, setTab] = useState('pending');
  const [loadError, setLoadError] = useState(null);
  // per-review save errors, and the ids with a save in flight
  const [rowErrors, setRowErrors] = useState({});
  const [busy, setBusy] = useState(() => new Set());
  const { refresh: refreshRatings } = useRatings();
  const { t } = useT();

  // English shown until the translator adds the key (t returns the key itself)
  const tr = (key, en, vars) => {
    const s = t(key, vars);
    if (s !== key) return s;
    let out = en;
    if (vars) for (const [k, v] of Object.entries(vars)) out = out.replaceAll(`{${k}}`, v);
    return out;
  };

  useEffect(() => {
    currentProfile().then(setProfile).catch(() => setProfile(null));
  }, []);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setReviews(await fetchAllReviews());
    } catch (error) {
      setReviews([]);
      setLoadError(error?.code === NO_STATUS_COLUMN
        ? tr('reviews.needSql', 'Reviews cannot be moderated yet. Run REVIEWS-MODERATION.sql in the Supabase SQL editor first.')
        : friendlyError(error));
    }

    // trip names for the list; tour_reviews only stores the slug
    const { data } = await supabase.from('tours').select('slug, title');
    setTitles(new Map((data ?? []).map((row) => [row.slug, row.title])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { if (profile?.role === 'admin') load(); }, [profile, load]);

  const counts = useMemo(() => {
    const c = { pending: 0, approved: 0, rejected: 0 };
    for (const r of reviews ?? []) if (c[r.status] !== undefined) c[r.status] += 1;
    return c;
  }, [reviews]);

  if (profile === undefined) {
    return <Denied message="Checking your account…" />;
  }
  if (!profile) {
    return <Denied message="You are not signed in." />;
  }
  if (profile.role !== 'admin') {
    return <Denied message={`Signed in as ${profile.email}, but this account is not an admin.`} />;
  }

  const tripName = (slug) => titles.get(slug) || findTour(slug)?.title || slug;

  // Optimistic: the card moves to its new tab at once, and moves back with an
  // error under it if the database refuses.
  async function change(review, status) {
    const before = review.status;
    setRowErrors((prev) => ({ ...prev, [review.id]: null }));
    setBusy((prev) => new Set(prev).add(review.id));
    setReviews((list) => list.map((r) => (r.id === review.id ? { ...r, status } : r)));

    try {
      const saved = await setReviewStatus(review.id, status);
      setReviews((list) => list.map((r) => (r.id === review.id ? { ...r, ...saved } : r)));
      // the stars on cards and trip pages count approved reviews only
      refreshRatings();
    } catch (error) {
      setReviews((list) => list.map((r) => (r.id === review.id ? { ...r, status: before } : r)));
      setRowErrors((prev) => ({
        ...prev,
        [review.id]: tr('reviews.saveFailed', 'Could not save this change: {error}', { error: friendlyError(error) }),
      }));
    } finally {
      setBusy((prev) => { const next = new Set(prev); next.delete(review.id); return next; });
    }
  }

  // a review whose save failed stays visible in the tab it went back to, with
  // its error, because the revert puts it there
  const shown = (reviews ?? []).filter((r) => r.status === tab);

  return (
    <div className="subpage-shell">
      <SiteHeader solid />
      <main className="detail-page rev-admin">
        <div className="listing-head rev-admin-head">
          <h1>{tr('reviews.adminTitle', 'Reviews')}</h1>
          <Link className="auth-link" href="/admin">{tr('reviews.backToAdmin', 'Manage activities')}</Link>
        </div>
        <p className="rev-admin-intro">
          {tr('reviews.adminIntro', 'New and edited reviews wait here until you approve them. Only approved reviews are shown on the site.')}
        </p>

        <div className="rev-tabs" role="tablist" aria-label={tr('reviews.filterLabel', 'Filter reviews by status')}>
          {TABS.map(([value, key, en]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              className={`rev-tab${tab === value ? ' on' : ''}`}
              onClick={() => setTab(value)}
            >
              {tr(key, en)}
              <span className="rev-tab-count">{reviews ? counts[value] : '…'}</span>
            </button>
          ))}
        </div>

        {loadError && <p className="rev-error" role="alert">{loadError}</p>}

        {reviews === null ? (
          <p className="rev-empty">{tr('reviews.loading', 'Loading reviews…')}</p>
        ) : shown.length === 0 ? (
          !loadError && <p className="rev-empty">{tr(EMPTY[tab][0], EMPTY[tab][1])}</p>
        ) : (
          <ul className="rev-list" role="tabpanel">
            {shown.map((r) => {
              const edited = r.updated_at && r.created_at
                && new Date(r.updated_at) - new Date(r.created_at) > 60_000;
              const saving = busy.has(r.id);
              return (
                <li className="rev-card" key={r.id}>
                  <div className="rev-card-top">
                    <Link className="rev-trip" href={`/activities/${r.tour_slug}`}>
                      {tripName(r.tour_slug)}
                    </Link>
                    <span className="rev-date">
                      {fmtDate(r.created_at)}
                      {edited && ` · ${tr('reviews.edited', 'edited {date}', { date: fmtDate(r.updated_at) })}`}
                    </span>
                  </div>

                  <div className="rev-card-meta">
                    <strong>{r.author_name || tr('reviews.traveller', 'Traveller')}</strong>
                    <Stars avg={r.rating} count={1} size={15} showCount={false} />
                    <span className={`rev-rec${r.recommend ? ' yes' : ' no'}`}>
                      {r.recommend
                        ? tr('reviews.recommendYes', 'Recommends: yes')
                        : tr('reviews.recommendNo', 'Recommends: no')}
                    </span>
                  </div>

                  {r.body
                    ? <p className="rev-body">{r.body}</p>
                    : <p className="rev-body rev-body-none">{tr('reviews.noText', 'No written text, stars only.')}</p>}

                  {rowErrors[r.id] && <p className="rev-error" role="alert">{rowErrors[r.id]}</p>}

                  <div className="rev-actions">
                    {r.status !== 'approved' && (
                      <button type="button" className="rev-btn approve" disabled={saving} onClick={() => change(r, 'approved')}>
                        {tr('reviews.approve', 'Approve')}
                      </button>
                    )}
                    {r.status !== 'rejected' && (
                      <button type="button" className="rev-btn reject" disabled={saving} onClick={() => change(r, 'rejected')}>
                        {tr('reviews.reject', 'Reject')}
                      </button>
                    )}
                    {r.status !== 'pending' && (
                      <button type="button" className="rev-btn" disabled={saving} onClick={() => change(r, 'pending')}>
                        {tr('reviews.moveToPending', 'Move back to pending')}
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
          <img src="/assets/torito-logo.png" alt="" /><span>TORITO</span>
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
