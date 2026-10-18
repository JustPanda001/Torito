'use client';

// "Find a place" for the admin map section: type "gudauri", pick the
// suggestion, and the latitude and longitude fill themselves. The trip's map
// and weather tile read those two fields, so they follow automatically.
//
// Suggestions come from Photon (photon.komoot.io), a free OpenStreetMap search
// built for search-as-you-type. No key needed. Results inside Georgia are
// asked for first, so "gudauri" does not open on a hotel of the same name
// somewhere else.

import { useEffect, useRef, useState } from 'react';

// roughly Georgia: west, south, east, north
const GEORGIA = '39.9,41.0,46.8,43.7';

function labelOf(p) {
  const where = [p.city !== p.name ? p.city : null, p.county, p.state, p.country]
    .filter(Boolean)
    .filter((v, i, all) => all.indexOf(v) === i);
  return { name: p.name || p.street || 'Unnamed place', where: where.join(', ') };
}

export default function PlaceSearch({ onPick }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState(null);
  const wrap = useRef(null);

  // wait for a pause in typing before asking, so every letter is not a request
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setResults([]); return undefined; }

    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6&lang=en&bbox=${GEORGIA}`;
        const res = await fetch(url, { signal: ctrl.signal });
        const data = await res.json();
        // villages and towns first: for a service area the place matters, not
        // the hotel or bar that happens to share its name
        const rank = (f) => (f.properties.osm_key === 'place' ? 0 : 1);
        setResults((data.features ?? []).sort((a, b) => rank(a) - rank(b)));
        setOpen(true);
      } catch (err) {
        if (err.name !== 'AbortError') setResults([]);
      }
    }, 300);

    return () => { clearTimeout(timer); ctrl.abort(); };
  }, [query]);

  useEffect(() => {
    const away = (e) => { if (!wrap.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('click', away);
    return () => document.removeEventListener('click', away);
  }, []);

  function pick(f) {
    const [lng, lat] = f.geometry.coordinates;
    const { name, where } = labelOf(f.properties);
    onPick({ lat: Number(lat.toFixed(5)), lng: Number(lng.toFixed(5)), name });
    setPicked(`${name}${where ? `, ${where}` : ''}`);
    setQuery('');
    setResults([]);
    setOpen(false);
  }

  return (
    <div className="place-search" ref={wrap}>
      <label className="field">
        <span className="field-label">Find a place</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          onKeyDown={(e) => {
            // Enter picks the top suggestion instead of submitting the form
            if (e.key === 'Enter') { e.preventDefault(); if (results[0]) pick(results[0]); }
          }}
          placeholder="Search a village, resort or peak — e.g. Gudauri"
          autoComplete="off"
        />
        <span className="field-hint">
          {picked
            ? `Set to ${picked}. The map and weather on the trip page use this spot.`
            : 'Pick a suggestion and the latitude and longitude below fill themselves'}
        </span>
      </label>

      {open && results.length > 0 && (
        <ul className="place-results" role="listbox">
          {results.map((f) => {
            const { name, where } = labelOf(f.properties);
            return (
              <li key={`${f.properties.osm_type}${f.properties.osm_id}`}>
                <button type="button" onClick={() => pick(f)}>
                  <strong>{name}</strong>
                  {where && <span>{where}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
