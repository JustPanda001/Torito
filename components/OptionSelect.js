'use client';

// A <select> whose choices come from the tour_options table, with buttons to
// add a choice or drop one without leaving the form.
//
// Deliberately uncontrolled: the admin form fills itself by assigning to
// form.elements[name].value when you press Edit, which a React-controlled value
// would fight with.

import { useEffect, useRef, useState } from 'react';
import { supabase, friendlyError } from '@/lib/supabaseClient';

export default function OptionSelect({ name, label, field, hint, required = false }) {
  const [options, setOptions] = useState([]);
  const [adding, setAdding] = useState(false);
  const [managing, setManaging] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState(null);
  const select = useRef(null);
  const newInput = useRef(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error: err } = await supabase
        .from('tour_options')
        .select('value')
        .eq('field', field)
        .order('value');
      if (!alive) return;
      if (err) { console.warn(`Could not load ${field} options:`, err.message); return; }
      setOptions((data ?? []).map((r) => r.value));
    })();
    return () => { alive = false; };
  }, [field]);

  useEffect(() => { if (adding) newInput.current?.focus(); }, [adding]);

  async function save() {
    const value = draft.trim();
    if (!value) { setAdding(false); return; }

    if (options.includes(value)) {
      setAdding(false); setDraft('');
      if (select.current) select.current.value = value;
      return;
    }

    const { error: err } = await supabase.from('tour_options').insert({ field, value });
    if (err) { setError(friendlyError(err)); return; }

    setOptions((prev) => [...prev, value].sort((a, b) => a.localeCompare(b)));
    setAdding(false);
    setDraft('');
    // select it once React has rendered the new <option>
    setTimeout(() => { if (select.current) select.current.value = value; }, 0);
  }

  async function remove(value) {
    // typos are the usual reason a list needs tidying, and a typo nobody has
    // used is not worth a confirmation step — but one already on a trip is
    if (!confirm(`Remove "${value}" from the ${label.toLowerCase()} list?`)) return;

    const { error: err } = await supabase
      .from('tour_options')
      .delete()
      .eq('field', field)
      .eq('value', value);

    if (err) { setError(friendlyError(err)); return; }

    setOptions((prev) => prev.filter((o) => o !== value));
    // a trip already saved with this value keeps it; the select just no longer
    // offers it to the next one
    if (select.current?.value === value) select.current.value = '';
  }

  return (
    <label className="field option-field">
      <span className="field-label">{label}</span>

      <div className="option-row">
        <select name={name} ref={select} required={required} defaultValue="">
          <option value="">—</option>
          {options.map((o) => <option value={o} key={o}>{o}</option>)}
        </select>
        <button
          type="button"
          className="option-add"
          title={`Add a new ${label.toLowerCase()}`}
          aria-label={`Add a new ${label.toLowerCase()}`}
          onClick={() => { setError(null); setAdding((v) => !v); }}
        >
          {adding ? '×' : '+'}
        </button>
        {options.length > 0 && (
          <button
            type="button"
            className="option-add option-manage"
            title={`Edit the ${label.toLowerCase()} list`}
            aria-label={`Edit the ${label.toLowerCase()} list`}
            onClick={() => { setError(null); setManaging((v) => !v); }}
          >
            {managing ? 'done' : 'edit'}
          </button>
        )}
      </div>

      {managing && (
        <ul className="option-manage-list">
          {options.map((o) => (
            <li key={o}>
              <button type="button" className="option-remove" aria-label={`Remove ${o}`} onClick={() => remove(o)}>×</button>
              <span>{o}</span>
            </li>
          ))}
        </ul>
      )}

      {adding && (
        <div className="option-row option-new">
          <input
            ref={newInput}
            type="text"
            value={draft}
            placeholder={`New ${label.toLowerCase()}…`}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              // Enter here must not submit the whole tour form
              if (e.key === 'Enter') { e.preventDefault(); save(); }
              if (e.key === 'Escape') { e.preventDefault(); setAdding(false); setDraft(''); }
            }}
          />
          <button type="button" className="option-save" onClick={save}>Save</button>
        </div>
      )}

      {error && <span className="field-hint error">{error}</span>}
      {hint && !error && <span className="field-hint">{hint}</span>}
    </label>
  );
}
