'use client';

// Trip detail page. The slug in the URL picks the trip, so every trip has a
// real page instead of one hard-coded one.

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import { openChat } from '@/components/ChatWidget';
import SiteFooter from '@/components/SiteFooter';
import Gallery from '@/components/Gallery';
import BookingModal from '@/components/BookingModal';
import SignInGate from '@/components/SignInGate';
import { currentProfile } from '@/lib/supabaseClient';
import FavoriteButton from '@/components/FavoriteButton';
import { findTour } from '@/lib/tours-data';
import { money } from '@/lib/season';
import { isLesson } from '@/lib/lessons';

const ICONS = {
  distance: <><path d="M4 18h16" /><path d="M7 18l5-12 5 12" /></>,
  clock: <><circle cx="12" cy="12" r="8" /><path d="M12 7v5l3 2" /></>,
  peak: <path d="M3 20l7-14 4 8 3-5 4 11z" />,
  gain: <><path d="M3 17l6-6 4 4 8-8" /><path d="M15 7h6v6" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18" /></>,
  house: <><path d="M4 20V10l8-6 8 6v10" /><path d="M9 20v-6h6v6" /></>,
};

const Icon = ({ children }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7">{children}</svg>
);

export default function TourPage({ params }) {
  const { slug } = use(params);
  const tour = findTour(slug);
  const [booking, setBooking] = useState(false);
  const [gate, setGate] = useState(false);
  // undefined while we are still asking; null means signed out
  const [profile, setProfile] = useState(undefined);

  useEffect(() => {
    let alive = true;
    currentProfile()
      .then((p) => { if (alive) setProfile(p); })
      .catch(() => { if (alive) setProfile(null); });
    return () => { alive = false; };
  }, []);

  if (!tour) {
    return (
      <div className="subpage-shell">
        <SiteHeader solid />
        <main className="detail-page">
          <h1>Trip not found</h1>
          <p className="lead">
            We could not find a trip called <strong>{slug}</strong>. It may have
            been renamed or taken down. <Link className="auth-link" href="/tours">Browse all activities</Link>.
          </p>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const name = tour.full_title || tour.title;
  const full = tour.spots_left === 0;
  const lesson = isLesson(tour);

  // A lesson has no distance, no elevation and nowhere to sleep, and its
  // difficulty is whatever the visitor brings — those rows would all read "—".
  const facts = lesson ? [
    [ICONS.clock, 'Lesson length', tour.duration_long || tour.duration],
    [ICONS.calendar, 'Season', tour.season_text],
    [ICONS.globe, 'Languages', tour.languages],
  ] : [
    [ICONS.distance, 'Distance', tour.distance],
    [ICONS.clock, 'Duration', tour.duration_long || tour.duration],
    [ICONS.peak, 'Difficulty', tour.difficulty],
    [ICONS.gain, 'Elevation gain', tour.elevation_gain],
    [ICONS.calendar, 'Season', tour.season_text],
    [ICONS.globe, 'Languages', tour.languages],
    [ICONS.house, 'Stay', tour.stay],
  ];

  // nobody is being driven anywhere for a lesson: they meet the instructor on
  // the slope, at the time they asked for
  const info = lesson ? [
    ['Meeting point', tour.info?.departure_point],
    ['Group size', tour.info?.group_size],
  ] : [
    ['Departure point', tour.info?.departure_point],
    ['Departure time', tour.info?.departure_time],
    ['Return', tour.info?.return_info],
    ['Transport', tour.info?.transport],
    ['Group size', tour.info?.group_size],
    ['Walking per day', tour.info?.walking_per_day],
  ];

  return (
    <div className="subpage-shell">
      <SiteHeader solid />
      <main className="detail-page">

        <nav className="crumbs">
          <Link href="/">Home</Link><span>/</span>
          <Link href="/tours">Catalog</Link><span>/</span>
          <span className="here">{name}</span>
        </nav>

        <div className="detail-head">
          <div className="detail-head-left">
            {tour.badge && <span className={`badge badge-${tour.badge}`}>{tour.badge.toUpperCase()}</span>}
            <h1>{name}</h1>
          </div>
          <div className="detail-head-right">
            <span>{tour.region}</span><span className="dot">·</span>
            <span>{tour.views} views</span><span className="dot">·</span>
            <span>{tour.season_text}</span>
            <span className="tour-id">ID {tour.id}</span>
          </div>
        </div>

        <div className="detail-top">
          <Gallery photos={tour.gallery} alt={name} />

          <aside className="booking-card">
            <div className="book-top">
              <div className={`book-status ${full ? 'full' : 'open'}`}>{full ? 'Fully booked' : 'Spots open'}</div>
              <FavoriteButton slug={tour.slug} />
            </div>

            <div className="book-capacity">
              <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.7">
                <circle cx="9" cy="8" r="3.2" /><path d="M2.5 19c0-3.4 2.9-5.5 6.5-5.5s6.5 2.1 6.5 5.5" />
                <circle cx="17.5" cy="9" r="2.6" /><path d="M17.5 14c2.6 0 4 1.8 4 4" />
              </svg>
              <strong>{tour.capacity}</strong>
              <span>people max <em>· {full ? 'no spots left' : `${tour.spots_left} spots left`}</em></span>
            </div>

            <ul className="fact-list">
              {facts.map(([icon, label, value]) => (
                <li key={label}>
                  <Icon>{icon}</Icon>
                  <span className="fact-label">{label}</span>
                  <span className="fact-value">{value || '—'}</span>
                </li>
              ))}
              <li>
                <Icon>{ICONS.clock}</Icon>
                <span className="fact-label">Price</span>
                <span className="fact-value">{money(tour.price)} pp</span>
              </li>
            </ul>

            <button
              type="button"
              className={`book-btn${full ? ' secondary' : ''}`}
              onClick={() => (profile ? setBooking(true) : setGate(true))}
            >
              {full ? 'Join waitlist' : lesson ? 'Book a lesson' : 'Book a spot'}
            </button>
            <button type="button" className="book-btn secondary" onClick={() => openChat(tour)}>Ask a question</button>
          </aside>
        </div>

        <section className="detail-block">
          <h2>{lesson ? 'About these lessons' : 'About this trip'}</h2>
          <p className="lead">{tour.summary}</p>

          <div className="info-grid">
            {info.map(([label, value]) => (
              <div className="info-item" key={label}>
                <span className="info-label">{label}</span>
                <span className="info-value">{value || '—'}</span>
              </div>
            ))}
          </div>

          {!lesson && tour.itinerary?.length > 0 && (
            <>
              <h3>Where we go</h3>
              <ol className="itinerary">
                {tour.itinerary.map(([title, text], i) => (
                  <li key={title}>
                    <span className="day">{tour.itinerary.length === 1 ? 'Plan' : `Day ${i + 1}`}</span>
                    <div><strong>{title}</strong><p>{text}</p></div>
                  </li>
                ))}
              </ol>
            </>
          )}
        </section>

        <section className="detail-block">
          <h2>What&apos;s included</h2>
          <div className="included-grid">
            {tour.included.map((x) => (
              <div className="inc-item yes" key={x.title}>
                <span className="mark">✓</span><div><strong>{x.title}</strong><span>{x.note}</span></div>
              </div>
            ))}
            {tour.excluded.map((x) => (
              <div className="inc-item no" key={x.title}>
                <span className="mark">×</span><div><strong>{x.title}</strong><span>{x.note}</span></div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {booking && <BookingModal tour={tour} onClose={() => setBooking(false)} />}
      {gate && <SignInGate title={name} onClose={() => setGate(false)} />}
      <SiteFooter />
    </div>
  );
}
