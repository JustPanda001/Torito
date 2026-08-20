'use client';

// Country dial code picker.
//
// A native <select> is sized by the browser from the number of options, and 41
// of them fills the screen top to bottom — there is no CSS that caps it. This
// is the same control built from a button and a list, so the popup can be held
// to a few rows and scroll for the rest.

import { useEffect, useRef, useState } from 'react';
import { DIAL_CODES } from '@/lib/dial-codes';

export default function DialSelect({ value, onChange, label = 'Country code' }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef(null);
  const short = DIAL_CODES.find(([code]) => code === value)?.[1] ?? '';

  useEffect(() => {
    if (!open) return undefined;
    // containment rather than stopPropagation: React listens at the root, so a
    // native document listener still sees the click that opened the menu
    const away = (e) => { if (!wrap.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('click', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('click', away);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  return (
    <div className="dial-select" ref={wrap}>
      <button
        type="button"
        className="dial-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{value} · {short}</span>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <ul className="dial-list" role="listbox">
          {DIAL_CODES.map(([code, short, country]) => (
            <li key={`${code} ${short}`}>
              <button
                type="button"
                className={code === value ? 'active' : undefined}
                role="option"
                aria-selected={code === value}
                onClick={() => { onChange(code); setOpen(false); }}
              >
                <span className="dial-country">{country}</span>
                <span className="dial-code">{code}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
