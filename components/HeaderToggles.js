'use client';

// Theme and language switches for the header.
//
// The theme is applied to <html data-theme> by a blocking script in the layout
// before first paint, so there is no flash of the wrong theme. This component
// only reads the value back and flips it.

import { useEffect, useState } from 'react';
import { useT } from '@/lib/i18n';
import { FlagGE, FlagUS } from './Flags';

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

export function LanguageToggle() {
  const { lang, setLang } = useT();
  const toGeorgian = lang === 'en';

  // shows the flag of the language you would switch TO, matching the old
  // "ka" / "EN" labels
  return (
    <button
      type="button"
      className="head-toggle head-flag"
      onClick={() => setLang(toGeorgian ? 'ka' : 'en')}
      title={toGeorgian ? 'ქართული' : 'English'}
      aria-label={toGeorgian ? 'Switch to Georgian' : 'Switch to English'}
    >
      {toGeorgian ? <FlagGE /> : <FlagUS />}
    </button>
  );
}
