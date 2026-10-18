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
import { useState } from 'react';
import { categoryOf } from '@/lib/catalog';

export default function InclusionEditor({ kind, category, rows, onChange }) {
  const defaults = (kind === 'included' ? INCLUDED : EXCLUDED)[categoryOf({ category })] ?? [];
  // the ticked line open for editing: which standard line, and where its row
  // sits in the list. Held by position so renaming it does not close the box
  // mid-word; once closed, a renamed line becomes one of the trip's own below.
  const [editing, setEditing] = useState(null);   // { title, idx } | null
  const rowFor = (title) => (editing?.title === title
    ? rows[editing.idx]
    : rows.find((r) => (r.title ?? '').trim() === title));
  const setTicked = (key, value) => {
    onChange(rows.map((r, i) => (i === editing.idx ? { ...r, [key]: value } : r)));
  };
  const has = (title) => rows.some((r) => (r.title ?? '').trim() === title);

  const toggle = ([title, note]) => {
    // unticking the line being edited removes that row, renamed or not
    if (editing?.title === title) {
      onChange(rows.filter((_, i) => i !== editing.idx));
      setEditing(null);
      return;
    }
    onChange(has(title)
      ? rows.filter((r) => (r.title ?? '').trim() !== title)
      : [...rows, { title, note }]);
  };

  const custom = rows.filter((r, i) => i !== editing?.idx
    && !defaults.some(([title]) => title === (r.title ?? '').trim()));
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
          {defaults.map(([title, note]) => {
            const row = rowFor(title);
            const open = editing?.title === title && row;
            return (
              <li key={title}>
                <div className="inc-choice-line">
                  <label className="check">
                    <input type="checkbox" checked={Boolean(row)} onChange={() => toggle([title, note])} />
                    {/* the trip's own wording once ticked, which may differ */}
                    <span><strong>{title}</strong><em>{row ? row.note : note}</em></span>
                  </label>
                  {row && (
                    <button type="button" className="chip small" onClick={() => setEditing(open ? null : { title, idx: rows.indexOf(row) })}>
                      {open ? 'Done' : 'Edit'}
                    </button>
                  )}
                </div>
                {open && (
                  <div className="pair-fields inc-edit">
                    <input
                      value={row.title ?? ''}
                      onChange={(e) => setTicked('title', e.target.value)}
                      aria-label="Title"
                    />
                    <input
                      value={row.note ?? ''}
                      onChange={(e) => setTicked('note', e.target.value)}
                      placeholder="A few words of detail"
                      aria-label="Detail"
                    />
                  </div>
                )}
              </li>
            );
          })}
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
            <button type="button" className="chip small" onClick={() => { setEditing(null); onChange(rows.filter((r) => r !== row)); }}>
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
