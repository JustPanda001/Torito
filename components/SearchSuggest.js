'use client';

// The dropdown under the header search box: the best matching trips while
// the visitor is still typing, with a link to the full results.
//
// The catalogue is fetched once per visit and shared by every page, so typing
// costs nothing after the first letter.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { TOURS, withDemos } from '@/lib/tours-data';
import { categoryOf, isOffered } from '@/lib/catalog';
import { searchTours } from '@/lib/search';
import { useT } from '@/lib/i18n';
import { localizeTour } from '@/lib/trip-translations';

let catalog = null;
function loadCatalog() {
  if (!catalog) {
    catalog = supabase.from('tours').select('*').eq('published', true)
      .then(({ data, error }) => (!error && data?.length ? withDemos(data) : TOURS).filter(isOffered))
      .catch(() => TOURS.filter(isOffered));
  }
  return catalog;
}

export default function SearchSuggest({ query, open, onPick, onSeeAll }) {
  const { t, lang } = useT();
  const [tours, setTours] = useState(null);

  useEffect(() => {
    if (!open || tours) return;
    let alive = true;
    loadCatalog().then((list) => { if (alive) setTours(list); });
    return () => { alive = false; };
  }, [open, tours]);

  const q = query.trim();
  if (!open || q.length < 2 || !tours) return null;

  const found = searchTours(tours, q);
  const list = (found.results.length ? found.results : found.similar).slice(0, 5).map((r) => r.tour);
  // search matched on the stored text; what is shown is the translated view
  const view = (tour) => localizeTour(tour, lang);

  return (
    <div className="search-suggest" role="listbox">
      {list.length === 0 && <p className="search-suggest-none">{t('search.none')}</p>}
      {list.map((source) => {
        const tour = view(source);
        return (
        <Link
          key={source.slug}
          href={`/activities/${tour.slug}`}
          className="search-suggest-item"
          // mousedown, not click: the field's blur would close the list first
          onMouseDown={(e) => { e.preventDefault(); onPick(`/activities/${tour.slug}`); }}
        >
          <img src={tour.cover_image || '/assets/hero.svg'} alt="" loading="lazy" />
          <span>
            <strong>{tour.full_title || tour.title}</strong>
            <em>{t(`cat.${categoryOf(source)}`)}{tour.region ? ` · ${tour.region}` : ''}</em>
          </span>
        </Link>
        );
      })}
      {found.corrected && !found.results.length && (
        <p className="search-suggest-none">{t('listing.didYouMean')} <strong>{found.corrected}</strong>?</p>
      )}
      <button type="button" className="search-suggest-all" onMouseDown={(e) => { e.preventDefault(); onSeeAll(); }}>
        {t('search.seeAll')} →
      </button>
    </div>
  );
}
