'use client';

// The "Book a spot" dialog: pick a date, pick how many people, see the price.
//
// Dates outside the trip's season are not selectable — it uses the same
// inSeason() the listing filter does, so the two can never disagree. A trip of
// several days books a run of days: tapping the start selects them all, and a
// start whose run would cross a closed day cannot be picked.

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Calendar from './Calendar';
import {
  addDays, fmtDate, inSeason, iso, money, pluralForm, rangeText, tripDays,
} from '@/lib/season';
import {
  isLesson, isTimed, timeQuestion, slotTimeState, defaultTimeQuestion, SKILL_LEVELS, LESSON_TYPES,
  hourlyRates, lessonHours, isHoursQuestion, isPeopleQuestion,
  lessonDays, isDaysQuestion, DAYS_ANSWER,
} from '@/lib/lessons';
import { useAvailability } from '@/lib/availability';
import { supabase, currentProfile } from '@/lib/supabaseClient';
import { DEFAULT_DIAL, phoneDigits } from '@/lib/dial-codes';
import DialSelect from './DialSelect';
import { answersComplete, bookingQuestions, initialAnswer, numberBounds, packAnswers } from '@/lib/bookingQuestions';
import { requiredItems } from '@/lib/requiredItems';
import { isBookable } from '@/lib/bookable';
import { bookingTitle, bookingTotal, hourlyRate, unitPrice } from '@/lib/pricing';
import { packageSteps, packageAnswers } from '@/lib/packageBuilder';
import { groupMax } from '@/lib/groups';
import '@/app/styles/lesson-pricing.css';
import { useT } from '@/lib/i18n';
import { refreshBadges } from '@/lib/badges';

// little burst of colour around the success tick
const CONFETTI = Array.from({ length: 14 }, (_, i) => {
  const a = (i / 14) * Math.PI * 2;
  return [Math.round(Math.cos(a) * (70 + (i % 3) * 20)), Math.round(Math.sin(a) * (50 + (i % 2) * 20)),
    ['#5fd0b2', '#e0b04a', '#e0607a', '#8fa8ff', '#2e7d6e'][i % 5]];
});

// counts the total up from 0 once, after the summary rows have slid in
function CountUp({ value, format }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setShown(value); return undefined; }
    let raf; let t0;
    const timer = setTimeout(() => {
      const step = (t) => {
        t0 ??= t;
        const p = Math.min(1, (t - t0) / 600);
        setShown(Math.round(value * (1 - (1 - p) ** 3)));
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }, 900);
    return () => { clearTimeout(timer); cancelAnimationFrame(raf); };
  }, [value]);
  return format(shown);
}
import { localizeTour } from '@/lib/trip-translations';

// the stored values stay English (the team reads them); only the buttons are
// translated
const LEVEL_KEYS = {
  Beginner: 'booking.levelBeginner',
  Intermediate: 'booking.levelIntermediate',
  Advanced: 'booking.levelAdvanced',
};
const KIND_KEYS = {
  'Beginner lesson': 'booking.kindBeginner',
  Freestyle: 'booking.kindFreestyle',
  Freeride: 'booking.kindFreeride',
};
// the time question's built-in label; one the admin typed is shown as typed
const DEFAULT_TIME_LABEL = defaultTimeQuestion().label;

// The bookings API has no end-date column, so a multi-day request carries its
// last day in the answers map, which is stored and shown to the team.
const END_DATE_ANSWER = 'End date';

function ContactFields({ profile, phone, setPhone, dial, setDial }) {
  const { t } = useT();
  return (
    <div className="bm-who">
      <p className="bm-who-line">
        <strong>{profile?.full_name || t('booking.yourAccount')}</strong>
        <span>{profile?.email}</span>
        {profile?.phone && <span>{profile.phone}</span>}
      </p>

      {!profile?.phone && (
        <div className="field">
          <span className="field-label">{t('booking.phone')} *</span>
          <div className="bm-phone">
            {/* the code is a separate control so the number itself stays clean:
                a pasted "+995 599…" and a typed "599…" end up identical */}
            <DialSelect value={dial} onChange={setDial} />
            <input
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="599 12 34 56"
              aria-label={t('booking.phoneNumber')}
            />
          </div>
          <span className="field-hint">{t('booking.noPhoneYet')}</span>
        </div>
      )}
    </div>
  );
}

