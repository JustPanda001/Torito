'use client';

// The "build your own week" section of a trip page (see lib/packageBuilder.js).
// One step at a time: options from ₾₾₾ to ₾, a "more info" summary with tags
// for each, a budget filter, and a live summary with the price per person.

import { useEffect, useState } from 'react';
import { LEVELS, resolveChoices } from '@/lib/packageBuilder';

const money = (n) => `${Math.round(n).toLocaleString('en-US')} ₾`;

export default function PackageBuilder({ steps, base, choices, onChange, onBook, bookLabel, onClose }) {
  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', esc);
    document.body.classList.add('modal-open');
    return () => {
      document.removeEventListener('keydown', esc);
      document.body.classList.remove('modal-open');
    };
  }, [onClose]);

  const [budget, setBudget] = useState(0); // 0 = every level
  // "step|option" keys whose info is showing; several at once, to compare
  const [open, setOpen] = useState(() => new Set());
  const toggleInfo = (key) => setOpen((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  const pick = (step, name) => {
    const next = { ...choices };
    if (next[step.title] === name && step.optional) delete next[step.title];
    else next[step.title] = name;
    onChange(next);
  };

  const picked = resolveChoices(steps, choices) ?? [];
  const perPerson = Number(base || 0) + picked
    .filter(({ option }) => option.per !== 'group').reduce((s, { option }) => s + option.price, 0);
  const perGroup = picked
    .filter(({ option }) => option.per === 'group').reduce((s, { option }) => s + option.price, 0);
  const missing = steps.filter((s) => !s.optional && !choices[s.title]);

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="pkg pkg-modal" role="dialog" aria-modal="true" aria-labelledby="pkgTitle">
      <button type="button" className="bm-close pkg-close" aria-label="Close" onClick={onClose}>×</button>
      <div className="pkg-head">
        <div>
          <h2 id="pkgTitle">Build your week</h2>
          <p className="lead">Pick one option per step. Optional steps can be skipped; tap again to remove.</p>
        </div>
        <div className="pkg-budget" role="group" aria-label="Budget">
          <button type="button" className={`chip${budget === 0 ? ' active' : ''}`} onClick={() => setBudget(0)}>All</button>
          {LEVELS.map(([v, mark, label]) => (
            <button type="button" key={v} className={`chip${budget === v ? ' active' : ''}`} onClick={() => setBudget(v)} title={mark}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="pkg-layout">
        <ol className="pkg-steps">
          {steps.map((step, si) => {
            const shown = step.options.filter((o) => !budget || o.level === budget || choices[step.title] === o.name);
            return (
              <li className="pkg-step" key={step.title}>
                <h3>
                  <span className="pkg-n">{si + 1}</span>
                  {step.title}
                  {step.optional && <em className="pkg-opt">optional</em>}
                </h3>
                {step.note && <p className="pkg-note">{step.note}</p>}
                <div className="pkg-options">
                  {shown.length === 0 && <p className="pkg-note">Nothing at this budget. Pick “All” to see every option.</p>}
                  {shown.map((o) => {
                    const on = choices[step.title] === o.name;
                    const key = `${step.title}|${o.name}`;
                    return (
                      // the whole card picks the option; "More info" only opens the text
                      <div
                        className={`pkg-card${on ? ' on' : ''}`}
                        key={o.name}
                        role="button"
                        tabIndex={0}
                        aria-pressed={on}
                        onClick={() => pick(step, o.name)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(step, o.name); } }}
                      >
                        <div className="pkg-pick">
                          <span className="opt-dot" aria-hidden="true" />
                          <span className="pkg-name">{o.name}</span>
                          <span className="pkg-price">
                            {o.price ? `+${money(o.price)}` : 'Included'}
                            {o.price > 0 && <small>{o.per === 'group' ? ' / group' : ' / person'}</small>}
                          </span>
                        </div>
                        {(o.summary || o.tags.length > 0) && (
                          <>
                            <button type="button" className="pkg-more" aria-expanded={open.has(key)}
                              onClick={(e) => { e.stopPropagation(); toggleInfo(key); }}
                              onKeyDown={(e) => e.stopPropagation()}>
                              {open.has(key) ? 'Less info' : 'More info'}
                            </button>
                            {open.has(key) && (
                              <div className="pkg-info">
                                {o.summary && <p>{o.summary}</p>}
                                {o.tags.length > 0 && (
                                  <ul className="pkg-tags">{o.tags.map((tag) => <li key={tag}>{tag}</li>)}</ul>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ol>

        <aside className="pkg-summary" aria-live="polite">
          <h3>Your week</h3>
          <div className="bm-line"><span>Base week</span><span>{money(base || 0)}</span></div>
          {picked.map(({ step, option }) => (
            <div className="bm-line" key={step.title}>
              <span>{step.title}<small> · {option.name}</small></span>
              <span>{option.price ? money(option.price) : '—'}</span>
            </div>
          ))}
          <div className="bm-line bm-grand"><span>Per person</span><span>{money(perPerson)}</span></div>
          {perGroup > 0 && <div className="bm-line"><span>Plus, once per group</span><span>{money(perGroup)}</span></div>}
          <button type="button" className="book-btn" disabled={missing.length > 0} onClick={onBook}>
            {missing.length ? `Pick: ${missing.map((s) => s.title).join(', ')}` : bookLabel}
          </button>
          <p className="pkg-note">Pick dates and group size next. Nothing is charged now.</p>
        </aside>
      </div>
    </div>
    </div>
  );
}
