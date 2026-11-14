'use client';

// Admin side of the build-your-own package (lib/packageBuilder.js): steps,
// and in every step the partner options from ₾₾₾ to ₾ with price and info.
// Leave it empty and the trip books the normal way.

import { useState } from 'react';
import { LEVELS } from '@/lib/packageBuilder';

const blankOption = () => ({ name: '', level: 2, price: '', per: 'person', summary: '', tags: '' });
const blankStep = () => ({ title: '', note: '', optional: false, options: [blankOption()] });

export default function PackageEditor({ steps, onChange }) {
  // which options have their info text open, "step|option" index keys
  const [info, setInfo] = useState(() => new Set());
  const toggle = (key) => setInfo((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });
  const setStep = (i, patch) => onChange(steps.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const setOpt = (i, k, patch) => setStep(i, {
    options: steps[i].options.map((o, j) => (j === k ? { ...o, ...patch } : o)),
  });

  return (
    <div className="pair-list pkg-ed">
      <div className="pair-head">
        <h3>Build-your-own package</h3>
        <span className="field-hint">Optional. Steps with choices; each choice adds its price to the trip price.</span>
      </div>

      {steps.map((s, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <div className="pkg-ed-step" key={i}>
          <div className="pkg-ed-steprow">
            <input className="pkg-ed-title" value={s.title} onChange={(e) => setStep(i, { title: e.target.value })} placeholder={`Step ${i + 1}, e.g. Stay`} aria-label="Step name" />
            <label className="pkg-ed-check">
              <input type="checkbox" checked={s.optional} onChange={(e) => setStep(i, { optional: e.target.checked })} /> Can skip
            </label>
            <button type="button" className="pkg-ed-x" aria-label="Remove step" onClick={() => onChange(steps.filter((_, j) => j !== i))}>×</button>
          </div>

          {s.options.map((o, k) => {
            const key = `${i}|${k}`;
            return (
              // eslint-disable-next-line react/no-array-index-key
              <div className="pkg-ed-opt" key={k}>
                <div className="pkg-ed-row">
                  <input value={o.name} onChange={(e) => setOpt(i, k, { name: e.target.value })} placeholder="Choice, e.g. Boutique hotel" aria-label="Choice name" />
                  <span className="pkg-ed-price">
                    +<input type="number" min="0" value={o.price} onChange={(e) => setOpt(i, k, { price: e.target.value })} placeholder="0" aria-label="Adds, in lari" /> ₾
                  </span>
                  <select value={o.per} onChange={(e) => setOpt(i, k, { per: e.target.value })} aria-label="Priced">
                    <option value="person">per person</option>
                    <option value="group">per group</option>
                  </select>
                  <button type="button" className="pkg-ed-link" onClick={() => toggle(key)}>{info.has(key) ? 'Hide info' : 'Info'}</button>
                  <button type="button" className="pkg-ed-x" aria-label="Remove choice" onClick={() => setStep(i, { options: s.options.filter((_, j) => j !== k) })}>×</button>
                </div>
                {info.has(key) && (
                  <div className="pkg-ed-info">
                    <textarea rows={2} value={o.summary} onChange={(e) => setOpt(i, k, { summary: e.target.value })} placeholder="More info: what it is known for" aria-label="More info" />
                    <div className="pkg-ed-row">
                      <input value={Array.isArray(o.tags) ? o.tags.join(', ') : o.tags} onChange={(e) => setOpt(i, k, { tags: e.target.value })} placeholder="Tags: Spa, Pool, Bar" aria-label="Tags" />
                      <select value={o.level} onChange={(e) => setOpt(i, k, { level: Number(e.target.value) })} aria-label="Budget filter">
                        {LEVELS.map(([v, , label]) => <option key={v} value={v}>{label}</option>)}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          <button type="button" className="pkg-ed-link" onClick={() => setStep(i, { options: [...s.options, blankOption()] })}>+ Add choice</button>
        </div>
      ))}

      <button type="button" className="pkg-ed-link" onClick={() => onChange([...steps, blankStep()])}>+ Add step</button>
    </div>
  );
}

/** Admin state -> the hidden booking_fields entry, or null when empty. */
export function packageEntryFrom(steps) {
  const clean = steps
    .map((s) => ({
      title: String(s.title ?? '').trim(),
      note: String(s.note ?? '').trim(),
      optional: Boolean(s.optional),
      options: s.options
        .map((o) => ({
          name: String(o.name ?? '').trim(),
          level: Number(o.level) || 2,
          price: Number(o.price) || 0,
          per: o.per === 'group' ? 'group' : 'person',
          summary: String(o.summary ?? '').trim(),
          tags: (Array.isArray(o.tags) ? o.tags : String(o.tags ?? '').split(','))
            .map((x) => String(x).trim()).filter(Boolean),
        }))
        .filter((o) => o.name),
    }))
    .filter((s) => s.title && s.options.length);
  return clean.length ? { type: 'package', steps: clean } : null;
}
