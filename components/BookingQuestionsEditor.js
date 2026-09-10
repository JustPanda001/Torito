'use client';

// Writes the questions a trip's booking window asks.
//
// Same idea as PairListEditor: rows added and removed here rather than typed
// as JSON, because the point of the admin panel is that nobody should have to
// know the storage format.

import { QUESTION_TYPES, blankQuestion } from '@/lib/bookingQuestions';

export default function BookingQuestionsEditor({ rows, onChange }) {
  const set = (i, key, value) => onChange(
    rows.map((r, j) => (j === i ? { ...r, [key]: value } : r)),
  );

  const move = (i, by) => {
    const next = [...rows];
    [next[i], next[i + by]] = [next[i + by], next[i]];
    onChange(next);
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
        <div className="bq-row" key={i}>
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

            <div className="pair-btns">
              {i > 0 && <button type="button" className="chip small" onClick={() => move(i, -1)}>↑</button>}
              {i < rows.length - 1 && <button type="button" className="chip small" onClick={() => move(i, 1)}>↓</button>}
              <button
                type="button"
                className="chip small"
                onClick={() => onChange(rows.filter((_, j) => j !== i))}
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      ))}

      <button type="button" className="chip" onClick={() => onChange([...rows, blankQuestion()])}>
        + Add question
      </button>
    </div>
  );
}
