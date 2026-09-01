'use client';

// What the price covers, and what it does not.
//
// The usual entries for a category are offered as tick boxes, because that is
// how the decision is actually made — "does this trip feed you?" is a yes or a
// no, not a sentence to type. Anything unusual is added by hand underneath.
//
// Ticking copies the entry onto the trip rather than referencing it, so later
// edits to the defaults never silently rewrite a trip that is already out.

import { INCLUDED, EXCLUDED } from '@/lib/tours-data';
import { categoryOf } from '@/lib/catalog';

export default function InclusionEditor({ kind, category, rows, onChange }) {
  const defaults = (kind === 'included' ? INCLUDED : EXCLUDED)[categoryOf({ category })] ?? [];
  const has = (title) => rows.some((r) => (r.title ?? '').trim() === title);

  const toggle = ([title, note]) => {
    onChange(has(title)
      ? rows.filter((r) => (r.title ?? '').trim() !== title)
      : [...rows, { title, note }]);
  };

  const custom = rows.filter((r) => !defaults.some(([title]) => title === (r.title ?? '').trim()));
  const setCustom = (i, key, value) => {
    // custom rows are held in the same list, so edit by identity not by index
    const target = custom[i];
    onChange(rows.map((r) => (r === target ? { ...r, [key]: value } : r)));
  };

  return (
    <div className="pair-list">
      <div className="pair-head">
        <h3>{kind === 'included' ? "What's included" : 'Not included'}</h3>
        <span className="field-hint">
          {kind === 'included'
            ? 'Tick what the price covers'
            : 'Tick what it does not, so nobody is surprised on the day'}
        </span>
      </div>

      {defaults.length > 0 && (
        <ul className="inc-choices">
          {defaults.map(([title, note]) => (
            <li key={title}>
              <label className="check">
                <input type="checkbox" checked={has(title)} onChange={() => toggle([title, note])} />
                <span><strong>{title}</strong><em>{note}</em></span>
              </label>
            </li>
          ))}
        </ul>
      )}

      {custom.map((row, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <div className="pair-row" key={i}>
          <div className="pair-fields">
            <input
              value={row.title ?? ''}
              onChange={(e) => setCustom(i, 'title', e.target.value)}
              placeholder={kind === 'included' ? 'Sauna at the guesthouse' : 'Ski hire'}
              aria-label="Title"
            />
            <input
              value={row.note ?? ''}
              onChange={(e) => setCustom(i, 'note', e.target.value)}
              placeholder="A few words of detail"
              aria-label="Detail"
            />
          </div>
          <div className="pair-btns">
            <button type="button" className="chip small" onClick={() => onChange(rows.filter((r) => r !== row))}>
              Remove
            </button>
          </div>
        </div>
      ))}

      <button type="button" className="chip" onClick={() => onChange([...rows, { title: '', note: '' }])}>
        + Add your own
      </button>
    </div>
  );
}
