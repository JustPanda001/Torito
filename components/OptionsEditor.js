'use client';

// Writes a service's options and the table that compares them.
//
// One component for both because they are tied together: every table row has
// one cell per option, so removing an option has to remove its column too.

const blankOption = () => ({ name: '', price: '', duration: '', note: '' });

export default function OptionsEditor({ options, compare, onChange }) {
  const setOption = (i, key, value) => onChange(
    options.map((o, j) => (j === i ? { ...o, [key]: value } : o)),
    compare,
  );

  const removeOption = (i) => onChange(
    options.filter((_, j) => j !== i),
    compare.map((r) => ({ ...r, values: (r.values ?? []).filter((_, j) => j !== i) })),
  );

  const setRow = (i, patch) => onChange(
    options,
    compare.map((r, j) => (j === i ? { ...r, ...patch } : r)),
  );

  const setCell = (i, col, value) => {
    const values = [...(compare[i].values ?? [])];
    values[col] = value;
    setRow(i, { values });
  };

  return (
    <div className="pair-list">
      <div className="pair-head">
        <h3>Options</h3>
        <span className="field-hint">
          Different versions of this service, e.g. a 10 min and a 20 min flight. Customers
          pick one above the booking button. Leave empty for a single price.
        </span>
      </div>

      {options.map((o, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <div className="bq-row opt-edit" key={i}>
          <div className="opt-edit-grid">
            <label className="field">
              <span className="field-label">Name</span>
              <input value={o.name} onChange={(e) => setOption(i, 'name', e.target.value)} placeholder="Classic flight" />
            </label>
            <label className="field">
              <span className="field-label">Price per person (₾)</span>
              <input type="number" min="0" value={o.price} onChange={(e) => setOption(i, 'price', e.target.value)} placeholder="350" />
            </label>
            <label className="field">
              <span className="field-label">Duration</span>
              <input value={o.duration} onChange={(e) => setOption(i, 'duration', e.target.value)} placeholder="10 min" />
            </label>
          </div>
          <label className="field">
            <span className="field-label">One line on what you get</span>
            <input value={o.note} onChange={(e) => setOption(i, 'note', e.target.value)} placeholder="Calm, scenic flight over the slopes" />
          </label>
          <div className="bq-foot">
            <span className="field-hint">{i === 0 ? 'Selected first on the page' : ''}</span>
            <button type="button" className="chip small" onClick={() => removeOption(i)}>Remove</button>
          </div>
        </div>
      ))}

      <button type="button" className="chip" onClick={() => onChange([...options, blankOption()], compare)}>
        + Add option
      </button>

      {options.length > 0 && (
        <div className="opt-compare-edit">
          <div className="pair-head">
            <h3>Compare table</h3>
            <span className="field-hint">
              Shown under &quot;What&apos;s included&quot; — the &quot;Learn more&quot; link jumps here.
              Duration and price rows are added for you. In each box type <strong>yes</strong> for
              ✓, leave it empty for —, or write a short text.
            </span>
          </div>

          {compare.map((r, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <div className="bq-row" key={i}>
              <label className="field">
                <span className="field-label">Feature</span>
                <input value={r.feature ?? ''} onChange={(e) => setRow(i, { feature: e.target.value })} placeholder="Barrel rolls & spirals" />
              </label>
              <div className="opt-cells">
                {options.map((o, col) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <label className="field" key={col}>
                    <span className="field-label">{o.name || `Option ${col + 1}`}</span>
                    <input
                      value={r.values?.[col] ?? ''}
                      onChange={(e) => setCell(i, col, e.target.value)}
                      placeholder="yes / empty / text"
                    />
                  </label>
                ))}
              </div>
              <div className="bq-foot">
                <span />
                <button type="button" className="chip small" onClick={() => onChange(options, compare.filter((_, j) => j !== i))}>
                  Remove
                </button>
              </div>
            </div>
          ))}

          <button type="button" className="chip" onClick={() => onChange(options, [...compare, { feature: '', values: [] }])}>
            + Add feature row
          </button>
        </div>
      )}
    </div>
  );
}
