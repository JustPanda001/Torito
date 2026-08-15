'use client';

// The activity listing.
//
// Placeholder trips render immediately so the page is never blank, then the
// database rows replace them if any exist.

import { useEffect, useMemo, useState } from 'react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import TourCard from '@/components/TourCard';
import DateFilter from '@/components/DateFilter';
import { TOURS } from '@/lib/tours-data';
import { seasonCovers } from '@/lib/season';
import { supabase } from '@/lib/supabaseClient';
import { useT } from '@/lib/i18n';

const CHIPS = [
  ['all', 'cat.all'],
  ['hiking', 'cat.hiking'],
  ['camping', 'cat.camping'],
  ['ski', 'cat.ski'],
  ['culture', 'cat.culture'],
];

export default function ToursPage() {
  const { t } = useT();
  const [tours, setTours] = useState(TOURS);
  const [category, setCategory] = useState('all');
  const [range, setRange] = useState({ from: null, to: null });

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

  const shown = useMemo(() => tours.filter((t) => (
    (category === 'all' || t.category === category)
    && seasonCovers(t, range.from, range.to)
  )), [tours, category, range]);

  return (
    <div className="subpage-shell">
      <SiteHeader solid />
      <main className="listing-page">

        <div className="listing-head">
          <h1>{t('listing.title')}</h1>
          <p className="listing-count">{t('listing.count', { n: shown.length })}</p>
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
          {shown.length
            ? shown.map((tour) => <TourCard key={tour.slug} tour={tour} />)
            : <p className="form-note">{t('listing.none')}</p>}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
