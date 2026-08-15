'use client';

// The "Book a spot" dialog: pick a date, pick how many people, see the price.
//
// Dates outside the trip's season are not selectable — it uses the same
// inSeason() the listing filter does, so the two can never disagree.

import { useEffect, useState } from 'react';
import Calendar from './Calendar';
import { inSeason, MONTHS, money } from '@/lib/season';

export default function BookingModal({ tour, onClose }) {
  const seats = tour.spots_left ?? tour.capacity;
  const full = seats === 0;

  const [date, setDate] = useState(null);
  const [people, setPeople] = useState(1);
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
            <h2 id="bmTitle">{full ? 'Join the waitlist' : 'Book a spot'}</h2>
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
                <button type="button" className="book-btn" onClick={() => setWaitlisted(true)}>Join waitlist</button>
              </>
            )
          ) : done ? (
            <>
              <p className="bm-note ok">Request sent.</p>
              <div className="bm-summary">
                <div className="bm-line"><span>Trip</span><span>{tour.full_title || tour.title}</span></div>
                <div className="bm-line"><span>Date</span><span>{date.getDate()} {MONTHS[date.getMonth()]} {date.getFullYear()}</span></div>
                <div className="bm-line"><span>People</span><span>{people}</span></div>
                <div className="bm-line bm-grand"><span>Total</span><span>{money(total)}</span></div>
              </div>
              <p className="bm-hint">
                Nothing is stored yet — this is the form only. Wiring it to the
                database is the next step.
              </p>
            </>
          ) : (
            <>
              <section className="bm-section">
                <h3>When do you want to go?</h3>
                <Calendar
                  value={date}
                  onPick={setDate}
                  isDisabled={(d) => !inSeason(tour, d)}
                  className="bm-cal"
                />
              </section>

              <section className="bm-section">
                <h3>How many people?</h3>
                <div className="bm-people">
                  <button type="button" className="bm-step" onClick={() => step(-1)} aria-label="One fewer">−</button>
                  <span className="bm-count"><strong>{people}</strong> {people === 1 ? 'person' : 'people'}</span>
                  <button type="button" className="bm-step" onClick={() => step(1)} aria-label="One more">+</button>
                </div>
                <p className="bm-hint">{seats} {seats === 1 ? 'place' : 'places'} left on this departure</p>
              </section>

              <section className="bm-section bm-total">
                <div className="bm-line">
                  <span>{money(tour.price)} × {people}</span><span>{money(total)}</span>
                </div>
                <div className="bm-line bm-grand"><span>Total</span><span>{money(total)}</span></div>
                <p className="bm-hint">Per person, all inclusions listed below. Paid on the day.</p>
              </section>

              <button type="button" className="book-btn" disabled={!date} onClick={() => setDone(true)}>
                {date
                  ? `Request ${people} ${people === 1 ? 'place' : 'places'} — ${money(total)}`
                  : 'Choose a date first'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
