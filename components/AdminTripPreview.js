'use client';

// Live preview beside the admin tour form. It shows the part of the trip page
// that the field being edited lands in: focus "Booking questions" and it draws
// the booking window, focus "About this trip" and it draws that section, and so
// on. "Show all" draws every block stacked, the way the page reads.
//
// Each block is drawn at a fixed canvas width and zoomed to fit the (narrow)
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
import { bookingQuestions, numberBounds, initialAnswer } from '@/lib/bookingQuestions';
import { useT } from '@/lib/i18n';
import { hourlyRates } from '@/lib/lessons';

const CANVAS_WIDTH = 560;
const GAP = '…';

// which preview block a form field lands in
export const FIELD_BLOCK = {
  title: 'top', subtitle: 'top', badge: 'top', category: 'top', subtype: 'top', region: 'top', slug: 'top',
  price: 'facts', distance: 'facts', duration: 'facts', difficulty: 'facts', capacity: 'facts', slot_limit: 'facts',
  spots_left: 'facts', elevation_gain: 'facts', season: 'facts', season_from: 'facts', season_to: 'facts',
  stay: 'facts', languages: 'facts',
  departure_point: 'about', departure_time: 'about', return_info: 'about', transport: 'about',
  group_size: 'about', walking_per_day: 'about', summary: 'about',
  lat: 'map', lng: 'map', strava: 'map',
};

const BLOCKS = [
  ['top', 'Heading'],
  ['photos', 'Photos'],
  ['facts', 'Facts'],
  ['about', 'About'],
  ['bring', 'Bring'],
  ['included', 'Included'],
  ['booking', 'Booking'],
  ['map', 'Map'],
];

const BLOCK_TITLES = {
  top: 'On the activities list and the trip heading',
  photos: 'Photos',
  facts: 'The facts panel',
  about: 'About this trip',
  bring: 'What they must bring',
  included: 'What is included',
  booking: 'The booking window',
  map: 'On the map',
};

