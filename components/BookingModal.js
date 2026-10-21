'use client';

// The "Book a spot" dialog: pick a date, pick how many people, see the price.
//
// Dates outside the trip's season are not selectable — it uses the same
// inSeason() the listing filter does, so the two can never disagree. A trip of
// several days books a run of days: tapping the start selects them all, and a
// start whose run would cross a closed day cannot be picked.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Calendar from './Calendar';
import {
  addDays, fmtDate, inSeason, iso, money, pluralForm, rangeText, tripDays,
} from '@/lib/season';
import {
  isLesson, isTimed, timeQuestion, slotTimeState, defaultTimeQuestion, SKILL_LEVELS, LESSON_TYPES,
} from '@/lib/lessons';
import { useAvailability } from '@/lib/availability';
import { supabase, currentProfile } from '@/lib/supabaseClient';
import { DEFAULT_DIAL, phoneDigits } from '@/lib/dial-codes';
import DialSelect from './DialSelect';
import { answersComplete, bookingQuestions, initialAnswer, packAnswers } from '@/lib/bookingQuestions';
import { requiredItems } from '@/lib/requiredItems';
import { isBookable } from '@/lib/bookable';
import { useT } from '@/lib/i18n';
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
export default function BookingModal({ tour, option = null, onClose }) {
  const { t, lang } = useT();
  // trip text in the visitor's language, for display only — the slug, price
  // and the title sent to the team come from `tour`
  const view = useMemo(() => localizeTour(tour, lang), [tour, lang]);
  const tripName = view.full_title || view.title;

  const price = option ? option.price : tour.price;
  const seats = tour.spots_left ?? tour.capacity;
  const full = seats === 0;

  const lesson = isLesson(tour);
  // lessons, snowmobile and paragliding are booked as an hour on a day
  const timed = isTimed(tour);
  // how many days one booking covers: a 3-day trip books three in a row
  const span = timed ? 1 : tripDays(tour);
  const avail = useAvailability(tour);
  const [date, setDate] = useState(null);
  const endDate = date && span > 1 ? addDays(date, span - 1) : null;
  const [people, setPeople] = useState(1);
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
  const questions = useMemo(
    () => allQuestions.filter((q) => !timeQ || q.label !== timeQ.label),
    [allQuestions, timeQ],
  );
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
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          tour_slug: tour.slug,
          tour_title: `${tour.full_title || tour.title}${option ? ` — ${option.name}` : ''}`,
          kind: requestKind,
          // a plain YYYY-MM-DD, built locally: toISOString() would shift the
          // date backwards for anyone east of UTC, which is everyone here
          wanted_date: date ? iso(date) : null,
          people,
          total: requestKind === 'waitlist' ? null : total,
          lesson_time: timeQ ? time : null,
          skill_level: lesson ? level : null,
          lesson_type: lesson ? kind : null,
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

  const total = price * people;
  // places still open on the chosen departure, once other bookings count
  const daySeats = date && !timed && tour.capacity
    ? Math.max(0, Math.min(seats, tour.capacity - avail.bookedOn(date)))
    : seats;
  const step = (n) => setPeople((p) => Math.min(daySeats, Math.max(1, p + n)));

  // why a time cannot be picked on the chosen day, or null when it can
  const slotWhy = (slot) => {
    if (avail.timeTaken(date, slot)) return t('booking.alreadyBooked');
    const state = slotTimeState(date, slot);
    if (state === 'passed') return t('booking.timePassed');
    if (state === 'soon') return t('booking.tooSoon');
    return null;
  };

  function pickDate(d) {
    setDate(d);
    if (time && (avail.timeTaken(d, time) || slotTimeState(d, time))) setTime('');
    if (!timed && tour.capacity) {
      const left = Math.max(1, Math.min(seats, tour.capacity - avail.bookedOn(d)));
      setPeople((p) => Math.min(p, left));
    }
  }

  if (blocked) return null;

  const form = pluralForm(lang, span);
  const daysText = t(`cal.days${form}`, { n: span });
  const longDate = (d) => fmtDate(d, lang, { day: 'numeric', month: 'long', year: 'numeric' });
  const placesWord = t(`booking.placeWord${pluralForm(lang, people)}`);
  const peopleWord = t(`booking.peopleWord${pluralForm(lang, people)}`);
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
              <p className="bm-note ok">{t('booking.requestSent')}</p>
              <div className="bm-summary">
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
                {lesson && <div className="bm-line"><span>{t('booking.level')}</span><span>{t(LEVEL_KEYS[level] ?? level)}</span></div>}
                {lesson && <div className="bm-line"><span>{t('booking.lesson')}</span><span>{t(KIND_KEYS[kind] ?? kind)}</span></div>}
                {Object.entries(packAnswers(questions, answers)).map(([label, value]) => (
                  <div className="bm-line" key={label}><span>{label}</span><span>{value}</span></div>
                ))}
                <div className="bm-line bm-grand"><span>{t('booking.total')}</span><span>{money(total)}</span></div>
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
                  isDisabled={(d) => !inSeason(tour, d) || avail.dayFull(d, timed)}
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

              {lesson && (
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

                  {q.type === 'number' && (
                    <div className="bm-people">
                      <button
                        type="button"
                        className="bm-step"
                        aria-label={t('booking.oneFewer')}
                        onClick={() => setAnswer(q.label, Math.max(0, Number(answers[q.label] || 0) - 1))}
                      >
                        −
                      </button>
                      <span className="bm-count"><strong>{Number(answers[q.label] || 0)}</strong></span>
                      <button
                        type="button"
                        className="bm-step"
                        aria-label={t('booking.oneMore')}
                        onClick={() => setAnswer(q.label, Number(answers[q.label] || 0) + 1)}
                      >
                        +
                      </button>
                    </div>
                  )}

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

              <section className="bm-section">
                <h3>{t('booking.howMany')}</h3>
                <div className="bm-people">
                  <button type="button" className="bm-step" onClick={() => step(-1)} aria-label={t('booking.oneFewer')}>−</button>
                  <span className="bm-count" aria-live="polite"><strong>{people}</strong> {peopleWord}</span>
                  <button type="button" className="bm-step" onClick={() => step(1)} aria-label={t('booking.oneMore')}>+</button>
                </div>
                <p className="bm-hint">
                  {lesson
                    ? t('booking.groupTaught')
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
                  <span>{money(price)} × {people}</span><span>{money(total)}</span>
                </div>
                <div className="bm-line bm-grand"><span>{t('booking.total')}</span><span>{money(total)}</span></div>
                <p className="bm-hint">{t('booking.priceNote')}</p>
              </section>

              <button
                type="button"
                className="book-btn"
                disabled={sending || !date || !phoneOk || !questionsOk || !kitOk
                  || (timeQ?.required && !time) || (lesson && (!level || !kind))}
                onClick={() => submit(timed ? 'lesson' : 'trip')}
              >
                {sending ? t('booking.sending')
                  : !date ? t('booking.chooseDate')
                    : timeQ?.required && !time ? t('booking.pickTime')
                      : lesson && !level ? t('booking.pickLevel')
                        : lesson && !kind ? t('booking.pickKind')
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
