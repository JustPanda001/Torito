'use client';

// Writes the questions a trip's booking window asks.
//
// Same idea as PairListEditor: rows added and removed here rather than typed
// as JSON, because the point of the admin panel is that nobody should have to
// know the storage format.

import { useState } from 'react';
import { QUESTION_TYPES, blankQuestion } from '@/lib/bookingQuestions';

// the one-line summary a closed question shows
function summary(row) {
  if (row.type === 'number') {
    const lo = row.min ?? '', hi = row.max ?? '';
    return lo !== '' || hi !== '' ? `${lo || 0} – ${hi || '∞'} ${row.unit ?? ''}`.trim() : 'A number';
  }
  if (row.type === 'text') return 'Free text';
  return (row.options ?? []).filter(Boolean).join(', ') || 'No choices yet';
}

export default function BookingQuestionsEditor({ rows, onChange }) {
  // questions start closed; the arrow on each opens it. Kept by index.
  const [open, setOpen] = useState(() => new Set());
  const toggle = (i) => setOpen((prev) => {
    const next = new Set(prev);
    if (next.has(i)) next.delete(i); else next.add(i);
    return next;
  });
  const set = (i, key, value) => onChange(
    rows.map((r, j) => (j === i ? { ...r, [key]: value } : r)),
  );

  const move = (i, by) => {
    const next = [...rows];
    [next[i], next[i + by]] = [next[i + by], next[i]];
    onChange(next);
    // the open/closed state moves with the question
    setOpen((prev) => {
      const s = new Set(prev);
      const a = s.has(i), b = s.has(i + by);
      s.delete(i); s.delete(i + by);
      if (a) s.add(i + by);
      if (b) s.add(i);
      return s;
    });
  };

  return (
    <div className="pair-list">
      <div className="pair-head">
        <h3>Booking questions</h3>
        <span className="field-hint">
          Asked in the booking window, under the date. Leave empty and the
          window just asks for a date and how many people.
        </span>
      </div>

      {rows.length === 0 && (
        <p className="form-note">No extra questions — the standard booking window.</p>
      )}

      {rows.map((row, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <div className={`bq-row${open.has(i) ? ' is-open' : ' is-closed'}`} key={i}>
          <button type="button" className="bq-toggle" aria-expanded={open.has(i)} onClick={() => toggle(i)}>
            <span className="bq-toggle-text">
              <strong>{row.label || 'New question'}</strong>
              <small>{summary(row)}{row.required ? ' · must be answered' : ''}</small>
            </span>
            <span className="bq-arrow" aria-hidden="true">▾</span>
          </button>
          {open.has(i) && (<>
          <div className="bq-main">
            <label className="field">
              <span className="field-label">Question</span>
              <input
                value={row.label ?? ''}
                onChange={(e) => set(i, 'label', e.target.value)}
                placeholder="What time suits you?"
              />
            </label>

            <label className="field">
              <span className="field-label">Answered with</span>
              <select value={row.type ?? 'choice'} onChange={(e) => set(i, 'type', e.target.value)}>
                {QUESTION_TYPES.map(([value, label]) => (
                  <option value={value} key={value}>{label}</option>
                ))}
              </select>
              <span className="field-hint">
                {QUESTION_TYPES.find(([v]) => v === (row.type ?? 'choice'))?.[2]}
              </span>
            </label>
          </div>

          {/* one line, commas between: a five-option question should not need
              five rounds of clicking "add" */}
          {(row.type ?? 'choice') === 'choice' && (
            <label className="field">
              <span className="field-label">Choices</span>
              <input
                value={(row.options ?? []).join(', ')}
                onChange={(e) => set(i, 'options', e.target.value.split(',').map((s) => s.trim()))}
                placeholder="09:00, 10:00, 11:00"
              />
              <span className="field-hint">Separate them with commas</span>
            </label>
          )}

          {/* a counter's limits and the word after it, e.g. 2 to 8 "hours" */}
          {row.type === 'number' && (
            <div className="bq-number">
              <label className="field">
                <span className="field-label">Lowest</span>
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={row.min ?? ''}
                  onChange={(e) => set(i, 'min', e.target.value)}
                  placeholder="No limit"
                />
              </label>
              <label className="field">
                <span className="field-label">Highest</span>
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={row.max ?? ''}
                  onChange={(e) => set(i, 'max', e.target.value)}
                  placeholder="No limit"
                />
              </label>
              <label className="field">
                <span className="field-label">Word after the number</span>
                <input
                  value={row.unit ?? ''}
                  onChange={(e) => set(i, 'unit', e.target.value)}
                  placeholder="hours"
                  maxLength={30}
                />
              </label>
              <span className="field-hint">
                The visitor sees e.g. “− 2 hours +” and “From 2 to 8 hours.” Leave Lowest and Highest empty for no limit.
              </span>
            </div>
          )}

          <label className="field">
            <span className="field-label">Note under the question</span>
            <input
              value={row.hint ?? ''}
              onChange={(e) => set(i, 'hint', e.target.value)}
              placeholder="Optional — e.g. Everyone in the group is taught together"
            />
          </label>

          <div className="bq-foot">
            <label className="bq-check">
              <input
                type="checkbox"
                checked={Boolean(row.required)}
                onChange={(e) => set(i, 'required', e.target.checked)}
              />
              <span>Must be answered</span>
            </label>

            {/* for notes a customer must not miss, like a weather warning */}
            <label className="bq-check">
              <input
                type="checkbox"
                checked={Boolean(row.hintStrong)}
                onChange={(e) => set(i, 'hintStrong', e.target.checked)}
              />
              <span>Bold note</span>
            </label>

            <div className="pair-btns">
              {i > 0 && <button type="button" className="chip small" onClick={() => move(i, -1)}>↑</button>}
              {i < rows.length - 1 && <button type="button" className="chip small" onClick={() => move(i, 1)}>↓</button>}
              <button
                type="button"
                className="chip small"
                onClick={() => { setOpen(new Set()); onChange(rows.filter((_, j) => j !== i)); }}
              >
                Remove
              </button>
            </div>
          </div>
          </>)}
        </div>
      ))}

      <button type="button" className="chip" onClick={() => { setOpen((prev) => new Set(prev).add(rows.length)); onChange([...rows, blankQuestion()]); }}>
        + Add question
      </button>
    </div>
  );
}