export default function AdminTripPreview({ row, focus, block }) {
  const { t } = useT();
  const panel = useRef(null);
  const [zoom, setZoom] = useState(0.7);
  const [showAll, setShowAll] = useState(false);
  const [manual, setManual] = useState(null);
  const [open, setOpen] = useState(true);

  // a phone or narrow window starts with the preview folded away
  useEffect(() => {
    if (window.innerWidth < 1100) setOpen(false);
  }, []);

  useEffect(() => {
    const el = panel.current;
    if (!el) return undefined;
    const fit = () => {
      if (el.clientWidth > 0) setZoom(Math.min(1.3, el.clientWidth / CANVAS_WIDTH));
    };
    fit();
    const obs = new ResizeObserver(fit);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // moving to a different field picks the block for it again
  useEffect(() => { setManual(null); }, [block]);

  const active = showAll ? null : (manual ?? block ?? null);
  const everything = showAll || !active;

  // scrolls the panel only, so the form being typed in stays where it is
  useEffect(() => {
    const el = panel.current;
    if (!el) return;
    const hit = el.querySelector('.pv-hit');
    if (!hit) { el.scrollTo({ top: 0 }); return; }
    const offset = hit.getBoundingClientRect().top - el.getBoundingClientRect().top;
    el.scrollTo({ top: el.scrollTop + offset - el.clientHeight / 3, behavior: 'smooth' });
  }, [focus, active, everything, open]);

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

  const questions = bookingQuestions({ booking_fields: row.booking_fields });
  const rawQuestions = Array.isArray(row.booking_fields) ? row.booking_fields.length : 0;
  const photoList = (Array.isArray(row.gallery) ? row.gallery : [])
    .map((p) => (typeof p === 'string' ? p : p?.url))
    .filter(Boolean);

  const empty = (text) => <p className="pv-empty">{text}</p>;

  const parts = {
    top: (
      <>
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
        <p className={`pv-url${hit('slug')}`}>/activities/{row.slug || 'preview'}</p>
      </>
    ),

    photos: (
      <>
        <img className="pv-cover" src={tour.cover_image || '/assets/hero.svg'} alt="" />
        {photoList.length > 1 && (
          <div className="pv-thumbs">
            {photoList.slice(0, 8).map((src, i) => <img key={`${src}-${i}`} src={src} alt="" />)}
          </div>
        )}
        {photoList.length === 0 && empty('No photos yet. The first one becomes the cover.')}
      </>
    ),

    facts: (
      <div className="pv-facts">
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
    ),

    about: (
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
    ),

    bring: (
      <section className="detail-block">
        <h2>{t('trip.mustBring')}</h2>
        {mustBring.length === 0 && empty('Nothing added. The section is not shown on the trip page.')}
        {mustBring.length > 0 && (
          <>
            <p className="lead">{t('trip.mustBringLead')}</p>
            <div className="must-grid">
              {mustBring.map((item, i) => (
                <div className="must-item" key={i}>
                  <span className="must-mark" aria-hidden="true">!</span>
                  <div><strong>{item.title}</strong>{item.note && <span>{item.note}</span>}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    ),

    included: (
      <section className="detail-block">
        <h2>{t('detail.included')}</h2>
        {tour.included.length === 0 && tour.excluded.length === 0 && empty('Nothing added yet.')}
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
    ),

    booking: (
      <div className="pv-book">
        <div className="pv-book-head">
          <strong>Book: {name}</strong>
          <span>Approximate. As the customer sees it.</span>
        </div>
        <div className="pv-book-fixed">
          <span>Pick a date</span>
          <span>How many people</span>
        </div>
        {questions.length === 0 && empty('No extra questions. The customer only picks a date and a headcount.')}
        {questions.map((q, i) => {
          const { lo, hi } = numberBounds(q);
          const limited = q.min != null || q.max != null;
          return (
            <div className="pv-q" key={`${q.label}-${i}`}>
              <div className="pv-q-label">
                {q.label}{q.required && <span className="pv-req" title="Required"> *</span>}
              </div>
              {q.hint && <div className={`pv-q-hint${q.hintStrong ? ' strong' : ''}`}>{q.hint}</div>}
              {q.type === 'choice' && (
                <div className="pv-chips">
                  {q.options.map((o) => <span className="pv-chip" key={o}>{o}</span>)}
                </div>
              )}
              {q.type === 'number' && (
                <div className="pv-counter-row">
                  <span className="pv-counter">
                    <span className="pv-step">−</span>
                    <strong>{initialAnswer(q)}</strong>
                    <span className="pv-step">+</span>
                  </span>
                  {q.unit && <span className="pv-unit">{q.unit}</span>}
                  {limited && (
                    <span className="pv-minmax">
                      {q.min != null && q.max != null ? `${lo} – ${hi}` : q.min != null ? `min ${lo}` : `max ${hi}`}
                    </span>
                  )}
                </div>
              )}
              {q.type === 'text' && <div className="pv-input">Type here</div>}
            </div>
          );
        })}
        {rawQuestions > questions.length && (
          <p className="pv-empty">
            {rawQuestions - questions.length} question(s) are not shown yet: they need a label, and a "pick one" needs choices.
          </p>
        )}
        <div className="pv-book-send">Send request</div>
      </div>
    ),

    map: (
      <div className="pv-map">
        <div className={`pv-map-line${hit('lat', 'lng')}`}>
          Pin: {filled(tour.lat) && filled(tour.lng) ? `${tour.lat}, ${tour.lng}` : GAP}
        </div>
        <div className={`pv-map-line${hit('strava')}`}>Strava: {row.strava || 'none'}</div>
        <p className="pv-empty">The trip page draws a small map and the weather tile from these.</p>
      </div>
    ),
  };

  return (
    <aside className={`admin-preview${open ? '' : ' folded'}`} aria-label="Preview">
      <div className="admin-preview-head">
        <strong>Preview</strong>
        <span className="admin-preview-btns">
          <button
            type="button"
            className={`chip small${everything ? ' active' : ''}`}
            onClick={() => { setShowAll((v) => !v); setManual(null); setOpen(true); }}
          >
            {showAll ? 'Focus on field' : 'Show all'}
          </button>
          <button type="button" className="chip small" onClick={() => setOpen((v) => !v)}>
            {open ? 'Hide' : 'Show'}
          </button>
        </span>
        {open && (
          <div className="pv-tabs" role="tablist" aria-label="Preview part">
            {BLOCKS.map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={!everything && active === id}
                className={`pv-tab${!everything && active === id ? ' on' : ''}`}
                onClick={() => { setShowAll(false); setManual(id); }}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        <span className="field-hint">
          {everything ? 'Every part, in page order.' : BLOCK_TITLES[active]}
        </span>
      </div>

      <div className="admin-preview-scroll" ref={panel}>
        <div className="admin-preview-canvas" style={{ width: CANVAS_WIDTH, zoom }}>
          {everything
            ? BLOCKS.map(([id]) => (
              <div className="pv-block" key={id}>
                <p className="admin-preview-label">{BLOCK_TITLES[id]}</p>
                {parts[id]}
              </div>
            ))
            : parts[active]}
        </div>
      </div>
    </aside>
  );
}
