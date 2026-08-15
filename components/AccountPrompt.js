'use client';

// Shown when a signed-out visitor taps the heart. Framed around what an account
// gets them rather than scolding them for not having one.

import { useEffect } from 'react';
import Link from 'next/link';
import { useFavorites } from '@/lib/favorites';
import { useT } from '@/lib/i18n';

export default function AccountPrompt() {
  const { prompt, closePrompt } = useFavorites();
  const { t } = useT();

  useEffect(() => {
    if (!prompt) return undefined;
    const esc = (e) => { if (e.key === 'Escape') closePrompt(); };
    document.addEventListener('keydown', esc);
    document.body.classList.add('modal-open');
    return () => {
      document.removeEventListener('keydown', esc);
      document.body.classList.remove('modal-open');
    };
  }, [prompt, closePrompt]);

  if (!prompt) return null;

  const perks = [
    ['heart', t('prompt.perkSave')],
    ['calendar', t('prompt.perkBook')],
    ['bell', t('prompt.perkSeason')],
  ];

  const icons = {
    heart: <path d="M12 20s-7-4.6-7-9.4A4 4 0 0 1 12 8a4 4 0 0 1 7-2.6c0 4.8-7 9.4-7 9.4z" />,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
    bell: <><path d="M18 16V11a6 6 0 1 0-12 0v5l-2 3h16z" /><path d="M10 22h4" /></>,
  };

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) closePrompt(); }}>
      <div className="booking-modal prompt-modal" role="dialog" aria-modal="true" aria-labelledby="promptTitle">

        <div className="bm-head">
          <div>
            <h2 id="promptTitle">{t('prompt.title')}</h2>
            <p className="bm-sub">{t('prompt.sub')}</p>
          </div>
          <button type="button" className="bm-close" aria-label="Close" onClick={closePrompt}>×</button>
        </div>

        <div className="bm-body">
          <ul className="prompt-perks">
            {perks.map(([key, text]) => (
              <li key={key}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
                  {icons[key]}
                </svg>
                <span>{text}</span>
              </li>
            ))}
          </ul>

          <Link className="book-btn" href="/signup" onClick={closePrompt}>
            {t('prompt.create')}
          </Link>
          <p className="prompt-foot">
            {t('prompt.haveAccount')}{' '}
            <Link className="auth-link" href="/login" onClick={closePrompt}>{t('prompt.signIn')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
