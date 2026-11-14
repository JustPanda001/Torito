'use client';

// Admin side of the build-your-own package (lib/packageBuilder.js): steps,
// and in every step the partner options from ₾₾₾ to ₾ with price and info.
// Leave it empty and the trip books the normal way.

import { LEVELS } from '@/lib/packageBuilder';

const blankOption = () => ({ name: '', level: 2, price: '', per: 'person', summary: '', tags: '' });
const blankStep = () => ({ title: '', note: '', optional: false, options: [blankOption()] });

export default function PackageEditor({ steps, onChange }) {
  const setStep = (i, patch) => onChange(steps.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const setOpt = (i, k, patch) => setStep(i, {
    options: steps[i].options.map((o, j) => (j === k ? { ...o, ...patch } : o)),
  });
  const move = (i, d) => {
    const j = i + d;
    if (j < 0 || j >= steps.length) return;
    const next = [...steps];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div className="pair-list">
      <div className="pair-head">
        <h3>Build-your-own package</h3>
        <span className="field-hint">
          Steps the customer goes through (Stay, Transport, Guide…), each with options from ₾₾₾ to ₾.
          The trip&apos;s price above is the base week per person; every option adds its own price on top.
          Leave empty for a normal trip.
        </span>
      </div>

      {steps.map((s, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <div className="bq-row opt-edit" key={i}>
          <div className="opt-edit-grid">
            <label className="field">
              <span className="field-label">Step {i + 1}</span>
              <input value={s.title} onChange={(e) => setStep(i, { title: e.target.value })} placeholder="Stay" />
            </label>
            <label className="field">
              <span className="field-label">Short note</span>
              <input value={s.note} onChange={(e) => setStep(i, { note: e.target.value })} placeholder="Five nights, breakfast included" />
            </label>
            <label className="field">
              <span className="field-label">Optional?</span>
              <select value={s.optional ? 'yes' : 'no'} onChange={(e) => setStep(i, { optional: e.target.value === 'yes' })}>
                <option value="no">Required — must pick one</option>
                <option value="yes">Optional — can skip</option>
              </select>
            </label>
          </div>

          {s.options.map((o, k) => (
            // eslint-disable-next-line react/no-array-index-key
            <div className="pkg-edit-opt" key={k}>
              <div className="opt-edit-grid">
                <label className="field">
                  <span className="field-label">Option name</span>
                  <input value={o.name} onChange={(e) => setOpt(i, k, { name: e.target.value })} placeholder="Hotel Tetnuldi" />
                </label>
                <label className="field">
                  <span className="field-label">Budget</span>
                  <select value={o.level} onChange={(e) => setOpt(i, k, { level: Number(e.target.value) })}>
                    {LEVELS.map(([v, mark, label]) => <option key={v} value={v}>{mark} {label}</option>)}
                  </select>
                </label>
                <label className="field">
                  <span className="field-label">Adds (₾)</span>
                  <input type="number" min="0" value={o.price} onChange={(e) => setOpt(i, k, { price: e.target.value })} placeholder="0" />
                </label>
                <label className="field">
                  <span className="field-label">Priced</span>
                  <select value={o.per} onChange={(e) => setOpt(i, k, { per: e.target.value })}>
                    <option value="person">per person</option>
                    <option value="group">once per group</option>
                  </select>
                </label>
              </div>
              <label className="field">
                <span className="field-label">More info (what it is known for)</span>
                <textarea rows={2} value={o.summary} onChange={(e) => setOpt(i, k, { summary: e.target.value })} placeholder="Ski-in hotel by the lift, with a spa and a bar." />
              </label>
              <label className="field">
                <span className="field-label">Tags, comma separated</span>
                <input value={Array.isArray(o.tags) ? o.tags.join(', ') : o.tags} onChange={(e) => setOpt(i, k, { tags: e.target.value })} placeholder="Spa, Pool, Bar" />
              </label>
              <button type="button" className="link-btn" onClick={() => setStep(i, { options: s.options.filter((_, j) => j !== k) })}>Remove option</button>
            </div>
          ))}

          <div className="pkg-edit-actions">
            <button type="button" className="link-btn" onClick={() => setStep(i, { options: [...s.options, blankOption()] })}>+ Add option</button>
            <button type="button" className="link-btn" onClick={() => move(i, -1)} disabled={i === 0}>↑ Up</button>
            <button type="button" className="link-btn" onClick={() => move(i, 1)} disabled={i === steps.length - 1}>↓ Down</button>
            <button type="button" className="link-btn" onClick={() => onChange(steps.filter((_, j) => j !== i))}>Remove step</button>
          </div>
        </div>
      ))}

      <button type="button" className="auth-btn google" onClick={() => onChange([...steps, blankStep()])}>+ Add step</button>
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
