'use client';

// A Strava route or activity, embedded with Strava's own widget.
//
// Their script scans the document for placeholder divs and replaces them, so it
// is loaded once and told to rescan whenever one of ours mounts. The widget
// draws the line on a map and the elevation profile under it, which is what a
// route is actually for — our own map only ever knew a single point.
//
// The route has to be public on Strava. A private one renders as an empty box,
// which is why the caller keeps the plain map as a fallback.

import { useEffect, useRef } from 'react';

const SCRIPT_SRC = 'https://strava-embeds.com/embed.js';

/**
 * Accepts what someone would actually paste: a full URL, or the bare id.
 * Returns the pieces the widget needs, or null if it is neither.
 */
export function parseStrava(value) {
  const text = String(value ?? '').trim();
  if (!text) return null;

  const url = text.match(/strava\.com\/(routes|activities)\/(\d+)/i);
  if (url) return { type: url[1] === 'routes' ? 'route' : 'activity', id: url[2] };

  // a bare number is far more likely to be a route than an activity, since a
  // route is the thing you would publish for a trip
  return /^\d+$/.test(text) ? { type: 'route', id: text } : null;
}

export default function StravaEmbed({ value, className }) {
  const holder = useRef(null);
  const parsed = parseStrava(value);

  useEffect(() => {
    if (!parsed) return;

    const rescan = () => {
      // the script exposes no API; re-running it is how it picks up new
      // placeholders added after the first load
      const s = document.createElement('script');
      s.src = SCRIPT_SRC;
      s.async = true;
      document.body.appendChild(s);
    };

    rescan();
  }, [parsed?.id, parsed?.type]);   // eslint-disable-line react-hooks/exhaustive-deps

  if (!parsed) return null;

  return (
    <div className={className} ref={holder}>
      <div
        className="strava-embed-placeholder"
        data-embed-type={parsed.type}
        data-embed-id={parsed.id}
        data-style="standard"
        data-map-hash="hybrid"
        data-from-embed="false"
      />
    </div>
  );
}
