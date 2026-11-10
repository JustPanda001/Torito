'use client';

// Live preview beside the admin tour form: the listing card and the trip page
// as they will look, built from what is typed so far. The field being edited
// lights up here, so it is obvious where its text lands.
//
// It is the page's desktop layout drawn at a fixed width and zoomed to fit the
// column, so text wraps the way it will on the site. The compare table, map and
// reviews are left out. Nothing here is saved.

import { useEffect, useRef, useState } from 'react';
import TourCard from './TourCard';
import { fromRow } from '@/lib/tours-data';
import { money } from '@/lib/season';
import { isBookable } from '@/lib/bookable';
import { isLesson } from '@/lib/lessons';
import { tourOptions } from '@/lib/options';
import { requiredItems } from '@/lib/requiredItems';
import { itineraryMode } from '@/lib/itinerary';
import { filled } from '@/lib/filled';
import { useT } from '@/lib/i18n';
import { hourlyRates } from '@/lib/lessons';

const CANVAS_WIDTH = 1100;
const GAP = '…';

export default function AdminTripPreview({ row, focus }) {
  const { t } = useT();
  const panel = useRef(null);
  const [zoom, setZoom] = useState(0.5);

  useEffect(() => {
    const el = panel.current;
    if (!el) return undefined;
    const fit = () => setZoom(el.clientWidth / CANVAS_WIDTH);
    fit();
    const obs = new ResizeObserver(fit);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // scrolls the panel only, so the form being typed in stays where it is
  useEffect(() => {
    const el = panel.current;
    const hit = el?.querySelector('.pv-hit');
    if (!hit) return;
    const offset = hit.getBoundingClientRect().top - el.getBoundingClientRect().top;
    el.scrollTo({ top: el.scrollTop + offset - el.clientHeight / 3, behavior: 'smooth' });
  }, [focus]);

  const tour = fromRow(row);
  const lesson = isLesson(tour);
  const options = tourOptions(tour);
  const mustBring = requiredItems(tour);
  const itinMode = itineraryMode(tour);
  const name = tour.title || 'Trip title';
  const hit = (...names) => (names.includes(focus) ? ' pv-hit' : '');
  // a blank row disappears on the site, but stays while it is being filled in,
  // or there would be nothing to point at
  const shown = ([, , field, value]) => filled(value) || field === focus;

  const facts = (lesson ? [
    [t('trip.factLessonLength'), 'duration', 'duration', tour.duration_long],
    [t('fact.season'), 'season', 'season', tour.season_text],
    [t('fact.languages'), 'languages', 'languages', tour.languages],
  ] : [
    [t('fact.distance'), 'distance', 'distance', tour.distance],
    [t('fact.duration'), 'duration', 'duration', tour.duration_long],
    [t('fact.difficulty'), 'difficulty', 'difficulty', tour.difficulty],
    [t('fact.elevation'), 'elevation_gain', 'elevation_gain', tour.elevation_gain],
    [t('fact.season'), 'season', 'season', tour.season_text],
    [t('fact.languages'), 'languages', 'languages', tour.languages],
    [t('fact.stay'), 'stay', 'stay', tour.stay],
  ]).filter(shown);

  const info = (lesson ? [
    [t('trip.infoMeetingPoint'), '', 'departure_point', tour.info.departure_point],
    [t('trip.infoGroupSize'), '', 'group_size', tour.info.group_size],
  ] : [
    [t('trip.infoDeparturePoint'), '', 'departure_point', tour.info.departure_point],
    [t('trip.infoDepartureTime'), '', 'departure_time', tour.info.departure_time],
    [t('trip.infoReturn'), '', 'return_info', tour.info.return_info],
    [t('trip.infoTransport'), '', 'transport', tour.info.transport],
    [t('trip.infoGroupSize'), '', 'group_size', tour.info.group_size],
    [t('trip.infoWalking'), '', 'walking_per_day', tour.info.walking_per_day],
  ]).filter(shown);

  return (
    <aside className="admin-preview" aria-label="Preview">
      <div className="admin-preview-head">
        <strong>Preview</strong>
        <span className="field-hint">Updates as you type. The field you are in lights up.</span>
      </div>

      <div className="admin-preview-scroll" ref={panel}>
        <div className="admin-preview-canvas" style={{ width: CANVAS_WIDTH, zoom }}>
          <p className="admin-preview-label">On the activities list</p>
          <div className={`pv-card${hit('subtitle', 'title', 'badge', 'region')}`}>
            <TourCard tour={{ ...tour, title: name }} />
          </div>

          <p className="admin-preview-label">On the trip page</p>
          <div className="detail-head">
            <div className="detail-head-left">
              {(tour.badge === 'top' || tour.badge === 'new') && (
                <span className={`badge badge-${tour.badge}${hit('badge')}`}>
                  {t(tour.badge === 'top' ? 'trip.badgeTop' : 'trip.badgeNew')}
                </span>
              )}
              <h1 className={hit('title').trim()}>{name}</h1>
            </div>
            <div className="detail-head-right">
              <span className={hit('region').trim()}>{tour.region || (focus === 'region' ? GAP : '')}</span>
              {filled(tour.region) && filled(tour.season_text) && <span className="dot">·</span>}
              <span className={hit('season').trim()}>{tour.season_text}</span>
            </div>
          </div>

          <div className="detail-top">
            <div className="gallery-col">
              <img className="pv-cover" src={tour.cover_image || '/assets/hero.svg'} alt="" />
            </div>
            <div className="booking-card">
              <div className={`book-status ${isBookable(tour) ? 'open' : 'unavailable'}${hit('spots_left')}`}>
                {!isBookable(tour) ? t('trip.unavailable')
                  : tour.spots_left === 0 ? t('listing.fullyBooked') : t('listing.spotsOpen')}
              </div>
              <ul className="fact-list">
                {facts.map(([label, key, field, value]) => (
                  <li key={key} className={hit(field).trim()}>
                    <span className="fact-label">{label}</span>
                    <span className="fact-value">{filled(value) ? value : GAP}</span>
                  </li>
                ))}
                <li className={hit('price').trim()}>
                  <span className="fact-label">{t('fact.price')}</span>
                  <span className="fact-value">
                    {hourlyRates(tour)
                      ? t('trip.pricePerHour', { price: money(hourlyRates(tour)[0]) })
                      : options.length > 1
                      ? t('trip.priceFromPer', { price: money(Math.min(...options.map((o) => o.price))) })
                      : t('trip.pricePer', { price: money(options[0]?.price ?? tour.price) })}
                  </span>
                </li>
              </ul>
              {options.length > 0 && (
                <div className="opt-cards">
                  <span className="opt-title">{t('trip.chooseOption')}</span>
                  {options.map((o) => (
                    <div className="opt-card" key={o.name}>
                      <span className="opt-body">
                        <span className="opt-top">
                          <strong>{o.name}</strong>
                          <span className="opt-price">{money(o.price)}</span>
                        </span>
                        {o.duration && <span className="opt-dur">{o.duration}</span>}
                        {o.note && <span className="opt-note">{o.note}</span>}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <section className="detail-block">
            <h2>{lesson ? t('trip.aboutLessons') : t('detail.about')}</h2>
            <p className={`lead trip-summary${hit('summary')}`}>{tour.summary || GAP}</p>

            {info.length > 0 && (
              <div className="info-grid">
                {info.map(([label, , field, value]) => (
                  <div className={`info-item${hit(field)}`} key={field}>
                    <span className="info-label">{label}</span>
                    <span className="info-value">{filled(value) ? value : GAP}</span>
                  </div>
                ))}
              </div>
            )}

            {!lesson && tour.itinerary.length > 0 && (
              <>
                <h3>{t('detail.whereWeGo')}</h3>
                <ol className="itinerary">
                  {tour.itinerary.map(([title, text], i) => (
                    <li key={i}>
                      <span className="day">{t(itinMode === 'stops' ? 'trip.stopN' : 'trip.dayN', { n: i + 1 })}</span>
                      <div><strong>{title}</strong><p>{text}</p></div>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </section>

          {mustBring.length > 0 && (
            <section className="detail-block">
              <h2>{t('trip.mustBring')}</h2>
              <p className="lead">{t('trip.mustBringLead')}</p>
              <div className="must-grid">
                {mustBring.map((item, i) => (
                  <div className="must-item" key={i}>
                    <span className="must-mark" aria-hidden="true">!</span>
                    <div><strong>{item.title}</strong>{item.note && <span>{item.note}</span>}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {(tour.included.length > 0 || tour.excluded.length > 0) && (
            <section className="detail-block">
              <h2>{t('detail.included')}</h2>
              <div className="included-grid">
                {tour.included.map((x, i) => (
                  <div className="inc-item yes" key={i}>
                    <span className="mark">✓</span><div><strong>{x.title}</strong><span>{x.note}</span></div>
                  </div>
                ))}
                {tour.excluded.map((x, i) => (
                  <div className="inc-item no" key={i}>
                    <span className="mark">×</span><div><strong>{x.title}</strong><span>{x.note}</span></div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </aside>
  );
}
