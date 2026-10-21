'use client';

// Trip detail page. The slug in the URL picks the trip, so every trip has a
// real page instead of one hard-coded one.

import { Fragment, use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
import { isBookable } from '@/lib/bookable';
import { creditsFor } from '@/lib/photo-credits';
import { isLesson, isTimed } from '@/lib/lessons';
import { tourOptions, compareRows, cellKind } from '@/lib/options';
import { fetchReviews, useRatings } from '@/lib/ratings';
import { bumpTourView } from '@/lib/views';
import { requiredItems } from '@/lib/requiredItems';
import { itineraryMode } from '@/lib/itinerary';
import { filled } from '@/lib/filled';
import { useT } from '@/lib/i18n';
import { localizeTour } from '@/lib/trip-translations';

// date locale per site language
const DATE_LOCALE = { en: 'en-GB', ka: 'ka-GE', ru: 'ru-RU', zh: 'zh-CN' };

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
  const { t, lang } = useT();
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
  const router = useRouter();
  const pathname = usePathname();
  const [booking, setBooking] = useState(false);
  // which of the service's options is picked; the first one to begin with
  const [optIdx, setOptIdx] = useState(0);
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

  // arriving from an email confirmation link, the session is parsed after the
  // first check above has already said "signed out" — so look again on sign-in
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== 'SIGNED_IN') return;
      // deferred: supabase advises against calling back into it from this callback
      setTimeout(() => { currentProfile().then(setProfile).catch(() => {}); }, 0);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const { ratingFor, refresh: refreshRatings } = useRatings();
  const score = ratingFor(slug);
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(false);

  // coming back from sign-in with ?book=1 / ?rate=1: reopen the dialog they
  // were in, then drop the param so a refresh does not open it again. A full
  // tour opens the same dialog, which is the waitlist form.
  useEffect(() => {
    if (!profile || !tour) return;
    const params = new URLSearchParams(window.location.search);
    const wantBook = params.get('book') === '1';
    const wantRate = params.get('rate') === '1';
    if (!wantBook && !wantRate) return;
    if (wantBook) { if (isBookable(tour)) setBooking(true); }
    else setRating(true);
    router.replace(pathname, { scroll: false });
  }, [profile, tour, router, pathname]);

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
          <h1>{t('detail.notFound')}</h1>
          <p className="lead">
            {t('trip.notFoundText', { slug })}{' '}
            <Link className="auth-link" href="/activities">{t('detail.browseAll')}</Link>
          </p>
        </main>
        <SiteFooter />
      </div>
    );
  }

  // text shown to the visitor comes from `view`; logic keeps reading `tour`
  const view = localizeTour(tour, lang);
  const name = view.full_title || view.title;
  const full = tour.spots_left === 0;
  // only winter and transfers can be booked this season; the rest stay visible
  const bookable = isBookable(tour);
  const credits = creditsFor([tour.cover_image, ...(tour.gallery || [])]);
  const lesson = isLesson(tour);

  // A lesson counts its length rather than a duration, and meets people on the
  // slope rather than departing from anywhere — so the labels differ. Which
  // rows actually appear is decided below, by what the trip has filled in.
  const allFacts = lesson ? [
    [ICONS.clock, t('trip.factLessonLength'), view.duration_long || view.duration],
    [ICONS.calendar, t('fact.season'), view.season_text],
    [ICONS.globe, t('fact.languages'), view.languages],
  ] : [
    [ICONS.distance, t('fact.distance'), view.distance],
    [ICONS.clock, t('fact.duration'), view.duration_long || view.duration],
    [ICONS.peak, t('fact.difficulty'), view.difficulty],
    [ICONS.gain, t('fact.elevation'), view.elevation_gain],
    [ICONS.calendar, t('fact.season'), view.season_text],
    [ICONS.globe, t('fact.languages'), view.languages],
    [ICONS.house, t('fact.stay'), view.stay],
  ];

  const allInfo = lesson ? [
    [t('trip.infoMeetingPoint'), view.info?.departure_point],
    [t('trip.infoGroupSize'), view.info?.group_size],
  ] : [
    [t('trip.infoDeparturePoint'), view.info?.departure_point],
    [t('trip.infoDepartureTime'), view.info?.departure_time],
    [t('trip.infoReturn'), view.info?.return_info],
    [t('trip.infoTransport'), view.info?.transport],
    [t('trip.infoGroupSize'), view.info?.group_size],
    [t('trip.infoWalking'), view.info?.walking_per_day],
  ];

  const options = tourOptions(tour);
  const chosen = options[Math.min(optIdx, options.length - 1)] ?? null;
  const rows = compareRows(tour, options.length);
  const showCompare = options.length > 1;
  const learnMore = () => document.getElementById('compare')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const facts = allFacts.filter(([, , value]) => filled(value));
  const info = allInfo.filter(([, value]) => filled(value));
  const mustBring = requiredItems(tour);
  const itinMode = itineraryMode(tour);

  return (
    <div className="subpage-shell">
      <SiteHeader solid />
      <main className="detail-page">

        <nav className="crumbs">
          <Link href="/">{t('trip.crumbHome')}</Link><span>/</span>
          <Link href="/activities">{t('trip.crumbCatalog')}</Link><span>/</span>
          <span className="here">{name}</span>
        </nav>

        <div className="detail-head">
          <div className="detail-head-left">
            {(tour.badge === 'top' || tour.badge === 'new') && (
              <span className={`badge badge-${tour.badge}`}>{t(tour.badge === 'top' ? 'trip.badgeTop' : 'trip.badgeNew')}</span>
            )}
            <h1>{name}</h1>
            <Stars avg={score.avg} count={score.count} size={16} />
          </div>
          {/* the separators belong to the parts that survive, or a trip with no
              region opens with a stray dot */}
          <div className="detail-head-right">
            {[view.region, view.season_text]
              .filter(filled)
              .map((part, i) => (
                <Fragment key={part}>
                  {i > 0 && <span className="dot">·</span>}
                  <span>{part}</span>
                </Fragment>
              ))}
          </div>
        </div>

        <div className="detail-top">
          <div className="gallery-col">
            <Gallery photos={tour.gallery} alt={name} />
            {credits.length > 0 && (
              <details className="photo-credits">
                <summary>{t('trip.photoCredits')}</summary>
                <ul>
                  {credits.map((c) => (
                    <li key={c.path}>
                      <a href={c.source} target="_blank" rel="noreferrer">{c.author}</a>, {t('trip.creditVia', { licence: c.licence })}
                    </li>
                  ))}
                </ul>
              </details>
            )}
            <TripPlace tour={tour} />
          </div>

          <aside className="booking-card">
            <div className="book-top">
              {bookable
                ? <div className={`book-status ${full ? 'full' : 'open'}`}>{full ? t('listing.fullyBooked') : t('listing.spotsOpen')}</div>
                : <div className="book-status unavailable">{t('trip.unavailable')}</div>}
              <FavoriteButton slug={tour.slug} />
            </div>

            {/* spot counts mean nothing on a trip that cannot be booked this season */}
            {bookable && (
              <div className="book-capacity">
                <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <circle cx="9" cy="8" r="3.2" /><path d="M2.5 19c0-3.4 2.9-5.5 6.5-5.5s6.5 2.1 6.5 5.5" />
                  <circle cx="17.5" cy="9" r="2.6" /><path d="M17.5 14c2.6 0 4 1.8 4 4" />
                </svg>
                <span>{full ? <em>{t('trip.noSpotsLeft')}</em> : tour.spots_left != null && <em>{t('trip.spotsLeft', { n: tour.spots_left })}</em>}</span>
              </div>
            )}

            <ul className="fact-list">
              {facts.map(([icon, label, value]) => (
                <li key={label}>
                  <Icon>{icon}</Icon>
                  <span className="fact-label">{label}</span>
                  <span className="fact-value">{value}</span>
                </li>
              ))}
              <li>
                <Icon>{ICONS.clock}</Icon>
                <span className="fact-label">{t('fact.price')}</span>
                <span className="fact-value">
                  {options.length > 1
                    ? t('trip.priceFromPer', { price: money(Math.min(...options.map((o) => o.price))) })
                    : t('trip.pricePer', { price: money(chosen ? chosen.price : tour.price) })}
                </span>
              </li>
            </ul>

            {options.length > 0 && (
              <div className="opt-cards" role="radiogroup" aria-label={t('trip.chooseOption')}>
                <span className="opt-title">{t('trip.chooseOption')}</span>
                {options.map((o, i) => (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={chosen === o}
                    key={o.name}
                    className={`opt-card${chosen === o ? ' on' : ''}`}
                    onClick={() => setOptIdx(i)}
                  >
                    <span className="opt-dot" aria-hidden="true" />
                    <span className="opt-body">
                      <span className="opt-top">
                        <strong>{o.name}</strong>
                        <span className="opt-price">{money(o.price)}</span>
                      </span>
                      {o.duration && <span className="opt-dur">{o.duration}</span>}
                      {o.note && <span className="opt-note">{o.note}</span>}
                    </span>
                  </button>
                ))}
                {showCompare && (
                  <button type="button" className="opt-more" onClick={learnMore}>{t('trip.learnMore')}</button>
                )}
              </div>
            )}

            {bookable ? (
              <button
                type="button"
                className={`book-btn${full ? ' secondary' : ''}`}
                // still checking the account: wait rather than wrongly asking them to sign in
                onClick={() => (profile ? setBooking(true) : profile === null && setGate('book'))}
              >
                {full ? t('listing.waitlist') : lesson ? t('trip.bookLesson') : isTimed(tour) ? t('trip.bookTime') : t('trip.bookSpot')}
              </button>
            ) : (
              <>
                <button type="button" className="book-btn book-btn-unavailable" disabled aria-disabled="true">{t('trip.unavailable')}</button>
                <p className="form-note">{t('trip.unavailableNote')}</p>
              </>
            )}
            <button type="button" className="book-btn secondary" onClick={() => openChat(tour)}>{t('detail.ask')}</button>
          </aside>
        </div>

        <section className="detail-block">
          <h2>{lesson ? t('trip.aboutLessons') : t('detail.about')}</h2>
          {/* typed in a textarea, so the line breaks in it are meant */}
          <p className="lead trip-summary">{view.summary}</p>

          {info.length > 0 && (
            <div className="info-grid">
              {info.map(([label, value]) => (
                <div className="info-item" key={label}>
                  <span className="info-label">{label}</span>
                  <span className="info-value">{value}</span>
                </div>
              ))}
            </div>
          )}

          {!lesson && view.itinerary?.length > 0 && (
            <>
              <h3>{t('detail.whereWeGo')}</h3>
              <ol className="itinerary">
                {view.itinerary.map(([title, text], i) => (
                  <li key={title}>
                    <span className="day">{t(itinMode === 'stops' ? 'trip.stopN' : 'trip.dayN', { n: i + 1 })}</span>
                    <div><strong>{title}</strong><p>{text}</p></div>
                  </li>
                ))}
              </ol>
            </>
          )}
        </section>

        {/* Deliberately its own block, above what the price covers: this is
            not about money but about whether they can come at all. */}
        {mustBring.length > 0 && (
          <section className="detail-block">
            <h2>{t('trip.mustBring')}</h2>
            <p className="lead">{t('trip.mustBringLead')}</p>
            <div className="must-grid">
              {mustBring.map((item) => (
                <div className="must-item" key={item.title}>
                  <span className="must-mark" aria-hidden="true">!</span>
                  <div>
                    <strong>{item.title}</strong>
                    {item.note && <span>{item.note}</span>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {(view.included.length > 0 || view.excluded.length > 0) && (
        <section className="detail-block">
          <h2>{t('detail.included')}</h2>
          <div className="included-grid">
            {view.included.map((x) => (
              <div className="inc-item yes" key={x.title}>
                <span className="mark">✓</span><div><strong>{x.title}</strong><span>{x.note}</span></div>
              </div>
            ))}
            {view.excluded.map((x) => (
              <div className="inc-item no" key={x.title}>
                <span className="mark">×</span><div><strong>{x.title}</strong><span>{x.note}</span></div>
              </div>
            ))}
          </div>
        </section>
        )}

        {showCompare && (
          <section className="detail-block" id="compare">
            <h2>{t('trip.compare')}</h2>
            <div className="cmp-wrap">
              <table className="cmp-table">
                <thead>
                  <tr>
                    <th aria-label={t('trip.feature')} />
                    {options.map((o, i) => (
                      <th key={o.name} className={chosen === o ? 'on' : ''}>
                        <button type="button" onClick={() => setOptIdx(i)}>
                          {o.name}
                          <span>{chosen === o ? t('trip.selected') : t('trip.select')}</span>
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {options.some((o) => o.duration) && (
                    <tr>
                      <th scope="row">{t('fact.duration')}</th>
                      {options.map((o) => <td key={o.name} className={chosen === o ? 'on' : ''}>{o.duration || '—'}</td>)}
                    </tr>
                  )}
                  {rows.map((r) => (
                    <tr key={r.feature}>
                      <th scope="row">{r.feature}</th>
                      {r.values.map((v, i) => {
                        const kind = cellKind(v);
                        return (
                          <td key={options[i].name} className={chosen === options[i] ? 'on' : ''}>
                            {kind === 'yes' ? <span className="cmp-yes">✓</span>
                              : kind === 'no' ? <span className="cmp-no">—</span>
                                : v}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  <tr className="cmp-price">
                    <th scope="row">{t('trip.pricePerPerson')}</th>
                    {options.map((o) => <td key={o.name} className={chosen === o ? 'on' : ''}>{money(o.price)}</td>)}
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className="detail-block reviews-block">
          <div className="reviews-head">
            <h2>{t('trip.reviews')}</h2>
            {/* rating needs an account, the same way booking does */}
            <button
              type="button"
              className="book-btn secondary rate-btn"
              onClick={() => (profile ? setRating(true) : profile === null && setGate('rate'))}
            >
              {t('trip.rateTrip')}
            </button>
          </div>

          <div className="reviews-score">
            <Stars avg={score.avg} count={score.count} size={22} />
          </div>

          {reviews.length === 0 ? (
            <p className="form-note">{t('trip.noReviews')}</p>
          ) : (
            <ul className="reviews-list">
              {reviews.map((r) => (
                <li className="review" key={r.id}>
                  <div className="review-top">
                    <strong>{r.author_name || t('reviews.traveller')}</strong>
                    <Stars avg={r.rating} count={1} size={14} showCount={false} />
                    <span className="review-date">
                      {new Intl.DateTimeFormat(DATE_LOCALE[lang] || 'en-GB', { dateStyle: 'medium' }).format(new Date(r.created_at))}
                    </span>
                  </div>
                  {r.recommend && <span className="review-rec">{t('trip.recommends')}</span>}
                  {r.body && <p className="review-body">{r.body}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      {booking && bookable && <BookingModal tour={tour} option={chosen} onClose={() => setBooking(false)} />}
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
