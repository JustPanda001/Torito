'use client';

// The repeating parts of a trip page: the day-by-day plan, and the two lists
// of what the price does and does not cover. All three are the same shape —
// a heading and a line of detail — so they share one editor.
//
// Rows are added and removed here rather than typed as JSON, because the point
// of the admin panel is that nobody should have to know the storage format.

export default function PairListEditor({
  label, hint, rows, onChange, titleLabel = 'Title', notePlaceholder, addLabel = 'Add',
  // what to call each row — "Day 2" on a trek, "Stop 2" on a day tour
  numberLabel = null, headExtra = null,
}) {
  const set = (i, key, value) => {
    const next = rows.map((r, j) => (j === i ? { ...r, [key]: value } : r));
    onChange(next);
  };

  return (
    <div className="pair-list">
      <div className="pair-head">
        <h3>{label}</h3>
        {hint && <span className="field-hint">{hint}</span>}
        {headExtra}
      </div>

      {rows.length === 0 && (
        <p className="form-note">
          Nothing added — the page will fall back to the usual entries for this category.
        </p>
      )}

      {rows.map((row, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <div className="pair-row" key={i}>
          {numberLabel && <span className="pair-n">{numberLabel(i)}</span>}

          <div className="pair-fields">
            <input
              value={row.title ?? ''}
              onChange={(e) => set(i, 'title', e.target.value)}
              placeholder={titleLabel}
              aria-label={titleLabel}
            />
            <input
              value={row.note ?? ''}
              onChange={(e) => set(i, 'note', e.target.value)}
              placeholder={notePlaceholder}
              aria-label="Detail"
            />
          </div>

          <div className="pair-btns">
            <button type="button" className="chip small" onClick={() => onChange(rows.filter((_, j) => j !== i))}>
              Remove
            </button>
            {i > 0 && (
              <button
                type="button"
                className="chip small"
                onClick={() => {
                  const next = [...rows];
                  [next[i - 1], next[i]] = [next[i], next[i - 1]];
                  onChange(next);
                }}
              >
                ↑
              </button>
            )}
          </div>
        </div>
      ))}

      <button type="button" className="chip" onClick={() => onChange([...rows, { title: '', note: '' }])}>
        + {addLabel}
      </button>
    </div>
  );
}
