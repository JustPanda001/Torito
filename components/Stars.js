'use client';

// Read-only star row.
//
// The average is shown to the tenth, and the filled row is clipped to the exact
// percentage rather than rounded — so 4.3 stars looks like 4.3 stars.

const STAR_PATH = 'M12 3.4l2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.8l6.1-.9z';

export function Star({ size = 15, filled = false }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    >
      <path d={STAR_PATH} />
    </svg>
  );
}

export default function Stars({ avg = 0, count = 0, size = 15, showCount = true }) {
  if (!count) {
    return (
      <span className="stars-wrap">
        <span className="stars" aria-hidden="true">
          <span className="stars-row">
            {[0, 1, 2, 3, 4].map((i) => <Star key={i} size={size} />)}
          </span>
        </span>
        <span className="stars-count">No ratings yet</span>
      </span>
    );
  }

  const pct = (Math.max(0, Math.min(5, avg)) / 5) * 100;
  const label = `${avg.toFixed(1)} out of 5 from ${count} ${count === 1 ? 'rating' : 'ratings'}`;

  return (
    <span className="stars-wrap" title={label}>
      <span className="stars" role="img" aria-label={label}>
        <span className="stars-row">
          {[0, 1, 2, 3, 4].map((i) => <Star key={i} size={size} />)}
        </span>
        {/* the filled row sits on top of the empty one and is clipped by width */}
        <span className="stars-fill" style={{ width: `${pct}%` }}>
          {[0, 1, 2, 3, 4].map((i) => <Star key={i} size={size} filled />)}
        </span>
      </span>
      <span className="stars-count">
        {avg.toFixed(1)}
        {showCount && <em> ({count})</em>}
      </span>
    </span>
  );
}
