'use client';

// Country dial code picker.
//
// A native <select> is sized by the browser from the number of options, and 41
// of them fills the screen top to bottom — there is no CSS that caps it. This
// is the same control built from a button and a list, so the popup can be held
// to a few rows and scroll for the rest.

import { useEffect, useMemo, useRef, useState } from 'react';
import { DIAL_CODES } from '@/lib/dial-codes';
import { localeTag } from '@/lib/season';
import { useT } from '@/lib/i18n';

// dial-codes.js keeps three-letter codes (they are what the closed button
// shows); Intl names countries from the two-letter ones
const ISO2 = {
  GEO: 'GE', ARM: 'AM', AZE: 'AZ', TUR: 'TR', RU: 'RU', KZ: 'KZ', UKR: 'UA', ISR: 'IL',
  UAE: 'AE', SAU: 'SA', POL: 'PL', DEU: 'DE', GBR: 'GB', US: 'US', CA: 'CA', FRA: 'FR',
  ITA: 'IT', ESP: 'ES', NLD: 'NL', CHE: 'CH', AUT: 'AT', SWE: 'SE', NOR: 'NO', DNK: 'DK',
  FIN: 'FI', CZE: 'CZ', HUN: 'HU', ROU: 'RO', GRC: 'GR', PRT: 'PT', IRL: 'IE', BEL: 'BE',
  EST: 'EE', LVA: 'LV', LTU: 'LT', IND: 'IN', CHN: 'CN', JPN: 'JP', KOR: 'KR', AUS: 'AU',
  NZL: 'NZ', ZAF: 'ZA', BRA: 'BR',
};

/** "Georgia" in the visitor's language; "RU/KZ" becomes "Russia / Kazakhstan". */
function useCountryName(lang) {
  return useMemo(() => {
    let names = null;
    try { names = new Intl.DisplayNames([localeTag(lang)], { type: 'region' }); } catch { names = null; }
    return (short, fallback) => {
      if (!names || lang === 'en') return fallback;
      const codes = short.split('/').map((s) => ISO2[s.trim()]);
      if (codes.some((c) => !c)) return fallback;
      try { return codes.map((c) => names.of(c)).join(' / '); } catch { return fallback; }
    };
  }, [lang]);
}

export default function DialSelect({ value, onChange, label }) {
  const { t, lang } = useT();
  const countryName = useCountryName(lang);
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
        aria-label={label ?? t('booking.countryCode')}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{value} · {short}</span>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <ul className="dial-list" role="listbox">
          {DIAL_CODES.map(([code, abbr, country]) => (
            <li key={`${code} ${abbr}`}>
              <button
                type="button"
                className={code === value ? 'active' : undefined}
                role="option"
                aria-selected={code === value}
                onClick={() => { onChange(code); setOpen(false); }}
              >
                <span className="dial-country">{countryName(abbr, country)}</span>
                <span className="dial-code">{code}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
