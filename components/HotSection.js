'use client';

// "Hot right now" — the four trips people are opening most, out of the ones
// that actually run in the season we are in today.
//
// Popularity comes from tour_views, bumped once per trip page open. Until that
// table has numbers in it (a fresh install, or the SQL not run yet) the
// placeholder `views` counts in tours-data.js stand in, so the strip is never
// empty and never has holes in the grid.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TOURS } from '@/lib/tours-data';
import { seasonCovers } from '@/lib/season';
import { supabase } from '@/lib/supabaseClient';
import { fetchViewCounts, seasonOf } from '@/lib/views';
import { categoryOf } from '@/lib/catalog';
import { useT } from '@/lib/i18n';

const SEASONS = {
  winter: {
    label: 'Winter',
    lead: 'Winter in Georgia is snow season. Gudauri and Bakuriani fill up with skiers and snowboarders, the passes turn white, and the mountain villages are at their quietest and most beautiful.',
  },
  spring: {
    label: 'Spring',
    lead: 'Spring is when Georgia turns green again. The lower trails open first, the valleys are full of wildflowers, and the wine country is warm long before the mountains are.',
  },
  summer: {
    label: 'Summer',
    lead: 'Summer in Georgia is a season of excitement and active fun. Long days in the high mountains, camping under clear skies, rivers to raft and ridge walks that stay open into the evening.',
  },
  autumn: {
    label: 'Autumn',
    lead: 'Autumn is harvest season. The trails are empty and golden, the air is sharp in the mornings, and Kakheti is in the middle of the grape picking.',
  },
};

/**
 * In-season trips first, most-opened at the top. If the season is thin —
 * nothing published for it yet — the rest of the catalogue fills the gap
 * rather than leaving the grid short.
 */
function pickHot(tours, counts, today, limit) {
  const score = (t) => counts.get(t.slug) ?? t.views ?? 0;
  const byScore = (a, b) => score(b) - score(a);

  const inSeason = tours.filter((t) => seasonCovers(t, today, today)).sort(byScore);
  if (inSeason.length >= limit) return inSeason.slice(0, limit);

  const rest = tours.filter((t) => !inSeason.includes(t)).sort(byScore);
  return [...inSeason, ...rest].slice(0, limit);
}

export default function HotSection() {
  const { t } = useT();
  // the placeholders render immediately so the strip is never blank, then the
  // real catalogue and the real counts replace them
  const [tours, setTours] = useState(TOURS);
  const [counts, setCounts] = useState(() => new Map());

  // fixed at mount: a date recomputed on every render would make pickHot churn
  const [today] = useState(() => new Date());
  const season = SEASONS[seasonOf(today)];

  useEffect(() => {
    let alive = true;

    (async () => {
      const [published, views] = await Promise.all([
        supabase.from('tours').select('*').eq('published', true),
        fetchViewCounts(),
      ]);

      if (!alive) return;
      if (published.data?.length) setTours(published.data);
      setCounts(views);
    })();

    return () => { alive = false; };
  }, []);

  const hot = pickHot(tours, counts, today, 4);

  return (
    <section className="section reveal visible hot-section" id="hot">
      <div className="hot-grid">
        {hot.map((tour) => {
          const views = counts.get(tour.slug) ?? 0;
          return (
            <Link className="hot-tile" href={`/tours/${tour.slug}`} key={tour.slug}>
              <img
                src={tour.cover_image || '/assets/hero.svg'}
                alt={tour.title}
                loading="lazy"
                decoding="async"
              />
              <span className="hot-tile-label">
                <strong>{tour.title}</strong>
                <em>
                  {t(`cat.${categoryOf(tour)}`)}
                  {views > 0 && ` · ${views} views`}
                </em>
              </span>
            </Link>
          );
        })}
      </div>

      <div className="hot-text">
        <span className="hot-kicker">
          <span className="hot-dot" aria-hidden="true" />
          Hot right now
        </span>
        <h2>Experience<br />Top Activities<br />in {season.label}</h2>
        <p>{season.lead}</p>
        <Link className="hot-btn" href="/tours">
          Discover Adventures <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}
