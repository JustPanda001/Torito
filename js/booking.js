// The "Book a spot" dialog: pick a date, pick how many people, see the price.
//
// Dates outside the trip's season are not selectable — the same recurring
// window the listing filter uses, so the two can never disagree.

import { seasonCovers } from './date-filter.js';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const midnight = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const money = (n) => `${n.toLocaleString('en-US')} ₾`;

export function openBooking(tour) {
  const today = midnight(new Date());
  const seats = tour.spots_left ?? tour.capacity;
  const full = seats === 0;

  let view = new Date(today.getFullYear(), today.getMonth(), 1);
  let chosen = null;
  let people = 1;

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="booking-modal" role="dialog" aria-modal="true" aria-labelledby="bmTitle">
      <div class="bm-head">
        <div>
          <h2 id="bmTitle">${full ? 'Join the waitlist' : 'Book a spot'}</h2>
          <p class="bm-sub">${tour.full_title || tour.title}</p>
        </div>
        <button type="button" class="bm-close" aria-label="Close">×</button>
      </div>
      <div class="bm-body"></div>
    </div>`;

  const body = backdrop.querySelector('.bm-body');

  function close() {
    backdrop.remove();
    document.body.classList.remove('modal-open');
    document.removeEventListener('keydown', onKey);
  }
  function onKey(e) { if (e.key === 'Escape') close(); }

  backdrop.querySelector('.bm-close').addEventListener('click', close);
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
  document.addEventListener('keydown', onKey);

  if (full) {
    body.innerHTML = `
      <p class="bm-note">This trip is fully booked. Leave your details and we will contact you the moment a place frees up.</p>
      <button type="button" class="book-btn" id="bmWaitlist">Join waitlist</button>`;
    body.querySelector('#bmWaitlist').addEventListener('click', () => {
      body.innerHTML = `<p class="bm-note ok">You are on the waitlist. We will be in touch.</p>`;
    });
  } else {
    draw();
  }

  document.body.appendChild(backdrop);
  document.body.classList.add('modal-open');

  // ---------- rendering ----------
  function draw() {
    body.innerHTML = `
      <section class="bm-section">
        <h3>When do you want to go?</h3>
        <div class="cal-pop bm-cal">${calendarHtml()}</div>
      </section>

      <section class="bm-section">
        <h3>How many people?</h3>
        <div class="bm-people">
          <button type="button" class="bm-step" data-step="-1" aria-label="One fewer">−</button>
          <span class="bm-count"><strong>${people}</strong> ${people === 1 ? 'person' : 'people'}</span>
          <button type="button" class="bm-step" data-step="1" aria-label="One more">+</button>
        </div>
        <p class="bm-hint">${seats} ${seats === 1 ? 'place' : 'places'} left on this departure</p>
      </section>

      <section class="bm-section bm-total">
        <div class="bm-line"><span>${money(tour.price)} × ${people}</span><span>${money(tour.price * people)}</span></div>
        <div class="bm-line bm-grand"><span>Total</span><span>${money(tour.price * people)}</span></div>
        <p class="bm-hint">Per person, all inclusions listed below. Paid on the day.</p>
      </section>

      <button type="button" class="book-btn" id="bmConfirm"${chosen ? '' : ' disabled'}>
        ${chosen ? `Request ${people} ${people === 1 ? 'place' : 'places'} — ${money(tour.price * people)}` : 'Choose a date first'}
      </button>`;

    wire();
  }

  function calendarHtml() {
    const y = view.getFullYear();
    const m = view.getMonth();
    const lead = (new Date(y, m, 1).getDay() + 6) % 7;   // Monday-first
    const days = new Date(y, m + 1, 0).getDate();

    let cells = '';
    for (let i = 0; i < lead; i++) cells += '<span class="cal-pad"></span>';

    for (let n = 1; n <= days; n++) {
      const d = new Date(y, m, n);
      // a date only works if it has not passed and the trip runs then
      const off = d < today || !seasonCovers(tour, d, d);
      const cls = ['cal-day'];
      if (off) cls.push('is-past');
      if (chosen && iso(d) === iso(chosen)) cls.push('is-start', 'is-end');
      cells += `<button type="button" class="${cls.join(' ')}" data-date="${iso(d)}"${off ? ' disabled' : ''}>${n}</button>`;
    }

    return `
      <div class="cal-head">
        <button type="button" class="cal-nav" data-step="-1" aria-label="Previous month">‹</button>
        <div class="cal-title">${MONTHS[m]} ${y}</div>
        <button type="button" class="cal-nav" data-step="1" aria-label="Next month">›</button>
      </div>
      <div class="cal-dow">${DOW.map((d) => `<span>${d}</span>`).join('')}</div>
      <div class="cal-grid">${cells}</div>`;
  }

  function wire() {
    body.querySelectorAll('.cal-nav').forEach((b) => {
      b.addEventListener('click', () => {
        view = new Date(view.getFullYear(), view.getMonth() + Number(b.dataset.step), 1);
        draw();
      });
    });

    body.querySelectorAll('.cal-day:not([disabled])').forEach((b) => {
      b.addEventListener('click', () => {
        const [yy, mm, dd] = b.dataset.date.split('-').map(Number);
        chosen = new Date(yy, mm - 1, dd);
        draw();
      });
    });

    body.querySelectorAll('.bm-step').forEach((b) => {
      b.addEventListener('click', () => {
        people = Math.min(seats, Math.max(1, people + Number(b.dataset.step)));
        draw();
      });
    });

    body.querySelector('#bmConfirm')?.addEventListener('click', () => {
      if (!chosen) return;
      body.innerHTML = `
        <p class="bm-note ok">Request sent.</p>
        <div class="bm-summary">
          <div class="bm-line"><span>Trip</span><span>${tour.full_title || tour.title}</span></div>
          <div class="bm-line"><span>Date</span><span>${chosen.getDate()} ${MONTHS[chosen.getMonth()]} ${chosen.getFullYear()}</span></div>
          <div class="bm-line"><span>People</span><span>${people}</span></div>
          <div class="bm-line bm-grand"><span>Total</span><span>${money(tour.price * people)}</span></div>
        </div>
        <p class="bm-hint">Nothing is stored yet — this is the form only. Wiring it to the database is the next step.</p>`;
    });
  }
}
