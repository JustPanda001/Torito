'use client';

// Trip detail page. The slug in the URL picks the trip, so every trip has a
// real page instead of one hard-coded one.

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import { openChat } from '@/components/ChatWidget';
import SiteFooter from '@/components/SiteFooter';
import Gallery from '@/components/Gallery';
import BookingModal from '@/components/BookingModal';
import SignInGate from '@/components/SignInGate';
import TripPlace from '@/components/TripPlace';
import { supabase, currentProfile } from '@/lib/supabaseClient';
import FavoriteButton from '@/components/FavoriteButton';
import Stars from '@/components/Stars';
import ReviewModal from '@/components/ReviewModal';
import { findTour, fromRow } from '@/lib/tours-data';
import { money } from '@/lib/season';
import { isLesson } from '@/lib/lessons';
import { fetchReviews, useRatings } from '@/lib/ratings';
import { bumpTourView } from '@/lib/views';

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
  // the placeholder renders immediately so the page is never blank, then the
  // database row replaces it — a trip added in the admin panel only exists there
  const [tour, setTour] = useState(() => findTour(slug));

  useEffect(() => {
    let alive = true;
    supabase
      .from('tours')
      .select('*')
      .eq('slug', slug)
      .maybeSingle()
      .then(({ data }) => { if (alive && data) setTour(fromRow(data)); });
    return () => { alive = false; };
  }, [slug]);
  const [booking, setBooking] = useState(false);
  // which button a signed-out visitor pressed: 'book', 'rate', or null
  const [gate, setGate] = useState(null);
  // undefined while we are still asking; null means signed out
  const [profile, setProfile] = useState(undefined);

  useEffect(() => {
    let alive = true;
    currentProfile()
      .then((p) => { if (alive) setProfile(p); })
      .catch(() => { if (alive) setProfile(null); });
    return () => { alive = false; };
  }, []);

  const { ratingFor, refresh: refreshRatings } = useRatings();
  const score = ratingFor(slug);
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(false);

  // one open, one view — this is what ranks the "Hot right now" strip
  useEffect(() => { bumpTourView(slug); }, [slug]);

  const loadReviews = useCallback(() => {
    fetchReviews(slug).then(setReviews).catch(() => {});
  }, [slug]);

  useEffect(() => { loadReviews(); }, [loadReviews]);

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
            <Stars avg={score.avg} count={score.count} size={16} />
          </div>
          <div className="detail-head-right">
            <span>{tour.region}</span><span className="dot">·</span>
            <span>{tour.views} views</span><span className="dot">·</span>
            <span>{tour.season_text}</span>
          </div>
        </div>

        <div className="detail-top">
          <div className="gallery-col">
            <Gallery photos={tour.gallery} alt={name} />
            <TripPlace tour={tour} />
          </div>

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
                <span className="fact-value">{money(tour.price)} per person</span>
              </li>
            </ul>

            <button
              type="button"
              className={`book-btn${full ? ' secondary' : ''}`}
              onClick={() => (profile ? setBooking(true) : setGate('book'))}
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

        <section className="detail-block reviews-block">
          <div className="reviews-head">
            <h2>Reviews</h2>
            {/* rating needs an account, the same way booking does */}
            <button
              type="button"
              className="book-btn secondary rate-btn"
              onClick={() => (profile ? setRating(true) : setGate('rate'))}
            >
              Rate this trip
            </button>
          </div>

          <div className="reviews-score">
            <Stars avg={score.avg} count={score.count} size={22} />
          </div>

          {reviews.length === 0 ? (
            <p className="form-note">
              No reviews yet. If you have been on this trip, yours would be the first.
            </p>
          ) : (
            <ul className="reviews-list">
              {reviews.map((r) => (
                <li className="review" key={r.id}>
                  <div className="review-top">
                    <strong>{r.author_name || 'Traveller'}</strong>
                    <Stars avg={r.rating} count={1} size={14} showCount={false} />
                    <span className="review-date">
                      {new Date(r.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {r.recommend && <span className="review-rec">Recommends this trip</span>}
                  {r.body && <p className="review-body">{r.body}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      {booking && <BookingModal tour={tour} onClose={() => setBooking(false)} />}
      {rating && (
        <ReviewModal
          tour={tour}
          profile={profile}
          onClose={() => setRating(false)}
          onSaved={() => { refreshRatings(); loadReviews(); }}
        />
      )}
      {gate && <SignInGate title={name} reason={gate} onClose={() => setGate(null)} />}
      <SiteFooter />
    </div>
  );
}
