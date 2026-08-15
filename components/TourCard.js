'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { seasonLabel } from '@/lib/season';
import { useT } from '@/lib/i18n';

const ICONS = {
  distance: <><path d="M4 18h16" /><path d="M7 18l5-12 5 12" /></>,
  clock: <><circle cx="12" cy="12" r="8" /><path d="M12 7v5l3 2" /></>,
  peak: <path d="M3 20l7-14 4 8 3-5 4 11z" />,
  house: <><path d="M4 20V10l8-6 8 6v10" /><path d="M9 20v-6h6v6" /></>,
};

const Icon = ({ children }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7">{children}</svg>
);

export default function TourCard({ tour }) {
  const { t } = useT();
  const router = useRouter();
  const full = tour.spots_left === 0;
  const season = seasonLabel(tour);
  const href = `/tours/${tour.slug}`;

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

        <ul className="spec-grid">
          <li><Icon>{ICONS.distance}</Icon><span>{tour.distance || '—'}</span></li>
          <li><Icon>{ICONS.clock}</Icon><span>{tour.duration || '—'}</span></li>
          <li><Icon>{ICONS.peak}</Icon><span>{tour.difficulty || '—'}</span></li>
          <li><Icon>{ICONS.house}</Icon><span>{tour.stay || '—'}</span></li>
        </ul>

        <div className="tour-meta">
          {tour.badge === 'top' && <span className="badge badge-top">TOP</span>}
          {tour.badge === 'new' && <span className="badge badge-new">NEW</span>}
          <span>{tour.region || ''}</span>
          {season && <span className="tour-season">{season}</span>}
        </div>
      </div>

      <div className="tour-side">
        <div className="tour-region">{tour.region || ''}</div>
        <div className={`tour-status ${full ? 'full' : 'open'}`}>{full ? t('listing.fullyBooked') : t('listing.spotsOpen')}</div>

        <div className="tour-capacity">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7">
            <circle cx="9" cy="8" r="3.2" /><path d="M2.5 19c0-3.4 2.9-5.5 6.5-5.5s6.5 2.1 6.5 5.5" />
            <circle cx="17.5" cy="9" r="2.6" /><path d="M17.5 14c2.6 0 4 1.8 4 4" />
          </svg>
          <strong>{tour.capacity}</strong><span className="cap-label">{t('listing.peopleMax')}</span>
        </div>

        <Link className={`tour-btn${full ? ' ghost' : ''}`} href={href}>
          {full ? t('listing.waitlist') : t('listing.viewTrip')}
        </Link>
      </div>
    </article>
  );
}
