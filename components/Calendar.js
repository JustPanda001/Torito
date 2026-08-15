'use client';

// One month grid, Monday-first. Used by both the listing date filter and the
// booking dialog — in the old static site these were two separate copies that
// could drift apart.

import { useState } from 'react';
import { MONTHS, DOW, iso, midnight } from '@/lib/season';

export default function Calendar({
  value,          // Date | null — single selection, or the range start
  rangeEnd,       // Date | null — only used when mode="range"
  mode = 'single',
  onPick,
  isDisabled,     // (date) => boolean, on top of the past-dates rule
  className = '',
  children,       // optional footer, rendered inside the popover
}) {
  const today = midnight(new Date());
  const [view, setView] = useState(() => {
    const from = value ?? today;
    return new Date(from.getFullYear(), from.getMonth(), 1);
  });

  const y = view.getFullYear();
  const m = view.getMonth();
  const lead = (new Date(y, m, 1).getDay() + 6) % 7;   // Monday-first
  const days = new Date(y, m + 1, 0).getDate();
  const end = rangeEnd ?? value;
  const ranged = mode === 'range' && value && end && iso(value) !== iso(end);

  const step = (n) => setView(new Date(y, m + n, 1));

  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(<span className="cal-pad" key={`pad${i}`} />);

  for (let n = 1; n <= days; n++) {
    const d = new Date(y, m, n);
    const past = d < today;
    const off = past || Boolean(isDisabled?.(d));

    const cls = ['cal-day'];
    if (off) cls.push('is-past');
    if (!past && iso(d) === iso(today)) cls.push('is-today');
    if (value && iso(d) === iso(value)) cls.push('is-start');
    if (end && iso(d) === iso(end)) cls.push('is-end');
    if (ranged && (iso(d) === iso(value) || iso(d) === iso(end))) cls.push('ranged');
    if (value && end && d > value && d < end) cls.push('in-range');

    cells.push(
      <button
        type="button"
        key={iso(d)}
        className={cls.join(' ')}
        disabled={off}
        onClick={() => onPick?.(d)}
      >
        {n}
      </button>,
    );
  }

  return (
    <div className={`cal-pop ${className}`.trim()}>
      <div className="cal-head">
        <button type="button" className="cal-nav" onClick={() => step(-1)} aria-label="Previous month">‹</button>
        <div className="cal-title">{MONTHS[m]} {y}</div>
        <button type="button" className="cal-nav" onClick={() => step(1)} aria-label="Next month">›</button>
      </div>
      <div className="cal-dow">{DOW.map((d, i) => <span key={i}>{d}</span>)}</div>
      <div className="cal-grid">{cells}</div>
      {children}
    </div>
  );
}
