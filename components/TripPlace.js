'use client';

// The strip under the gallery: what the weather is doing there right now, and
// a small map of where "there" is. Both are summaries — a tap opens the detail,
// which is where the fortnight of forecast and the full-size map live, rather
// than spending the page's quietest space on them.

import { useEffect, useState } from 'react';
import { currentWeather, conditionOf, CONDITIONS } from '@/lib/weather';
import { MONTHS_SHORT } from '@/lib/season';

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

export default function TripPlace({ tour }) {
  const { lat, lng } = tour;
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

  return (
    <>
      <div className="place-row">
        <button type="button" className="place-tile wx-tile" onClick={() => setOpen('weather')}>
          <Icon kind={kind} size={30} />
          <span className="place-tile-main">
            <strong>{now ? `${now.temp}°` : '—'}</strong>
            <span>{now ? CONDITIONS[kind].label : 'Weather'}</span>
          </span>

          {now && (
            <span className="wx-facts">
              <span><b>{now.high}°</b> / {now.low}° today</span>
              {now.rainChance != null && <span>{now.rainChance}% rain</span>}
              <span>wind {now.wind} km/h</span>
            </span>
          )}

          <span className="place-tile-more">2-week forecast →</span>
        </button>

        <button type="button" className="place-tile map-tile" onClick={() => setOpen('map')}>
          {/* the thumbnail is decoration: the tile itself is the control, so the
              map must not eat the click that opens the bigger one */}
          <span className="map-thumb" aria-hidden="true">
            <iframe src={embedFor(lat, lng, 0.09)} title="" loading="lazy" tabIndex={-1} />
          </span>
          <span className="place-tile-main">
            <strong>{tour.region || 'On the map'}</strong>
            <span>Where it starts</span>
          </span>
          <span className="place-tile-more">Bigger map →</span>
        </button>
      </div>

      {open && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setOpen(null); }}>
          <div className={`booking-modal place-modal${open === 'map' ? ' map-modal' : ''}`} role="dialog" aria-modal="true">
            <div className="bm-head">
              <div>
                <h2>{open === 'map' ? 'Where it is' : 'Next two weeks'}</h2>
                <p className="bm-sub">{tour.full_title || tour.title}</p>
              </div>
              <button type="button" className="bm-close" aria-label="Close" onClick={() => setOpen(null)}>×</button>
            </div>

            <div className="bm-body">
              {open === 'map' ? (
                <>
                  <iframe className="map-big" src={embedFor(lat, lng, 0.25)} title={`Map of ${tour.title}`} />
                  <a
                    className="auth-link"
                    href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=12/${lat}/${lng}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open in OpenStreetMap →
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
                          {when.getDate()} {MONTHS_SHORT[when.getMonth()]}
                        </span>
                        <Icon kind={k} />
                        <span className="wx-temp"><strong>{d.max}°</strong> {d.min}°</span>
                        <span className="wx-cond">
                          {CONDITIONS[k].label}
                          {d.rainChance != null && d.rainChance > 0 && (
                            <em> · {d.rainChance}%</em>
                          )}
                        </span>
                      </li>
                    );
                  })}
                  {!wx && <li className="wx-note">Checking the forecast…</li>}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
