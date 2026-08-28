'use client';

// Where the trip is, on an OpenStreetMap embed.
//
// An iframe rather than a mapping library: it needs no key, no billing account
// and no dependency, and for "show me where this is" a static pinned map is
// the whole job. A drawn route needs a real map library, and can replace this
// when there are routes to draw.

export default function TripMap({ tour }) {
  const { lat, lng } = tour;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;

  // roughly a 40km box around the point, which suits a trailhead or a resort
  const d = 0.2;
  const bbox = [lng - d, lat - d / 2, lng + d, lat + d / 2].join(',');
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;

  return (
    <div className="trip-map">
      <h3>Where it is</h3>
      <iframe src={src} title={`Map of ${tour.full_title || tour.title}`} loading="lazy" />
      <a
        className="auth-link"
        href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=11/${lat}/${lng}`}
        target="_blank"
        rel="noreferrer"
      >
        Open the bigger map →
      </a>
    </div>
  );
}
