'use client';

// The "Book a spot" dialog: pick a date, pick how many people, see the price.
//
// Dates outside the trip's season are not selectable — it uses the same
// inSeason() the listing filter does, so the two can never disagree.

import { useEffect, useState } from 'react';
import Calendar from './Calendar';
import { inSeason, MONTHS, money } from '@/lib/season';
import { isLesson, SKILL_LEVELS, LESSON_TYPES, LESSON_TIMES } from '@/lib/lessons';
import { currentProfile } from '@/lib/supabaseClient';
import { DIAL_CODES, DEFAULT_DIAL, phoneDigits } from '@/lib/dial-codes';

function ContactFields({ profile, phone, setPhone, dial, setDial }) {
  return (
    <div className="bm-who">
      <p className="bm-who-line">
        <strong>{profile?.full_name || 'Your account'}</strong>
        <span>{profile?.email}</span>
        {profile?.phone && <span>{profile.phone}</span>}
      </p>

      {!profile?.phone && (
        <div className="field">
          <span className="field-label">Phone *</span>
          <div className="bm-phone">
            {/* the code is a separate control so the number itself stays clean:
                a pasted "+995 599…" and a typed "599…" end up identical */}
            <select value={dial} onChange={(e) => setDial(e.target.value)} aria-label="Country code">
              {DIAL_CODES.map(([code, country]) => (
                <option value={code} key={`${code} ${country}`}>{code} · {country}</option>
              ))}
            </select>
            <input
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="599 12 34 56"
              aria-label="Phone number"
            />
          </div>
          <span className="field-hint">Your account has no phone number yet</span>
        </div>
      )}
    </div>
  );
}

