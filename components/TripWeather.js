'use client';

// The weather panel on a trip page. Says plainly which of the two things it is
// showing — a forecast, or what the month is usually like — because a number
// presented as a forecast when it is an average is a promise we cannot keep.

import { useEffect, useState } from 'react';
import { tripWeather, conditionOf, CONDITIONS } from '@/lib/weather';
import { MONTHS, DOW } from '@/lib/season';

const ICONS = {
  clear: <><circle cx="12" cy="12" r="4.2" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4" /></>,
  cloudy: <path d="M7 18h9.5a3.5 3.5 0 0 0 .3-7 5 5 0 0 0-9.6 1.2A3.4 3.4 0 0 0 7 18z" />,
  rain: <><path d="M7 15h9.5a3.5 3.5 0 0 0 .3-7 5 5 0 0 0-9.6 1.2A3.4 3.4 0 0 0 7 15z" /><path d="M9 18l-1 3M13 18l-1 3M17 18l-1 3" /></>,
  snow: <><path d="M7 15h9.5a3.5 3.5 0 0 0 .3-7 5 5 0 0 0-9.6 1.2A3.4 3.4 0 0 0 7 15z" /><path d="M9 19h.01M13 19h.01M17 19h.01M11 21h.01M15 21h.01" /></>,
  storm: <><path d="M7 15h9.5a3.5 3.5 0 0 0 .3-7 5 5 0 0 0-9.6 1.2A3.4 3.4 0 0 0 7 15z" /><path d="M13 17l-2.5 4h3L11 24" /></>,
};

const Icon = ({ kind }) => (
  <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.6">
    {ICONS[kind] ?? ICONS.cloudy}
  </svg>
);

export default function TripWeather({ tour }) {
  const [data, setData] = useState(undefined);   // undefined = still asking

  useEffect(() => {
    let alive = true;
    const request = tripWeather(tour);
    if (!request) { setData(null); return undefined; }

    request
      .then((d) => { if (alive) setData(d); })
      .catch((err) => {
        console.warn(err.message);
        if (alive) setData(null);
      });
    return () => { alive = false; };
  }, [tour]);

  // no coordinates on the trip, or the service is unreachable: a weather panel
  // that cannot say anything is worse than no panel
  if (data === null) return null;

  return (
    <div className="wx">
      <h3>
        {data?.kind === 'typical'
          ? `Typical ${MONTHS[data.month - 1]} weather`
          : 'Next few days'}
      </h3>

      {data === undefined && <p className="wx-note">Checking the forecast…</p>}

      {data?.kind === 'forecast' && (
        <ul className="wx-days">
          {data.days.map((d) => {
            const when = new Date(`${d.date}T12:00:00`);
            const kind = conditionOf(d.code);
            return (
              <li key={d.date}>
                <span className="wx-dow">{DOW[(when.getDay() + 6) % 7]}</span>
                <Icon kind={kind} />
                <span className="wx-temp"><strong>{d.max}°</strong> {d.min}°</span>
                <span className="wx-cond">{CONDITIONS[kind].label}</span>
              </li>
            );
          })}
        </ul>
      )}

      {data?.kind === 'typical' && (
        <>
          <div className="wx-typical">
            <div><strong>{data.max}°</strong><span>average high</span></div>
            <div><strong>{data.min}°</strong><span>average low</span></div>
            {data.wetShare != null && (
              <div><strong>{data.wetShare}%</strong><span>of days wet</span></div>
            )}
          </div>
          <p className="wx-note">
            Averages from the last {data.years} years — the season is not open yet,
            so there is no forecast to give.
          </p>
        </>
      )}
    </div>
  );
}
