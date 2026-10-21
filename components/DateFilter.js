'use client';

// "Any dates" button on the listing. Tourists pick the window they are in
// Georgia for and the listing narrows to trips whose season covers it.
//
// The calendar opens on the current month, unless a category is picked whose
// season starts later (winter, seen in October): then it opens on the first
// day of that season, so the visitor never lands on a month with nothing in it.

import { useEffect, useRef, useState } from 'react';
import Calendar from './Calendar';
import { addDays, inSeason, rangeText, tbilisiNow } from '@/lib/season';
import { categoryOf, isOffered } from '@/lib/catalog';
import { TOURS } from '@/lib/tours-data';
import { useT } from '@/lib/i18n';

/** The first day from today on which any trip in `category` is in season. */
function seasonStart(category, tours) {
  const today = tbilisiNow().today;
  if (!category || category === 'all') return today;
  const list = (tours ?? TOURS).filter((tr) => categoryOf(tr) === category && isOffered(tr));
  if (!list.length) return today;
  for (let i = 0; i < 400; i++) {
    const d = addDays(today, i);
    if (list.some((tr) => inSeason(tr, d))) return d;
  }
  return today;
}

export default function DateFilter({ from, to, onChange, category, tours }) {
  const { t, lang } = useT();
  const [open, setOpen] = useState(false);
  const [openOn, setOpenOn] = useState(null);
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

  function toggle() {
    if (!open) {
      // the listing passes its category; a page that does not falls back to
      // the ?cat= the visitor arrived with
      const cat = category ?? new URLSearchParams(window.location.search).get('cat');
      setOpenOn(seasonStart(cat, tours));
    }
    setOpen((v) => !v);
  }

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
        onClick={toggle}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
        <span>{from ? rangeText(from, to, lang) : t('listing.anyDates')}</span>
      </button>

      {open && (
        <Calendar value={from} rangeEnd={to} mode="range" onPick={pick} openOn={openOn} autoFocus>
          <div className="cal-foot">
            <button type="button" className="cal-clear" onClick={() => onChange({ from: null, to: null })}>{t('cal.clear')}</button>
            <button type="button" className="cal-done" onClick={() => setOpen(false)}>{t('cal.done')}</button>
          </div>
        </Calendar>
      )}
    </div>
  );
}
