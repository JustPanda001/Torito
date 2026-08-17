'use client';

// The activity listing.
//
// Placeholder trips render immediately so the page is never blank, then the
// database rows replace them if any exist.

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import TourCard from '@/components/TourCard';
import DateFilter from '@/components/DateFilter';
import { TOURS } from '@/lib/tours-data';
import { seasonCovers } from '@/lib/season';
import { supabase } from '@/lib/supabaseClient';
import { useT } from '@/lib/i18n';
import { useFavorites } from '@/lib/favorites';

const CHIPS = [
  ['all', 'cat.all'],
  ['hiking', 'cat.hiking'],
  ['camping', 'cat.camping'],
  ['ski', 'cat.ski'],
  ['culture', 'cat.culture'],
];

// useSearchParams() opts a page out of prerendering unless it sits inside a
// Suspense boundary, so the listing itself lives in the inner component.
export default function ToursPage() {
  return (
    <Suspense fallback={<div className="subpage-shell" />}>
      <ToursListing />
    </Suspense>
  );
}

/**
 * Loose text match across the fields a visitor would actually type: the trip
 * name, where it is and what kind of thing it is. Every word has to appear
 * somewhere, so "svaneti trek" narrows rather than widens.
 */
function matches(tour, query) {
  if (!query) return true;
  const haystack = [
    tour.title, tour.subtitle, tour.region, tour.category,
    tour.difficulty, tour.summary, tour.season,
  ].filter(Boolean).join(' ').toLowerCase();

  return query.toLowerCase().split(/\s+/).every((word) => haystack.includes(word));
}

function ToursListing() {
  const { t } = useT();
  const params = useSearchParams();
  const { isFavorite, signedIn, favorites } = useFavorites();
  // ?saved=1 narrows the listing to trips this visitor has hearted
  const savedOnly = params.get('saved') === '1';
  // ?q=… comes from the header search box
  const query = (params.get('q') ?? '').trim();
  // ?cat=… comes from the menu and the home page activity cards
  const wanted = params.get('cat');

  const [tours, setTours] = useState(TOURS);
  const [category, setCategory] = useState(CHIPS.some(([k]) => k === wanted) ? wanted : 'all');
  const [range, setRange] = useState({ from: null, to: null });

  // following another menu link while already on the listing has to move the
  // chip too, and that is a prop change rather than a fresh mount
  useEffect(() => {
    if (wanted && CHIPS.some(([k]) => k === wanted)) setCategory(wanted);
  }, [wanted]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await supabase
        .from('tours')
        .select('*')
        .eq('published', true)
        .order('created_at', { ascending: false });

      // nothing published yet, or the database is unreachable — the
      // placeholders already on screen are a better answer than an error
      if (!alive || error || !data?.length) return;
      setTours(data);
    })();
    return () => { alive = false; };
  }, []);

  const shown = useMemo(() => tours.filter((tour) => (
    (category === 'all' || tour.category === category)
    && seasonCovers(tour, range.from, range.to)
    && (!savedOnly || isFavorite(tour.slug))
    && matches(tour, query)
  )), [tours, category, range, savedOnly, isFavorite, favorites, query]);

  return (
    <div className="subpage-shell">
      <SiteHeader solid />
      <main className="listing-page">

        <div className="listing-head">
          <h1>
            {query ? t('listing.searchTitle', { q: query })
              : savedOnly ? t('saved.title') : t('listing.title')}
          </h1>
          <p className="listing-count">{t('listing.count', { n: shown.length })}</p>
          {savedOnly && (
            <Link className="auth-link saved-back" href="/tours">{t('saved.showAll')}</Link>
          )}
          {query && (
            <Link className="auth-link saved-back" href="/tours">{t('listing.clearSearch')}</Link>
          )}
        </div>

        <div className="filter-bar">
          {CHIPS.map(([key, text]) => (
            <button
              key={key}
              type="button"
              className={`chip${category === key ? ' active' : ''}`}
              onClick={() => setCategory(key)}
            >
              {t(text)}
            </button>
          ))}
        </div>

        <DateFilter from={range.from} to={range.to} onChange={setRange} />

        <div className="listing">
          {shown.length ? (
            shown.map((tour) => <TourCard key={tour.slug} tour={tour} />)
          ) : savedOnly ? (
            <div className="empty-saved">
              <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 20s-7-4.6-7-9.4A4 4 0 0 1 12 8a4 4 0 0 1 7-2.6c0 4.8-7 9.4-7 9.4z" />
              </svg>
              <p>{signedIn ? t('saved.empty') : t('saved.signedOut')}</p>
              <Link className="tour-btn" href={signedIn ? '/tours' : '/login'}>
                {signedIn ? t('saved.browse') : t('auth.signInBtn')}
              </Link>
            </div>
          ) : query ? (
            <p className="form-note">{t('listing.noSearch', { q: query })}</p>
          ) : (
            <p className="form-note">{t('listing.none')}</p>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
