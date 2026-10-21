'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { localizeTour } from '@/lib/trip-translations';
import { useT } from '@/lib/i18n';
import FavoriteButton from './FavoriteButton';
import Stars from './Stars';
import { useRatings } from '@/lib/ratings';
import { filled } from '@/lib/filled';
import { isBookable } from '@/lib/bookable';

const ICONS = {
  distance: <><path d="M4 18h16" /><path d="M7 18l5-12 5 12" /></>,
  clock: <><circle cx="12" cy="12" r="8" /><path d="M12 7v5l3 2" /></>,
  peak: <path d="M3 20l7-14 4 8 3-5 4 11z" />,
  house: <><path d="M4 20V10l8-6 8 6v10" /><path d="M9 20v-6h6v6" /></>,
};

// month names come from Intl so every language gets its own, not English
const INTL_LOCALE = { en: 'en-GB', ka: 'ka-GE', ru: 'ru-RU', zh: 'zh-CN' };

function seasonText(tour, lang, t) {
  if (!tour?.season_from || !tour?.season_to) return '';
  if (tour.season_from === '01-01' && tour.season_to === '12-31') return t('listing.allYear');
  const fmt = new Intl.DateTimeFormat(INTL_LOCALE[lang] ?? 'en-GB', { month: 'short' });
  const mon = (md) => fmt.format(new Date(2026, Number(md.slice(0, 2)) - 1, 1));
  return `${mon(tour.season_from)} – ${mon(tour.season_to)}`;
}

const Icon = ({ children }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7">{children}</svg>
);

export default function TourCard({ tour: source }) {
  const { t, lang } = useT();
  const router = useRouter();
  // text comes from the translated view; slug, category and prices stay on the original
  const tour = localizeTour(source, lang);
  const score = useRatings().ratingFor(tour.slug);

  const specs = [
    [ICONS.distance, tour.distance],
    [ICONS.clock, tour.duration],
    [ICONS.peak, tour.difficulty],
    [ICONS.house, tour.stay],
  ].filter(([, value]) => filled(value));
  const bookable = isBookable(source);
  const full = bookable && source.spots_left === 0;
  const season = seasonText(source, lang, t);
  const href = `/activities/${tour.slug}`;

  // anywhere on the card opens the trip, but real links and selected text
  // still behave normally
  function onClick(e) {
    if (e.target.closest('a')) return;
    if (window.getSelection().toString()) return;
    router.push(href);
  }

  return (
    <article className="tour-card reveal visible" onClick={onClick}>
      <Link className="tour-photo" href={href} tabIndex={-1}>
        <img src={tour.cover_image || '/assets/hero.svg'} alt={tour.title} loading="lazy" decoding="async" />
      </Link>

      <div className="tour-main">
        <h2 className="tour-title">
          {tour.title}
          {tour.subtitle && <span className="tour-sub">{tour.subtitle}</span>}
        </h2>

        {/* only the facts this trip actually has — the same rule the trip page
            follows, so a card and the page it opens agree */}
        {specs.length > 0 && (
          <ul className="spec-grid">
            {specs.map(([icon, value]) => (
              <li key={value}><Icon>{icon}</Icon><span>{value}</span></li>
            ))}
          </ul>
        )}

        <div className="tour-meta">
          {tour.badge === 'top' && <span className="badge badge-top">{t('listing.badgeTop')}</span>}
          {tour.badge === 'new' && <span className="badge badge-new">{t('listing.badgeNew')}</span>}
          <span>{tour.region || ''}</span>
          {season && <span className="tour-season">{season}</span>}
        </div>

        <div className="tour-rating">
          <Stars avg={score.avg} count={score.count} size={14} />
        </div>
      </div>

      <div className="tour-side">
        <div className="tour-region-row">
          <FavoriteButton slug={tour.slug} />
          <span className="tour-region">{tour.region || ''}</span>
        </div>
        {/* a trip we are not selling this season says so instead of showing spots */}
        {bookable ? (
          <div className={`tour-status ${full ? 'full' : 'open'}`}>{full ? t('listing.fullyBooked') : t('listing.spotsOpen')}</div>
        ) : (
          <div className="tour-status unavailable">{t('listing.unavailable')}</div>
        )}

        <Link className={`tour-btn${full ? ' ghost' : ''}`} href={href}>
          {full ? t('listing.waitlist') : t('listing.viewTrip')}
        </Link>
      </div>
    </article>
  );
}
