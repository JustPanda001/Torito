// Date-range picker for the activity listing.
//
// Tourists pick the window they are in Georgia for (say 12–15 Dec) and the
// listing narrows to trips whose season covers any of those days. Dates in the
// past are not selectable — you cannot book a trip that already happened.

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const midnight = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const sameDay = (a, b) => a && b && iso(a) === iso(b);

/**
 * Wires the calendar button up to its popover.
 * `onChange({ from, to })` fires whenever the selection settles; both are
 * Date objects, or null when the range has been cleared.
 */
export function initDateFilter({ button, label, onChange }) {
  const today = midnight(new Date());
  let view = new Date(today.getFullYear(), today.getMonth(), 1);
  let from = null;
  let to = null;

  const pop = document.createElement('div');
  pop.className = 'cal-pop';
  pop.hidden = true;
  button.parentElement.appendChild(pop);

  function open() {
    pop.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    draw();
  }
  function close() {
    pop.hidden = true;
    button.setAttribute('aria-expanded', 'false');
  }

  button.addEventListener('click', (e) => {
    e.stopPropagation();
    if (pop.hidden) open(); else close();
  });
  pop.addEventListener('click', (e) => e.stopPropagation());
  document.addEventListener('click', close);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

  function commit() {
    updateLabel();
    onChange({ from, to: to || from });
  }

  function updateLabel() {
    if (!from) {
      label.textContent = 'Any dates';
      button.classList.remove('has-value');
      return;
    }
    const end = to || from;
    button.classList.add('has-value');
    label.textContent = sameDay(from, end)
      ? `${from.getDate()} ${MONTHS_SHORT[from.getMonth()]}`
      : from.getMonth() === end.getMonth()
        ? `${from.getDate()} – ${end.getDate()} ${MONTHS_SHORT[end.getMonth()]}`
        : `${from.getDate()} ${MONTHS_SHORT[from.getMonth()]} – ${end.getDate()} ${MONTHS_SHORT[end.getMonth()]}`;
  }

  function pick(d) {
    // first click starts a range, second click closes it; clicking before the
    // current start means the tourist is re-picking, so start over
    if (!from || to || d < from) {
      from = d;
      to = null;
    } else {
      to = d;
    }
    draw();
    commit();
  }

  function draw() {
    const y = view.getFullYear();
    const m = view.getMonth();
    const lead = (new Date(y, m, 1).getDay() + 6) % 7;   // Monday-first
    const days = new Date(y, m + 1, 0).getDate();
    const end = to || from;

    // a real span, not a single day — only then does the band get drawn
    const ranged = from && end && !sameDay(from, end);

    let cells = '';
    for (let i = 0; i < lead; i++) cells += '<span class="cal-pad"></span>';

    for (let n = 1; n <= days; n++) {
      const d = new Date(y, m, n);
      const past = d < today;
      const cls = ['cal-day'];

      if (past) cls.push('is-past');
      if (sameDay(d, today)) cls.push('is-today');
      if (sameDay(d, from)) cls.push('is-start');
      if (sameDay(d, end)) cls.push('is-end');
      if (ranged && (sameDay(d, from) || sameDay(d, end))) cls.push('ranged');
      if (from && end && d > from && d < end) cls.push('in-range');

      cells += `<button type="button" class="${cls.join(' ')}" data-date="${iso(d)}"${past ? ' disabled' : ''}>${n}</button>`;
    }

    pop.innerHTML = `
      <div class="cal-head">
        <button type="button" class="cal-nav" data-step="-1" aria-label="Previous month">‹</button>
        <div class="cal-title">${MONTHS[m]} ${y}</div>
        <button type="button" class="cal-nav" data-step="1" aria-label="Next month">›</button>
      </div>
      <div class="cal-dow">${DOW.map((d) => `<span>${d}</span>`).join('')}</div>
      <div class="cal-grid">${cells}</div>
      <div class="cal-foot">
        <button type="button" class="cal-clear">Clear</button>
        <button type="button" class="cal-done">Done</button>
      </div>`;

    pop.querySelectorAll('.cal-nav').forEach((b) => {
      b.addEventListener('click', () => {
        view = new Date(y, m + Number(b.dataset.step), 1);
        draw();
      });
    });
    pop.querySelectorAll('.cal-day:not([disabled])').forEach((b) => {
      b.addEventListener('click', () => {
        const [yy, mm, dd] = b.dataset.date.split('-').map(Number);
        pick(new Date(yy, mm - 1, dd));
      });
    });
    pop.querySelector('.cal-clear').addEventListener('click', () => {
      from = to = null;
      draw();
      commit();
    });
    pop.querySelector('.cal-done').addEventListener('click', close);
  }

  updateLabel();
}

/**
 * True when the trip's season covers any day in the chosen range.
 * Seasons are recurring "MM-DD" windows, so winter ones wrap the new year
 * (12-01 → 04-15) and are compared day-by-day rather than as plain dates.
 */
export function seasonCovers(tour, from, to) {
  if (!from) return true;                                   // no filter set
  if (!tour.season_from || !tour.season_to) return true;     // trip runs anytime

  const start = tour.season_from;
  const finish = tour.season_to;
  const wraps = start > finish;
  const end = to || from;

  const cursor = new Date(from);
  for (let guard = 0; cursor <= end && guard < 400; guard++) {
    const md = `${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
    const hit = wraps ? (md >= start || md <= finish) : (md >= start && md <= finish);
    if (hit) return true;
    cursor.setDate(cursor.getDate() + 1);
  }
  return false;
}

/** "Jun – Oct", or "All year" for trips that run every month. */
export function seasonLabel(tour) {
  if (!tour.season_from || !tour.season_to) return '';
  if (tour.season_from === '01-01' && tour.season_to === '12-31') return 'All year';
  const mon = (md) => MONTHS_SHORT[Number(md.slice(0, 2)) - 1];
  return `${mon(tour.season_from)} – ${mon(tour.season_to)}`;
}