// What happens next, after the request is in. Only says an email went out when
// the route says it did — email is optional, and promising one that never
// arrives is worse than not mentioning it.
function Receipt({ receipt, email }) {
  const { t } = useT();
  let text = t('booking.willEmail');
  if (receipt?.emailed && email) {
    text = receipt.ref
      ? t('booking.emailedRef', { email, ref: receipt.ref })
      : t('booking.emailed', { email });
  }
  return (
    <>
      <p className="bm-hint">{text}</p>
      <Link className="book-btn secondary" href="/bookings">{t('booking.seeMine')}</Link>
    </>
  );
}

// option: the version picked on the trip page, if the service has several
// pkg: the build-your-own plan picked on the trip page, { stepTitle: optionName }
export default function BookingModal({ tour, option = null, pkg = null, onClose }) {
  const planLines = Object.entries(packageAnswers(packageSteps(tour) ?? [], pkg));
  const { t, lang } = useT();
  // trip text in the visitor's language, for display only — the slug, price
  // and the title sent to the team come from `tour`
  const view = useMemo(() => localizeTour(tour, lang), [tour, lang]);
  const tripName = view.full_title || view.title;

  const price = unitPrice(tour, option);
  // one booking is one group: at most the group size, or the spots left if fewer
  const seats = Math.min(tour.spots_left ?? Infinity, groupMax(tour));
  const full = seats === 0;

  const lesson = isLesson(tour);
  // lessons, snowmobile and paragliding are booked as an hour on a day
  const timed = isTimed(tour);
  // a lesson can run over several days in a row (admin "How many days?")
  const daySpan = useMemo(() => lessonDays(tour), [tour]);
  const [days, setDays] = useState(daySpan.min);
  // how many days one booking covers: a 3-day trip books three in a row; a
  // lesson covers as many days as the visitor picks
  const span = timed ? (lesson ? days : 1) : tripDays(tour);
  const avail = useAvailability(tour);
  const [date, setDate] = useState(null);
  const endDate = date && span > 1 ? addDays(date, span - 1) : null;
  const [people, setPeople] = useState(1);
  // a lesson with a rate table is priced per hour by group size, and the
  // visitor picks how many hours; null for everything else
  const rates = useMemo(() => hourlyRates(tour), [tour]);
  // the hours this lesson can be booked for, from its admin hours question
  const hourSpan = useMemo(() => lessonHours(tour), [tour]);
  const [hours, setHours] = useState(hourSpan.min);
  // the "longer lesson = earlier start" tip: shown 1 s after the visitor stops
  // adding hours, for TIP_MS, then fades; "Don't show again" is remembered
  const [tip, setTip] = useState(null);       // { text } while showing
  const [tipOut, setTipOut] = useState(false); // fading out
  const tipTimers = useRef([]);
  const clearTipTimers = () => { tipTimers.current.forEach(clearTimeout); tipTimers.current = []; };
  useEffect(() => clearTipTimers, []);
  // lesson requests only: when, and what they want out of it
  const [time, setTime] = useState('');
  const [level, setLevel] = useState('');
  const [kind, setKind] = useState('');
  // we have to be able to answer the person, and most visitors are not signed in
  const [profile, setProfile] = useState(null);
  const [profileReady, setProfileReady] = useState(false);
  const [phone, setPhone] = useState('');
  const [dial, setDial] = useState(DEFAULT_DIAL);
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(null);
  const [done, setDone] = useState(false);
  const [waitlisted, setWaitlisted] = useState(false);
  // what the route sent back: the reference, and whether the email went out
  const [receipt, setReceipt] = useState(null);

  // the trip's own questions, written in the admin panel
  const allQuestions = useMemo(() => bookingQuestions(tour), [tour]);
  // the time question is drawn as the time picker, not with the others
  const timeQ = useMemo(() => timeQuestion(tour, allQuestions), [tour, allQuestions]);
  // A lesson with hourly prices already has its own hours counter (it sets the
  // price), so an admin "How many hours?" number question would be a second,
  // unpriced copy of it: leave that one out.
  // A lesson's hours and people counters are drawn as the built-in counters
  // (they set the price), worded by these admin questions; they are not
  // drawn a second time with the others.
  const hoursQ = rates ? allQuestions.find(isHoursQuestion) ?? null : null;
  const peopleQ = lesson ? allQuestions.find(isPeopleQuestion) ?? null : null;
  // drawn as the built-in days counter (it sets the price and the date range)
  const daysQ = lesson ? allQuestions.find(isDaysQuestion) ?? null : null;
  const questions = useMemo(
    () => allQuestions.filter((q) => (!timeQ || q.label !== timeQ.label) && q !== hoursQ && q !== peopleQ && q !== daysQ),
    [allQuestions, timeQ, hoursQ, peopleQ, daysQ],
  );
  // The older built-in lesson questions (level, kind of lesson) only show on a
  // lesson whose admin wrote no questions of its own; once it has any, the
  // admin's list is the whole list.
  const builtInLessonQs = lesson && allQuestions.length === 0;
  const [answers, setAnswers] = useState(() => Object.fromEntries(
    bookingQuestions(tour).map((q) => [q.label, initialAnswer(q)]),
  ));
  const setAnswer = (label, value) => setAnswers((prev) => ({ ...prev, [label]: value }));
  const questionsOk = answersComplete(questions, answers);

  // kit they have to bring themselves. Every line has to be ticked: someone
  // who turns up without a sleeping bag cannot be taken along, so this is a
  // hard gate rather than a note they can scroll past.
  const mustBring = useMemo(() => requiredItems(tour), [tour]);
  const [confirmed, setConfirmed] = useState(() => new Set());
  const toggleItem = (title) => setConfirmed((prev) => {
    const next = new Set(prev);
    if (next.has(title)) next.delete(title); else next.add(title);
    return next;
  });
  const kitOk = mustBring.every((item) => confirmed.has(item.title));

  // booking is gated behind an account, so this is where the name, email and
  // phone come from — nobody types them a second time
  useEffect(() => {
    let alive = true;
    currentProfile()
      .then((p) => { if (alive) setProfile(p); })
      .catch(() => {})
      // "no phone yet" and "we have not asked yet" look identical until this
      // resolves, and the difference decides whether a whole section renders
      .finally(() => { if (alive) setProfileReady(true); });
    return () => { alive = false; };
  }, []);

  // A dialog left open past a slot's start (or into its lead time) must not
  // still offer it: re-check the clock every minute and drop a stale pick.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!timeQ) return undefined;
    const id = setInterval(() => setTick((n) => n + 1), 60000);
    return () => clearInterval(id);
  }, [timeQ]);
  useEffect(() => {
    if (time && date && slotTimeState(date, time)) setTime('');
  });

  // six is the shortest national number in use anywhere; anything under that
  // is a slip rather than a number we could ring back
  const savedPhone = profile?.phone ?? '';
  // Booking is gated behind an account, so the name and email are already
  // known and echoing them back is just chrome. The block earns its place only
  // when the account has no phone on it — then it is a real input, and the
  // number is written back to the profile so it is asked exactly once.
  const needsContact = profileReady && !savedPhone;
  const phoneOk = savedPhone
    ? true
    : phoneDigits(phone).length >= 6;

  // the server's own wording is English; in another language say it ourselves
  const serverText = async (res, key) => {
    const msg = (await res.json().catch(() => ({}))).error;
    return lang === 'en' && msg ? msg : t(key);
  };

  async function submit(requestKind) {
    setSending(true);
    setFailed(null);
    try {
      // the route ties the request to this account and emails its address
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setFailed(t('booking.signedOut'));
        return;
      }
      const packed = requestKind === 'waitlist' ? null : packAnswers(questions, answers);
      // the last day of a multi-day trip rides along with the answers
      if (packed && endDate) packed[END_DATE_ANSWER] = iso(endDate);
      if (packed && daysQ) packed[DAYS_ANSWER] = String(days);
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          tour_slug: tour.slug,
          tour_title: bookingTitle(tour, option),
          // the server prices the booking from this option's price in the database
          option: option?.name ?? null,
          // option names only; the server prices them from the trip's own list
          package: requestKind === 'waitlist' ? null : pkg,
          kind: requestKind,
          // a plain YYYY-MM-DD, built locally: toISOString() would shift the
          // date backwards for anyone east of UTC, which is everyone here
          wanted_date: date ? iso(date) : null,
          people,
          // the server checks these and works the price out again itself
          hours: rates ? hours : null,
          days: daysQ ? days : null,
          total: requestKind === 'waitlist' ? null : total,
          lesson_time: timeQ ? time : null,
          skill_level: builtInLessonQs ? level : null,
          lesson_type: builtInLessonQs ? kind : null,
          // the trip's own questions; a waitlist request is only a phone
          // number, so it carries none of them
          answers: packed,
          // a record that they were shown the kit list and ticked it
          confirmed_items: requestKind === 'waitlist' ? null : mustBring.map((i) => i.title),
          name: profile?.full_name ?? null,
          email: profile?.email ?? null,
          phone: savedPhone || `${dial} ${phone.trim()}`,
        }),
      });
      if (res.status === 409) {
        // someone else got there first: show it as taken and let them repick
        await avail.refresh();
        setTime('');
        setFailed(await serverText(res, 'booking.justBooked'));
        return;
      }
      if (res.status === 429 || res.status === 400) {
        // the server says why (too many open requests, a bad date, ...)
        setFailed(await serverText(res, 'booking.failed'));
        return;
      }
      if (res.status === 401) {
        setFailed(await serverText(res, 'booking.signInAgain'));
        return;
      }
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Request failed');
      setReceipt(await res.json().catch(() => ({})));
      avail.refresh();

      // an account made before sign-up asked for a phone keeps the one given
      // here, so it is asked for exactly once rather than on every booking
      if (!savedPhone && profile?.id) {
        const { error: saveError } = await supabase
          .from('profiles')
          .update({ phone: `${dial} ${phone.trim()}` })
          .eq('id', profile.id);
        if (saveError) console.warn('Could not save phone to profile:', saveError.message);
      }
      if (requestKind === 'waitlist') setWaitlisted(true); else setDone(true);
      // light up "!" on My bookings straight away instead of at the next poll
      refreshBadges();
    } catch (err) {
      setFailed(t('booking.failed'));
      console.warn('Booking request failed:', err.message);
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', esc);
    document.body.classList.add('modal-open');
    return () => {
      document.removeEventListener('keydown', esc);
      document.body.classList.remove('modal-open');
    };
  }, [onClose]);

  // a trip that cannot be booked this season never gets a dialog, even if
  // something else (a ?book=1 link, a stale button) tries to open one
  const blocked = !isBookable(tour);
  useEffect(() => { if (blocked) onClose(); }, [blocked, onClose]);

  const total = bookingTotal(tour, option, people, rates ? hours : null, pkg, daysQ ? days : 1);
  // places still open on the chosen departure, once other bookings count
  const daySeats = seats;
  // a rate table covers groups up to its size (4), never more
  const groupTop = rates ? Math.min(rates.length, peopleQ?.max ?? rates.length) : null;
  const maxPeople = rates
    ? Math.min(groupTop, Number.isFinite(daySeats) && daySeats > 0 ? daySeats : groupTop)
    : daySeats;
  const step = (n) => setPeople((p) => Math.min(maxPeople, Math.max(1, p + n)));
  const stepHours = (n) => {
    const next = Math.min(hourSpan.max, Math.max(hourSpan.min, hours + n));
    setHours(next);
    // a longer lesson may now meet a full hour or run past closing
    if (time && (avail.tooLong(time, next) || avail.timeTaken(date, time, next, lessonDaysN))) setTime('');
    // more hours rule out the late start times: explain it, once they stop clicking
    if (n > 0 && timeQ?.options?.some((slot) => avail.tooLong(slot, next) && !avail.tooLong(slot, hours))) {
      scheduleTip(next);
    }
  };
  function scheduleTip(h) {
    let off = false;
    try { off = localStorage.getItem('mtani-tip-start-time') === 'off'; } catch { /* private mode */ }
    if (off) return;
    clearTipTimers();
    setTip(null); setTipOut(false);
    const times = (timeQ?.options ?? []).filter((slot) => !avail.tooLong(slot, h));
    const last = times[times.length - 1];
    const close = closingTime(timeQ?.options);
    const text = last
      ? `A ${h}-hour lesson has to end by ${close}, so the latest start is ${last}. Add hours and the late times close.`
      : `A ${h}-hour lesson would run past ${close}. Pick fewer hours.`;
    // appears 1 s after the last click and stays until the visitor closes it
    tipTimers.current = [setTimeout(() => setTip({ text }), 1000)];
  }
  function closeTip() {
    clearTipTimers();
    setTipOut(true);
    tipTimers.current = [setTimeout(() => { setTip(null); setTipOut(false); }, 450)];
  }
  function hideTipForever() {
    try { localStorage.setItem('mtani-tip-start-time', 'off'); } catch { /* private mode */ }
    clearTipTimers();
    setTipOut(true);
    tipTimers.current = [setTimeout(() => { setTip(null); setTipOut(false); }, 450)];
  }
  const stepDays = (n) => {
    const next = Math.min(daySpan.max, Math.max(daySpan.min, days + n));
    setDays(next);
    // more days may now run into a day that is already taken at that time
    if (time && date && avail.timeTaken(date, time, lessonSpan, next)) setTime('');
    if (date && avail.dayFull(date, timed, lessonSpan, next)) { setDate(null); setTime(''); }
  };
  const rate = rates ? hourlyRate(tour, people) : null;

  // a lesson holds every hour it covers, so its length counts too
  const lessonSpan = rates ? hours : 1;
  // and every day of a multi-day lesson has to be free at that time
  const lessonDaysN = daysQ ? days : 1;
  // why a time cannot be picked on the chosen day, or null when it can
  const slotWhy = (slot) => {
    if (avail.tooLong(slot, lessonSpan)) return t('booking.runsPastClose');
    if (avail.timeTaken(date, slot, lessonSpan, lessonDaysN)) return t('booking.alreadyBooked');
    const state = slotTimeState(date, slot);
    if (state === 'passed') return t('booking.timePassed');
    if (state === 'soon') return t('booking.tooSoon');
    return null;
  };

  function pickDate(d) {
    setDate(d);
    if (time && (avail.timeTaken(d, time, lessonSpan, lessonDaysN) || avail.tooLong(time, lessonSpan) || slotTimeState(d, time))) setTime('');
  }

  if (blocked) return null;

  const form = pluralForm(lang, span);
  const daysText = t(`cal.days${form}`, { n: span });
  const longDate = (d) => fmtDate(d, lang, { day: 'numeric', month: 'long', year: 'numeric' });
  const placesWord = t(`booking.placeWord${pluralForm(lang, people)}`);
  const peopleWord = t(`booking.peopleWord${pluralForm(lang, people)}`);
  const hoursWord = t(`booking.hoursWord${pluralForm(lang, hours)}`);
  const timeLabel = timeQ && timeQ.label === DEFAULT_TIME_LABEL ? t('booking.whatTime') : timeQ?.label;

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="booking-modal" role="dialog" aria-modal="true" aria-labelledby="bmTitle">

        <div className="bm-head">
          <div>
            <h2 id="bmTitle">
              {full ? t('booking.waitlistTitle')
                : lesson ? t('booking.titleLesson')
                  : timed ? t('booking.titleTime') : t('booking.title')}
            </h2>
            <p className="bm-sub">{tripName}{option && <> · <strong>{option.name}</strong></>}</p>
            {planLines.length > 0 && (
              <p className="bm-sub bm-plan">{planLines.map(([, v]) => v).join(' · ')}</p>
            )}
          </div>
          <button type="button" className="bm-close" aria-label={t('booking.close')} onClick={onClose}>×</button>
        </div>

        <div className="bm-body">
          {full ? (
            waitlisted ? (
              <>
                <p className="bm-note ok">{t('booking.onWaitlist')}</p>
                <Receipt receipt={receipt} email={profile?.email} />
              </>
            ) : (
              <>
                <p className="bm-note">{t('booking.fullNote')}</p>
                {needsContact && (
                  <ContactFields
                    profile={profile}
                    phone={phone} setPhone={setPhone}
                    dial={dial} setDial={setDial}
                  />
                )}
                <button
                  type="button"
                  className="book-btn"
                  disabled={sending || !phoneOk}
                  onClick={() => submit('waitlist')}
                >
                  {sending ? t('booking.sending')
                    : !profileReady ? t('booking.checkingAccount')
                      : !phoneOk ? t('booking.addPhone') : t('listing.waitlist')}
                </button>
                {failed && <p className="bm-note error" role="alert">{failed}</p>}
              </>
            )
          ) : done ? (
            <>
              <div className="bm-success" aria-hidden="true">
                <span className="bm-check">
                  <svg viewBox="0 0 40 40"><path d="M9 21 l7 7 l15 -16" /></svg>
                </span>
                {CONFETTI.map(([x, y, c], i) => (
                  <i key={i} className="bm-confetti" style={{ '--x': `${x}px`, '--y': `${y}px`, background: c }} />
                ))}
              </div>
              <p className="bm-note ok bm-pop">{t('booking.requestSent')}</p>
              <div className="bm-summary bm-stagger">
                {receipt?.ref && <div className="bm-line"><span>{t('booking.reference')}</span><span>{receipt.ref}</span></div>}
                <div className="bm-line"><span>{t('booking.trip')}</span><span>{tripName}</span></div>
                {endDate ? (
                  <div className="bm-line">
                    <span>{t('booking.dates')}</span>
                    <span>{longDate(date)} – {longDate(endDate)} · {daysText}</span>
                  </div>
                ) : (
                  <div className="bm-line"><span>{t('booking.date')}</span><span>{longDate(date)}</span></div>
                )}
                {timeQ && <div className="bm-line"><span>{t('booking.time')}</span><span>{time}</span></div>}
                <div className="bm-line"><span>{t('booking.peopleLabel')}</span><span>{people}</span></div>
                {rates && <div className="bm-line"><span>{t('booking.hoursLabel')}</span><span>{hours}</span></div>}
                {builtInLessonQs && <div className="bm-line"><span>{t('booking.level')}</span><span>{t(LEVEL_KEYS[level] ?? level)}</span></div>}
                {builtInLessonQs && <div className="bm-line"><span>{t('booking.lesson')}</span><span>{t(KIND_KEYS[kind] ?? kind)}</span></div>}
                {planLines.map(([label, value]) => (
                  <div className="bm-line" key={`p-${label}`}><span>{label}</span><span>{value}</span></div>
                ))}
                {Object.entries(packAnswers(questions, answers)).map(([label, value]) => (
                  <div className="bm-line" key={label}><span>{label}</span><span>{value}</span></div>
                ))}
                <div className="bm-line bm-grand"><span>{t('booking.total')}</span><span><CountUp value={total} format={money} /></span></div>
              </div>
              <Receipt receipt={receipt} email={profile?.email} />
            </>
          ) : (
            <>
              <section className="bm-section">
                <h3>{timed ? t('booking.whichDay') : t('booking.when')}</h3>
                <Calendar
                  value={date}
                  rangeEnd={endDate}
                  span={span}
                  onPick={pickDate}
                  // a lesson over several days needs every one of them in season
                  // (the server refuses one that runs past the season's end)
                  isDisabled={(d) => Array.from({ length: lessonDaysN }, (_, k) => addDays(d, k)).some((day) => !inSeason(tour, day))
                    || avail.dayFull(d, timed, lessonSpan, lessonDaysN)}
                  className="bm-cal"
                  autoFocus
                />
                {span > 1 && (
                  <p className="cal-range-label" aria-live="polite">
                    {date
                      ? t('cal.rangeLabel', { range: rangeText(date, endDate, lang), days: daysText })
                      : t(`cal.pickStart${form}`, { n: span })}
                  </p>
                )}
                {timeQ && !date && <p className="bm-hint">{t('booking.pickDayForTimes')}</p>}
              </section>

              {timeQ && (
                <section className="bm-section">
                  <h3>{timeLabel}{timeQ.required && <span className="bm-req"> *</span>}</h3>
                  <div className="bm-choices bm-times">
                    {timeQ.options.map((slot) => {
                      const why = slotWhy(slot);
                      return (
                        <button
                          key={slot}
                          type="button"
                          className={`chip${time === slot ? ' active' : ''}${why ? ' taken' : ''}`}
                          disabled={Boolean(why)}
                          aria-pressed={time === slot}
                          title={why ?? undefined}
                          aria-label={why ? `${slot} — ${why}` : slot}
                          onClick={() => setTime(slot)}
                        >
                          {slot}
                        </button>
                      );
                    })}
                  </div>
                  {timeQ.hint && <p className={`bm-hint${timeQ.hintStrong ? ' strong' : ''}`}>{timeQ.hint}</p>}
                  {date && <p className="bm-hint">{t('booking.timesTbilisi')}</p>}
                </section>
              )}

              {builtInLessonQs && (
                <>

                  <section className="bm-section">
                    <h3>{t('booking.levelQ')}</h3>
                    <div className="bm-choices">
                      {SKILL_LEVELS.map((l) => (
                        <button
                          key={l}
                          type="button"
                          className={`chip${level === l ? ' active' : ''}`}
                          aria-pressed={level === l}
                          onClick={() => setLevel(l)}
                        >
                          {t(LEVEL_KEYS[l] ?? l)}
                        </button>
                      ))}
                    </div>
                  </section>

                  <section className="bm-section">
                    <h3>{t('booking.kindQ')}</h3>
                    <div className="bm-choices">
                      {LESSON_TYPES.map((k) => (
                        <button
                          key={k}
                          type="button"
                          className={`chip${kind === k ? ' active' : ''}`}
                          aria-pressed={kind === k}
                          onClick={() => setKind(k)}
                        >
                          {t(KIND_KEYS[k] ?? k)}
                        </button>
                      ))}
                    </div>
                  </section>
                </>
              )}

              {/* whatever this trip was told to ask, in the order it was
                  written in the admin panel */}
              {questions.map((q) => (
                <section className="bm-section" key={q.label}>
                  <h3>{q.label}{q.required && <span className="bm-req"> *</span>}</h3>

                  {q.type === 'choice' && (
                    <div className="bm-choices">
                      {q.options.map((choice) => (
                        <button
                          key={choice}
                          type="button"
                          className={`chip${answers[q.label] === choice ? ' active' : ''}`}
                          aria-pressed={answers[q.label] === choice}
                          onClick={() => setAnswer(q.label, choice)}
                        >
                          {choice}
                        </button>
                      ))}
                    </div>
                  )}

                  {q.type === 'number' && (() => {
                    const { lo, hi } = numberBounds(q);
                    const n = Number(answers[q.label] || 0);
                    const range = q.min != null && q.max != null
                      ? t('booking.numberRange', { min: q.min, max: q.max })
                      : q.min != null ? t('booking.numberMin', { min: q.min })
                        : q.max != null ? t('booking.numberMax', { max: q.max }) : '';
                    return (
                      <>
                        <div className="bm-people">
                          <button
                            type="button"
                            className="bm-step"
                            aria-label={t('booking.oneFewer')}
                            disabled={n <= lo}
                            onClick={() => setAnswer(q.label, Math.max(lo, n - 1))}
                          >
                            −
                          </button>
                          <span className="bm-count" aria-live="polite">
                            <strong>{n}</strong>{q.unit && <> {q.unit}</>}
                          </span>
                          <button
                            type="button"
                            className="bm-step"
                            aria-label={t('booking.oneMore')}
                            disabled={n >= hi}
                            onClick={() => setAnswer(q.label, Math.min(hi, n + 1))}
                          >
                            +
                          </button>
                        </div>
                        {range && !q.hint && <p className="bm-hint">{range}{q.unit ? ` ${q.unit}` : ''}.</p>}
                      </>
                    );
                  })()}

                  {q.type === 'text' && (
                    <input
                      className="bm-text"
                      value={answers[q.label] ?? ''}
                      onChange={(e) => setAnswer(q.label, e.target.value)}
                      aria-label={q.label}
                    />
                  )}

                  {q.hint && <p className={`bm-hint${q.hintStrong ? ' strong' : ''}`}>{q.hint}</p>}
                </section>
              ))}

              {rates && (
                <section className="bm-section">
                  <h3>{hoursQ?.label || t('booking.hoursQ')}</h3>
                  <div className="bm-people">
                    <button
                      type="button"
                      className="bm-step"
                      onClick={() => stepHours(-1)}
                      disabled={hours <= hourSpan.min}
                      aria-label={t('booking.hoursFewer')}
                    >
                      −
                    </button>
                    <span className="bm-count" aria-live="polite"><strong>{hours}</strong> {hoursWord}</span>
                    <button
                      type="button"
                      className="bm-step"
                      onClick={() => stepHours(1)}
                      disabled={hours >= hourSpan.max}
                      aria-label={t('booking.hoursMore')}
                    >
                      +
                    </button>
                  </div>
                  <p className={`bm-hint${hoursQ?.hintStrong ? ' strong' : ''}`}>
                    {hoursQ?.hint || t('booking.hoursHint', { min: hourSpan.min, max: hourSpan.max })}
                  </p>
                  {tip && (
                    <div className={`bm-tip${tipOut ? ' out' : ''}`} role="status">
                      <span className="bm-tip-icon" aria-hidden="true">i</span>
                      <p>{tip.text}</p>
                      <button type="button" className="bm-tip-close" aria-label="Close" onClick={closeTip}>×</button>
                      <button type="button" className="bm-tip-off" onClick={hideTipForever}>Don’t show again</button>
                    </div>
                  )}
                </section>
              )}

              {daysQ && (
                <section className="bm-section">
                  <h3>{daysQ.label}</h3>
                  <div className="bm-people">
                    <button type="button" className="bm-step" onClick={() => stepDays(-1)} disabled={days <= daySpan.min} aria-label="One day fewer">−</button>
                    <span className="bm-count" aria-live="polite"><strong>{days}</strong> {t(`cal.days${pluralForm(lang, days)}`, { n: days }).replace(/^\d+\s*/, '')}</span>
                    <button type="button" className="bm-step" onClick={() => stepDays(1)} disabled={days >= daySpan.max} aria-label="One day more">+</button>
                  </div>
                  <p className={`bm-hint${daysQ.hintStrong ? ' strong' : ''}`}>
                    {daysQ.hint || `From ${daySpan.min} to ${daySpan.max} days in a row, same time each day.`}
                  </p>
                </section>
              )}

              <section className="bm-section">
                <h3>{peopleQ?.label || t('booking.howMany')}</h3>
                <div className="bm-people">
                  <button type="button" className="bm-step" onClick={() => step(-1)} aria-label={t('booking.oneFewer')}>−</button>
                  <span className="bm-count" aria-live="polite"><strong>{people}</strong> {peopleWord}</span>
                  <button
                    type="button"
                    className="bm-step"
                    onClick={() => step(1)}
                    disabled={rates ? people >= maxPeople : false}
                    aria-label={t('booking.oneMore')}
                  >
                    +
                  </button>
                </div>
                {rates && (
                  <p className="bm-hint lp-rate">
                    {t('booking.hoursRate', { n: people, people: peopleWord, rate: money(rate) })}
                    {' · '}
                    {t('booking.groupMax', { n: maxPeople })}
                  </p>
                )}
                <p className="bm-hint">
                  {lesson
                    ? (peopleQ ? peopleQ.hint : t('booking.groupTaught'))
                    : timed
                      ? t('booking.slotYours')
                      : t('booking.left', { n: daySeats })}
                </p>
              </section>

              {mustBring.length > 0 && (
                <section className="bm-section">
                  <h3>{t('booking.mustBring')}<span className="bm-req"> *</span></h3>
                  <ul className="bm-kit">
                    {mustBring.map((item) => (
                      <li key={item.title}>
                        {/* with a note the box lines up with the title; on its
                            own there is nothing to line up with, so it centres */}
                        <label className={`bm-kit-line${item.note ? '' : ' solo'}`}>
                          <input
                            type="checkbox"
                            checked={confirmed.has(item.title)}
                            onChange={() => toggleItem(item.title)}
                          />
                          <span>
                            <strong>{item.title}</strong>
                            {item.note && <em>{item.note}</em>}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                  <p className="bm-hint">{t('booking.mustBringHint')}</p>
                </section>
              )}

              {needsContact && (
                <section className="bm-section">
                  <h3>{t('booking.reachYou')}</h3>
                  <ContactFields
                    profile={profile}
                    phone={phone} setPhone={setPhone}
                    dial={dial} setDial={setDial}
                  />
                </section>
              )}

              <section className="bm-section bm-total">
                <div className="bm-line">
                  {rates
                    ? <span>{money(rate)} × {hours} {hoursWord}{daysQ && days > 1 ? ` × ${t(`cal.days${pluralForm(lang, days)}`, { n: days })}` : ''}</span>
                    : <span>{money(price)} × {people}</span>}
                  <span>{money(total)}</span>
                </div>
                <div className="bm-line bm-grand"><span>{t('booking.total')}</span><span>{money(total)}</span></div>
                <p className="bm-hint">{t('booking.priceNote')}</p>
              </section>

              <button
                type="button"
                className={`book-btn${sending ? ' is-sending' : ''}`}
                disabled={sending || !date || !phoneOk || !questionsOk || !kitOk
                  || (timeQ?.required && !time) || (builtInLessonQs && (!level || !kind))}
                onClick={() => submit(lesson ? 'lesson' : 'trip')}
              >
                {sending ? <><span className="btn-spinner" aria-hidden="true" />{t('booking.sending')}</>
                  : !date ? t('booking.chooseDate')
                    : timeQ?.required && !time ? t('booking.pickTime')
                      : builtInLessonQs && !level ? t('booking.pickLevel')
                        : builtInLessonQs && !kind ? t('booking.pickKind')
                          : !kitOk ? t('booking.confirmKit')
                            : !questionsOk ? t('booking.answerRequired')
                              : !profileReady ? t('booking.checkingAccount')
                                : !phoneOk ? t('booking.addPhone')
                                  : t('booking.requestPlaces', { n: people, places: placesWord, total: money(total) })}
              </button>
              {failed && <p className="bm-note error" role="alert">{failed}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** The hour a lesson day ends: one hour after the last start time offered. */
function closingTime(options) {
  const mins = (options ?? []).map((o) => { const [h, m] = String(o).split(':').map(Number); return h * 60 + (m || 0); })
    .filter(Number.isFinite);
  if (!mins.length) return 'closing time';
  const end = Math.max(...mins) + 60;
  return `${String(Math.floor(end / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`;
}
