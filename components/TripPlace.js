'use client';

// The strip under the gallery: what the weather is doing there right now, and
// a small map of where "there" is. Both are summaries — a tap opens the detail,
// which is where the fortnight of forecast and the full-size map live, rather
// than spending the page's quietest space on them.

import { useEffect, useState } from 'react';
import { currentWeather, conditionOf } from '@/lib/weather';
import { useT } from '@/lib/i18n';
import { localizeTour } from '@/lib/trip-translations';
import StravaEmbed, { parseStrava } from './StravaEmbed';

const ICONS = {
  clear: <><circle cx="12" cy="12" r="4.2" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4" /></>,
  cloudy: <path d="M7 18h9.5a3.5 3.5 0 0 0 .3-7 5 5 0 0 0-9.6 1.2A3.4 3.4 0 0 0 7 18z" />,
  rain: <><path d="M7 15h9.5a3.5 3.5 0 0 0 .3-7 5 5 0 0 0-9.6 1.2A3.4 3.4 0 0 0 7 15z" /><path d="M9 18l-1 3M13 18l-1 3M17 18l-1 3" /></>,
  snow: <><path d="M7 15h9.5a3.5 3.5 0 0 0 .3-7 5 5 0 0 0-9.6 1.2A3.4 3.4 0 0 0 7 15z" /><path d="M9 19h.01M13 19h.01M17 19h.01M11 21h.01M15 21h.01" /></>,
  storm: <><path d="M7 15h9.5a3.5 3.5 0 0 0 .3-7 5 5 0 0 0-9.6 1.2A3.4 3.4 0 0 0 7 15z" /><path d="M13 17l-2.5 4h3L11 24" /></>,
};

const Icon = ({ kind, size = 24 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6">
    {ICONS[kind] ?? ICONS.cloudy}
  </svg>
);

const embedFor = (lat, lng, span) => {
  const bbox = [lng - span, lat - span / 2, lng + span, lat + span / 2].join(',');
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
};

const DATE_LOCALE = { en: 'en-GB', ka: 'ka-GE', ru: 'ru-RU', zh: 'zh-CN' };
// condition -> translation key
const COND_KEY = { clear: 'trip.wxClear', cloudy: 'trip.wxCloudy', rain: 'trip.wxRain', snow: 'trip.wxSnow', storm: 'trip.wxStorm' };

export default function TripPlace({ tour }) {
  const { t, lang } = useT();
  const view = localizeTour(tour, lang);
  const { lat, lng } = tour;
  // a published Strava route says far more than a pin: the line, and the
  // climbing, which is the question a hiker actually has
  const route = parseStrava(tour.strava);
  const [wx, setWx] = useState(undefined);
  const [open, setOpen] = useState(null);            // 'weather' | 'map' | null

  useEffect(() => {
    if (typeof lat !== 'number') { setWx(null); return undefined; }
    let alive = true;
    currentWeather(lat, lng)
      .then((d) => { if (alive) setWx(d); })
      .catch(() => { if (alive) setWx(null); });
    return () => { alive = false; };
  }, [lat, lng]);

  useEffect(() => {
    if (!open) return undefined;
    const esc = (e) => { if (e.key === 'Escape') setOpen(null); };
    document.addEventListener('keydown', esc);
    document.body.classList.add('modal-open');
    return () => {
      document.removeEventListener('keydown', esc);
      document.body.classList.remove('modal-open');
    };
  }, [open]);

  if (typeof lat !== 'number' || typeof lng !== 'number') return null;

  const now = wx?.now;
  const kind = now ? conditionOf(now.code) : 'cloudy';
  const dayFmt = new Intl.DateTimeFormat(DATE_LOCALE[lang] || 'en-GB', { day: 'numeric', month: 'short' });
  const title = view.full_title || view.title;

  return (
    <>
      <div className="place-row">
        <button type="button" className="place-tile wx-tile" onClick={() => setOpen('weather')}>
          <Icon kind={kind} size={30} />
          <span className="place-tile-main">
            <strong>{now ? `${now.temp}°` : '—'}</strong>
            <span>{now ? t(COND_KEY[kind]) : t('trip.wxWeather')}</span>
          </span>

          {now && (
            <span className="wx-facts">
              <span>{t('trip.wxHighLow', { high: now.high, low: now.low })}</span>
              {now.rainChance != null && <span>{t('trip.wxRainChance', { n: now.rainChance })}</span>}
              <span>{t('trip.wxWind', { n: now.wind })}</span>
            </span>
          )}

          <span className="place-tile-more">{t('trip.wxForecast')}</span>
        </button>

        <button type="button" className="place-tile map-tile" onClick={() => setOpen('map')}>
          {/* the thumbnail is decoration: the tile itself is the control, so the
              map must not eat the click that opens the bigger one */}
          <span className="map-thumb" aria-hidden="true">
            <iframe src={embedFor(lat, lng, 0.09)} title="" loading="lazy" tabIndex={-1} />
          </span>
          <span className="place-tile-main">
            <strong>{view.region || t('trip.onMap')}</strong>
            <span>{route ? t('trip.theRoute') : t('trip.whereStarts')}</span>
          </span>
          <span className="place-tile-more">{route ? t('trip.seeRoute') : t('trip.biggerMap')}</span>
        </button>
      </div>

      {open && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setOpen(null); }}>
          <div className={`booking-modal place-modal${open === 'map' ? ' map-modal' : ''}`} role="dialog" aria-modal="true">
            <div className="bm-head">
              <div>
                <h2>{open === 'map' ? (route ? t('trip.theRoute') : t('trip.whereItIs')) : t('trip.nextTwoWeeks')}</h2>
                <p className="bm-sub">{title}</p>
              </div>
              <button type="button" className="bm-close" aria-label={t('trip.close')} onClick={() => setOpen(null)}>×</button>
            </div>

            <div className="bm-body">
              {open === 'map' ? (
                <>
                  {route
                    ? <StravaEmbed className="strava-wrap" value={tour.strava} />
                    : <iframe className="map-big" src={embedFor(lat, lng, 0.25)} title={t('trip.mapOf', { name: view.title })} />}
                  <a
                    className="auth-link"
                    href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=12/${lat}/${lng}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t('trip.openOsm')}
                  </a>
                </>
              ) : (
                <ul className="wx-days">
                  {(wx?.days ?? []).map((d) => {
                    const when = new Date(`${d.date}T12:00:00`);
                    const k = conditionOf(d.code);
                    return (
                      <li key={d.date}>
                        <span className="wx-dow">
                          {dayFmt.format(when)}
                        </span>
                        <Icon kind={k} />
                        <span className="wx-temp"><strong>{d.max}°</strong> {d.min}°</span>
                        <span className="wx-cond">
                          {t(COND_KEY[k])}
                          {d.rainChance != null && d.rainChance > 0 && (
                            <em> · {d.rainChance}%</em>
                          )}
                        </span>
                      </li>
                    );
                  })}
                  {!wx && <li className="wx-note">{t('trip.wxChecking')}</li>}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
