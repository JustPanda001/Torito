'use client';

// Theme toggle for the header, and the language picker used by the account menu.
// There is no flag button in the header any more.
//
// The theme is applied to <html data-theme> by a blocking script in the layout
// before first paint, so there is no flash of the wrong theme. This component
// only reads the value back and flips it.

import { useEffect, useState } from 'react';
import { useT } from '@/lib/i18n';
import { FlagGE, FlagUS, FlagRU, FlagCN } from './Flags';

export function ThemeToggle() {
  const { t } = useT();
  const [theme, setTheme] = useState(null);   // null until mounted

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
  }, []);

  function flip() {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('theme', next);
    setTheme(next);
  }

  // render a placeholder until mounted so the server and client markup match
  const dark = theme === 'dark';

  return (
    <button
      type="button"
      className="head-toggle"
      onClick={flip}
      title={dark ? t('theme.toLight') : t('theme.toDark')}
      aria-label={dark ? t('theme.toLight') : t('theme.toDark')}
    >
      {dark ? (
        <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="4.2" />
          <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M20 13.4A8.5 8.5 0 0 1 10.6 4a8.5 8.5 0 1 0 9.4 9.4z" />
        </svg>
      )}
    </button>
  );
}

// Native names, never translated: someone who landed on the wrong language
// must still be able to find their own.
const LANGS = [
  ['en', 'English', FlagUS],
  ['ka', 'ქართული', FlagGE],
  ['ru', 'Русский', FlagRU],
  ['zh', '中文', FlagCN],
];

// t() hands back the key itself when no string exists yet (the translator adds
// them later), so fall back to the English text given here
export function tr(t, key, fallback) {
  const s = t(key);
  return s === key ? fallback : s;
}

// The four-language list, used in the account dropdown.
export function LanguagePicker({ onPick }) {
  const { t, lang, setLang } = useT();
  return (
    <div className="lang-picker" role="group" aria-label={tr(t, 'lang.label', 'Language')}>
      {LANGS.map(([code, name, Flag]) => (
        <button
          key={code}
          type="button"
          className={`lang-opt${lang === code ? ' active' : ''}`}
          aria-pressed={lang === code}
          lang={code === 'zh' ? 'zh-Hans' : code}
          onClick={() => { setLang(code); onPick?.(); }}
        >
          <Flag size={20} />
          <span>{name}</span>
        </button>
      ))}
    </div>
  );
}

// "Language" row inside the account dropdown (signed in and signed out).
export function LanguageRow() {
  const { t } = useT();
  return (
    <div className="lang-row">
      <span className="lang-row-label">{tr(t, 'lang.label', 'Language')}</span>
      <LanguagePicker />
    </div>
  );
}
