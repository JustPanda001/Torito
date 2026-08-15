'use client';

// "Any dates" button on the listing. Tourists pick the window they are in
// Georgia for and the listing narrows to trips whose season covers it.

import { useEffect, useRef, useState } from 'react';
import Calendar from './Calendar';
import { MONTHS_SHORT, sameDay } from '@/lib/season';

function label(from, to) {
  if (!from) return 'Any dates';
  const end = to || from;
  if (sameDay(from, end)) return `${from.getDate()} ${MONTHS_SHORT[from.getMonth()]}`;
  if (from.getMonth() === end.getMonth()) {
    return `${from.getDate()} – ${end.getDate()} ${MONTHS_SHORT[end.getMonth()]}`;
  }
  return `${from.getDate()} ${MONTHS_SHORT[from.getMonth()]} – ${end.getDate()} ${MONTHS_SHORT[end.getMonth()]}`;
}

export default function DateFilter({ from, to, onChange }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const away = (e) => { if (!wrap.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('click', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('click', away);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  // first click starts a range, second closes it; clicking before the current
  // start means the visitor is re-picking, so start over
  function pick(d) {
    if (!from || to || d < from) onChange({ from: d, to: null });
    else onChange({ from, to: d });
  }

  return (
    <div className="date-bar" ref={wrap}>
      <button
        type="button"
        className={`date-btn${from ? ' has-value' : ''}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
        <span>{label(from, to)}</span>
      </button>

      {open && (
        <Calendar value={from} rangeEnd={to} mode="range" onPick={pick}>
          <div className="cal-foot">
            <button type="button" className="cal-clear" onClick={() => onChange({ from: null, to: null })}>Clear</button>
            <button type="button" className="cal-done" onClick={() => setOpen(false)}>Done</button>
          </div>
        </Calendar>
      )}
    </div>
  );
}
