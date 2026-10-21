'use client';

// One month grid, Monday-first. Used by both the listing date filter and the
// booking dialog — in the old static site these were two separate copies that
// could drift apart.
//
// It opens on the first day that can actually be picked (never on a month of
// grey days), keeps one day focusable for the arrow keys, and for a trip of
// several days (`span`) only lets a start be picked when every day of the trip
// is free. "Today" is the day in Tbilisi, whatever the visitor's device says.

import { useEffect, useRef, useState } from 'react';
import {
  addDays, fmtDate, iso, monthStart, monthTitle, pluralForm, tbilisiNow, weekdayNames,
} from '@/lib/season';
import { useT } from '@/lib/i18n';

// how far ahead to look for the first open day: a winter trip seen in May
// still finds December
const LOOK_AHEAD_DAYS = 760;

const sameMonth = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
const addMonths = (d, n) => {
  // 31 March + 1 month is 30 April, not 1 May
  const last = new Date(d.getFullYear(), d.getMonth() + n + 1, 0).getDate();
  return new Date(d.getFullYear(), d.getMonth() + n, Math.min(d.getDate(), last));
};

export default function Calendar({
  value,          // Date | null — single selection, or the range start
  rangeEnd,       // Date | null — end of the range, drawn as a band
  mode = 'single',
  span = 1,       // days one booking covers; a start needs all of them free
  onPick,
  isDisabled,     // (date) => boolean, on top of the past-dates rule
  openOn,         // Date | null — open here (or on the first open day after)
  autoFocus = false,
  className = '',
  children,       // optional footer, rendered inside the popover
}) {
  const { t, lang } = useT();
  const today = tbilisiNow().today;

  // why a single day cannot be used: gone, or closed for this trip
  const dayOff = (d) => (d < today ? 'past' : isDisabled?.(d) ? 'off' : null);
  // why a day cannot be picked as the start: itself, or a later day of the trip
  const startOff = (d) => {
    const own = dayOff(d);
    if (own) return own;
    for (let i = 1; i < span; i++) if (dayOff(addDays(d, i))) return 'range';
    return null;
  };

  const firstOpen = () => {
    const from = openOn && openOn > today ? openOn : today;
    for (let i = 0; i < LOOK_AHEAD_DAYS; i++) {
      const d = addDays(from, i);
      if (!startOff(d)) return d;
    }
    return from;
  };

  const [focus, setFocus] = useState(() => value ?? firstOpen());
  const [view, setView] = useState(() => monthStart(focus));
  const grid = useRef(null);
  // move real keyboard focus only on open (autoFocus) and on arrow keys, never
  // because availability finished loading under a visitor's finger
  const wantFocus = useRef(autoFocus);
  // once the visitor has looked around, stop jumping for them
  const touched = useRef(false);

  // Bookings arrive a moment after the dialog opens. If the day we opened on
  // turns out to be full, move on to the next open one — until the visitor
  // starts navigating themselves.
  useEffect(() => {
    if (touched.current || value) return;
    if (!startOff(focus)) return;
    const next = firstOpen();
    if (iso(next) === iso(focus)) return;
    // keep keyboard focus with the moving day if it was on the old one
    if (grid.current?.contains(document.activeElement)) wantFocus.current = true;
    setFocus(next);
    setView(monthStart(next));
  });

  useEffect(() => {
    if (!wantFocus.current) return;
    wantFocus.current = false;
    grid.current?.querySelector(`[data-day="${iso(focus)}"]`)?.focus({ preventScroll: true });
  }, [focus, view]);

  const y = view.getFullYear();
  const m = view.getMonth();
  const lead = (new Date(y, m, 1).getDay() + 6) % 7;   // Monday-first
  const days = new Date(y, m + 1, 0).getDate();
  const end = rangeEnd ?? value;
  const ranged = Boolean(value && end && iso(value) !== iso(end));
  const canGoBack = view > monthStart(today);

  const step = (n) => {
    touched.current = true;
    const next = new Date(y, m + n, 1);
    if (next < monthStart(today)) return;
    setView(next);
  };

  function choose(d) {
    touched.current = true;
    setFocus(d);
    if (startOff(d)) return;
    onPick?.(d);
  }

  function onKey(e) {
    const moves = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    const dow = (focus.getDay() + 6) % 7;
    let next = null;
    if (e.key in moves) next = addDays(focus, moves[e.key]);
    else if (e.key === 'PageUp') next = addMonths(focus, -1);
    else if (e.key === 'PageDown') next = addMonths(focus, 1);
    else if (e.key === 'Home') next = addDays(focus, -dow);
    else if (e.key === 'End') next = addDays(focus, 6 - dow);
    // Enter and Space are left to the focused button itself, which clicks
    if (!next) return;
    e.preventDefault();
    if (next < monthStart(today)) return;
    touched.current = true;
    wantFocus.current = true;
    setFocus(next);
    if (!sameMonth(next, view)) setView(monthStart(next));
  }

  // the one day Tab lands on: the focused day if it is on screen, otherwise
  // the first pickable day of the month shown, otherwise the 1st
  let tabDay = sameMonth(focus, view) ? iso(focus) : null;
  for (let n = 1; n <= days && !tabDay; n++) {
    if (!startOff(new Date(y, m, n))) tabDay = iso(new Date(y, m, n));
  }
  tabDay ||= iso(new Date(y, m, 1));

  const reasons = {
    past: t('cal.pastDay'),
    off: t('cal.unavailable'),
    range: t(`cal.rangeBlocked${pluralForm(lang, span)}`, { n: span }),
  };

  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(<span className="cal-pad" key={`pad${i}`} />);

  for (let n = 1; n <= days; n++) {
    const d = new Date(y, m, n);
    const key = iso(d);
    const why = startOff(d);
    const isToday = key === iso(today);
    const isStart = Boolean(value) && key === iso(value);
    const isEnd = Boolean(end) && key === iso(end);
    const inRange = Boolean(value && end) && d > value && d < end;

    const cls = ['cal-day'];
    if (why) cls.push('is-off', `is-${why}`);
    if (isToday) cls.push('is-today');
    if (isStart) cls.push('is-start');
    if (isEnd) cls.push('is-end');
    if (ranged && (isStart || isEnd)) cls.push('ranged');
    if (inRange) cls.push('in-range');

    const label = fmtDate(d, lang, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const note = why ? reasons[why] : isToday ? t('cal.today') : '';
    cells.push(
      <button
        type="button"
        key={key}
        data-day={key}
        className={cls.join(' ')}
        // aria-disabled rather than disabled: a greyed day still takes the
        // arrow-key focus and still shows why it is greyed when hovered
        aria-disabled={why ? 'true' : undefined}
        aria-pressed={isStart || isEnd || inRange ? 'true' : 'false'}
        aria-current={isToday ? 'date' : undefined}
        aria-label={note ? `${label} — ${note}` : label}
        title={note || undefined}
        tabIndex={key === tabDay ? 0 : -1}
        onClick={() => choose(d)}
      >
        {n}
      </button>,
    );
  }

  return (
    <div className={`cal-pop${mode === 'range' ? ' cal-range-mode' : ''} ${className}`.trim()}>
      <div className="cal-head">
        <button
          type="button"
          className="cal-nav"
          onClick={() => step(-1)}
          disabled={!canGoBack}
          aria-label={t('cal.prevMonth')}
        >
          ‹
        </button>
        <div className="cal-title" aria-live="polite">{monthTitle(view, lang)}</div>
        <button type="button" className="cal-nav" onClick={() => step(1)} aria-label={t('cal.nextMonth')}>›</button>
      </div>
      <div className="cal-dow" aria-hidden="true">{weekdayNames(lang).map((d, i) => <span key={i}>{d}</span>)}</div>
      <div className="cal-grid" ref={grid} onKeyDown={onKey} role="group" aria-label={monthTitle(view, lang)}>
        {cells}
      </div>
      {children}
    </div>
  );
}