export default function BookingModal({ tour, onClose }) {
  const seats = tour.spots_left ?? tour.capacity;
  const full = seats === 0;

  const lesson = isLesson(tour);
  const [date, setDate] = useState(null);
  const [people, setPeople] = useState(1);
  // lesson requests only: when, and what they want out of it
  const [time, setTime] = useState('');
  const [level, setLevel] = useState('');
  const [kind, setKind] = useState('');
  // we have to be able to answer the person, and most visitors are not signed in
  const [profile, setProfile] = useState(null);
  const [phone, setPhone] = useState('');
  const [dial, setDial] = useState(DEFAULT_DIAL);
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(null);

  // booking is gated behind an account, so this is where the name, email and
  // phone come from — nobody types them a second time
  useEffect(() => {
    let alive = true;
    currentProfile()
      .then((p) => { if (alive) setProfile(p); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  // six is the shortest national number in use anywhere; anything under that
  // is a slip rather than a number we could ring back
  const savedPhone = profile?.phone ?? '';
  const phoneOk = savedPhone
    ? true
    : phoneDigits(phone).length >= 6;

  async function submit(requestKind) {
    setSending(true);
    setFailed(null);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tour_slug: tour.slug,
          tour_title: tour.full_title || tour.title,
          kind: requestKind,
          // a plain YYYY-MM-DD, built locally: toISOString() would shift the
          // date backwards for anyone east of UTC, which is everyone here
          wanted_date: date
            ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
            : null,
          people,
          total: requestKind === 'waitlist' ? null : total,
          lesson_time: lesson ? time : null,
          skill_level: lesson ? level : null,
          lesson_type: lesson ? kind : null,
          name: profile?.full_name ?? null,
          email: profile?.email ?? null,
          phone: savedPhone || `${dial} ${phone.trim()}`,
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Request failed');
      if (requestKind === 'waitlist') setWaitlisted(true); else setDone(true);
    } catch (err) {
      setFailed('That did not go through. Please try again, or ask us in the chat.');
      console.warn('Booking request failed:', err.message);
    } finally {
      setSending(false);
    }
  }
  const [done, setDone] = useState(false);
  const [waitlisted, setWaitlisted] = useState(false);

  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', esc);
    document.body.classList.add('modal-open');
    return () => {
      document.removeEventListener('keydown', esc);
      document.body.classList.remove('modal-open');
    };
  }, [onClose]);

  const total = tour.price * people;
  const step = (n) => setPeople((p) => Math.min(seats, Math.max(1, p + n)));

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="booking-modal" role="dialog" aria-modal="true" aria-labelledby="bmTitle">

        <div className="bm-head">
          <div>
            <h2 id="bmTitle">{full ? 'Join the waitlist' : lesson ? 'Book a lesson' : 'Book a spot'}</h2>
            <p className="bm-sub">{tour.full_title || tour.title}</p>
          </div>
          <button type="button" className="bm-close" aria-label="Close" onClick={onClose}>×</button>
        </div>

        <div className="bm-body">
          {full ? (
            waitlisted ? (
              <p className="bm-note ok">You are on the waitlist. We will be in touch.</p>
            ) : (
              <>
                <p className="bm-note">
                  This trip is fully booked. Leave your details and we will contact
                  you the moment a place frees up.
                </p>
                <ContactFields
                  profile={profile}
                  phone={phone} setPhone={setPhone}
                  dial={dial} setDial={setDial}
                />
                <button
                  type="button"
                  className="book-btn"
                  disabled={sending || !phoneOk}
                  onClick={() => submit('waitlist')}
                >
                  {sending ? 'Sending…' : !phoneOk ? 'Add your phone' : 'Join waitlist'}
                </button>
                {failed && <p className="bm-note error">{failed}</p>}
              </>
            )
          ) : done ? (
            <>
              <p className="bm-note ok">Request sent.</p>
              <div className="bm-summary">
                <div className="bm-line"><span>Trip</span><span>{tour.full_title || tour.title}</span></div>
                <div className="bm-line"><span>Date</span><span>{date.getDate()} {MONTHS[date.getMonth()]} {date.getFullYear()}</span></div>
                {lesson && <div className="bm-line"><span>Time</span><span>{time}</span></div>}
                <div className="bm-line"><span>People</span><span>{people}</span></div>
                {lesson && <div className="bm-line"><span>Level</span><span>{level}</span></div>}
                {lesson && <div className="bm-line"><span>Lesson</span><span>{kind}</span></div>}
                <div className="bm-line bm-grand"><span>Total</span><span>{money(total)}</span></div>
              </div>
              <p className="bm-hint">
                We have your request and will confirm by email shortly.
              </p>
            </>
          ) : (
            <>
              <section className="bm-section">
                <h3>{lesson ? 'Which day?' : 'When do you want to go?'}</h3>
                <Calendar
                  value={date}
                  onPick={setDate}
                  isDisabled={(d) => !inSeason(tour, d)}
                  className="bm-cal"
                />
              </section>

              {lesson && (
                <>
                  <section className="bm-section">
                    <h3>What time?</h3>
                    <div className="bm-choices">
                      {LESSON_TIMES.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          className={`chip${time === slot ? ' active' : ''}`}
                          onClick={() => setTime(slot)}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  </section>

                  <section className="bm-section">
                    <h3>How much can you already do?</h3>
                    <div className="bm-choices">
                      {SKILL_LEVELS.map((l) => (
                        <button
                          key={l}
                          type="button"
                          className={`chip${level === l ? ' active' : ''}`}
                          onClick={() => setLevel(l)}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </section>

                  <section className="bm-section">
                    <h3>What kind of lesson?</h3>
                    <div className="bm-choices">
                      {LESSON_TYPES.map((k) => (
                        <button
                          key={k}
                          type="button"
                          className={`chip${kind === k ? ' active' : ''}`}
                          onClick={() => setKind(k)}
                        >
                          {k}
                        </button>
                      ))}
                    </div>
                  </section>
                </>
              )}

              <section className="bm-section">
                <h3>How many people?</h3>
                <div className="bm-people">
                  <button type="button" className="bm-step" onClick={() => step(-1)} aria-label="One fewer">−</button>
                  <span className="bm-count"><strong>{people}</strong> {people === 1 ? 'person' : 'people'}</span>
                  <button type="button" className="bm-step" onClick={() => step(1)} aria-label="One more">+</button>
                </div>
                <p className="bm-hint">
                  {lesson
                    ? 'Everyone in the group is taught together'
                    : `${seats} ${seats === 1 ? 'place' : 'places'} left on this departure`}
                </p>
              </section>

              <section className="bm-section">
                <h3>Who is it for?</h3>
                <ContactFields
                  profile={profile}
                  phone={phone} setPhone={setPhone}
                  dial={dial} setDial={setDial}
                />
              </section>

              <section className="bm-section bm-total">
                <div className="bm-line">
                  <span>{money(tour.price)} × {people}</span><span>{money(total)}</span>
                </div>
                <div className="bm-line bm-grand"><span>Total</span><span>{money(total)}</span></div>
                <p className="bm-hint">Per person, all inclusions listed below. Paid on the day.</p>
              </section>

              <button
                type="button"
                className="book-btn"
                disabled={sending || !date || !phoneOk || (lesson && (!time || !level || !kind))}
                onClick={() => submit(lesson ? 'lesson' : 'trip')}
              >
                {sending ? 'Sending…'
                  : !date ? 'Choose a date first'
                    : lesson && !time ? 'Pick a time'
                      : lesson && !level ? 'Pick your level'
                        : lesson && !kind ? 'Pick a lesson type'
                          : !phoneOk ? 'Add your phone'
                            : `Request ${people} ${people === 1 ? 'place' : 'places'} — ${money(total)}`}
              </button>
              {failed && <p className="bm-note error">{failed}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
