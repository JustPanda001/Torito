'use client';

// The activity listing.
//
// Placeholder trips render immediately so the page is never blank, then the
// database rows replace them if any exist.

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import TourCard from '@/components/TourCard';
import DateFilter from '@/components/DateFilter';
import FilterIcon from '@/components/FilterIcon';
import { TOURS, withDemos } from '@/lib/tours-data';
import { seasonCovers } from '@/lib/season';
import { supabase } from '@/lib/supabaseClient';
import { useT } from '@/lib/i18n';
import { useFavorites } from '@/lib/favorites';
import { searchTours } from '@/lib/search';
import {
  CATEGORIES, SUB_FILTERS, byCatalogOrder, categoryOf, isOffered, matchesSubFilter,
} from '@/lib/catalog';

const CHIPS = [['all', 'cat.all'], ...CATEGORIES.map((c) => [c, `cat.${c}`])];

// useSearchParams() opts a page out of prerendering unless it sits inside a
// Suspense boundary, so the listing itself lives in the inner component.
export default function ToursPage() {
  return (
    <Suspense fallback={<div className="subpage-shell" />}>
      <ToursListing />
    </Suspense>
  );
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
  // ?type=… narrows inside the category, e.g. the winter cards on the home page
  const wantedType = params.get('type') ?? '';

  const [tours, setTours] = useState(TOURS);
  // Favorites always opens with no filters, even if a link carries ?cat=
  const [category, setCategory] = useState(!savedOnly && CHIPS.some(([k]) => k === wanted) ? wanted : 'all');
  const [range, setRange] = useState({ from: null, to: null });
  // the second filter belongs to the category, so switching category clears it
  const [sub, setSub] = useState(savedOnly ? '' : wantedType);
  const subFilter = SUB_FILTERS[category] ?? null;

  // closed on a phone, where it is a disclosure; the CSS keeps it open on a
  // wide screen regardless of this
  const [filtersOpen, setFiltersOpen] = useState(false);

  // what the count on the button means: a narrowed category, its own second
  // filter, and a date range are each one thing the visitor has chosen
  const activeFilters = (category !== 'all' ? 1 : 0) + (sub ? 1 : 0) + (range.from ? 1 : 0);

  function clearFilters() {
    setCategory('all');
    setSub('');
    setRange({ from: null, to: null });
  }

  function pickCategory(key) {
    setCategory(key);
    setSub('');
  }

  // following another menu link while already on the listing has to move the
  // chip too, and that is a prop change rather than a fresh mount
  // Filters live in this component's state, which survives client-side
  // navigation, so arriving at (or leaving) Favorites would keep whatever was
  // chosen before. Start clean whenever ?saved=1 switches on or off; filters
  // picked on the page afterwards still work.
  const wasSaved = useRef(savedOnly);
  useEffect(() => {
    if (wasSaved.current === savedOnly) return;
    wasSaved.current = savedOnly;
    clearFilters();
  }, [savedOnly]);

  useEffect(() => {
    if (!savedOnly && wanted && CHIPS.some(([k]) => k === wanted)) { setCategory(wanted); setSub(wantedType); }
  }, [wanted, wantedType, savedOnly]);

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
      setTours(withDemos(data));
    })();
    return () => { alive = false; };
  }, []);

  const filtered = useMemo(() => tours.filter((tour) => (
    isOffered(tour)
    && (category === 'all' || categoryOf(tour) === category)
    && matchesSubFilter(tour, category, sub)
    && seasonCovers(tour, range.from, range.to)
    && (!savedOnly || isFavorite(tour.slug))
  )), [tours, category, sub, range, savedOnly, isFavorite, favorites]);

  // with a search, best match first (typos forgiven, see lib/search.js);
  // without one, winter first as usual
  const search = useMemo(() => (query ? searchTours(filtered, query) : null), [filtered, query]);
  const shown = useMemo(() => (search
    ? search.results.map((r) => r.tour)
    : [...filtered].sort(byCatalogOrder)), [search, filtered]);
  const similar = search && !shown.length ? search.similar.map((r) => r.tour) : [];

  // a new search starts from the whole catalogue rather than inside whatever
  // category was picked before it
  useEffect(() => {
    if (query && !wanted) { setCategory('all'); setSub(''); }
  }, [query, wanted]);

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
            <Link className="auth-link saved-back" href="/activities">{t('saved.showAll')}</Link>
          )}
          {query && (
            <Link className="auth-link saved-back" href="/activities">{t('listing.clearSearch')}</Link>
          )}
          {search?.corrected && search.corrected !== query.toLowerCase() && (
            <p className="did-you-mean">
              {t('listing.didYouMean')}{' '}
              <Link href={`/activities?q=${encodeURIComponent(search.corrected)}`}>{search.corrected}</Link>
            </p>
          )}
        </div>

        {/* On a phone the three chip rows fill the screen before a single trip
            is visible, so they fold behind this. It is the same controls
            either way — the panel is simply always open on a wide screen. */}
        <div className="filters-head">
          <button
            type="button"
            className={`filter-toggle${activeFilters ? ' has-value' : ''}`}
            aria-expanded={filtersOpen}
            onClick={() => setFiltersOpen((v) => !v)}
          >
            <FilterIcon />
            <span>{t('listing.filters')}</span>
            {activeFilters > 0 && <span className="filter-count">{activeFilters}</span>}
          </button>

          {activeFilters > 0 && (
            <button type="button" className="filter-clear" onClick={clearFilters}>
              {t('listing.clearFilters')}
            </button>
          )}
        </div>

        <div className={`filters${filtersOpen ? ' open' : ''}`}>
        {/* These name the three groups inside the panel, where the chips would
            otherwise run together as one block. They are drawn only on a
            phone: the wide layout already separates the rows by placing
            them. */}
        <span className="filter-group-label">{t('listing.groupActivity')}</span>
        <div className="filter-bar">
          {CHIPS.map(([key, text]) => (
            <button
              key={key}
              type="button"
              className={`chip${category === key ? ' active' : ''}`}
              onClick={() => pickCategory(key)}
            >
              {t(text)}
            </button>
          ))}
        </div>

        {/* the category's own filter on the left, dates pushed to the right */}
        <div className="filter-row">
          {subFilter ? (
            <div className="sub-filter">
              <span className="filter-group-label">{t(subFilter.group)}</span>
              {/* the same chips as the row above, one level down: clearing is
                  a chip of its own rather than a hidden "none" option */}
              <button
                type="button"
                className={`chip small${sub === '' ? ' active' : ''}`}
                onClick={() => setSub('')}
              >
                {t(subFilter.label)}
              </button>
              {subFilter.options.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={`chip small${sub === value ? ' active' : ''}`}
                  onClick={() => setSub(value)}
                >
                  {t(label)}
                </button>
              ))}
            </div>
          ) : <span />}

          <div className="filter-dates">
            <span className="filter-group-label">{t('listing.groupWhen')}</span>
            <DateFilter from={range.from} to={range.to} onChange={setRange} category={category} tours={tours} />
          </div>
        </div>
        </div>

        <div className="listing">
          {shown.length ? (
            shown.map((tour) => <TourCard key={tour.slug} tour={tour} />)
          ) : savedOnly ? (
            <div className="empty-saved">
              <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 20s-7-4.6-7-9.4A4 4 0 0 1 12 8a4 4 0 0 1 7-2.6c0 4.8-7 9.4-7 9.4z" />
              </svg>
              <p>{signedIn ? t('saved.empty') : t('saved.signedOut')}</p>
              <Link className="tour-btn" href={signedIn ? '/activities' : '/login'}>
                {signedIn ? t('saved.browse') : t('auth.signInBtn')}
              </Link>
            </div>
          ) : query && similar.length ? (
            <>
              <p className="form-note">{t('listing.similar', { q: query })}</p>
              {similar.map((tour) => <TourCard key={tour.slug} tour={tour} />)}
            </>
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
