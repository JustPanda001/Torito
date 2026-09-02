'use client';

// Shown when a signed-out visitor presses Book.
//
// Booking needs an account: it is how a request stays attached to a person who
// can be replied to, and how they see it again afterwards. The wording leads
// with what happens next rather than telling them off for not being signed in,
// and both routes carry the trip's address so they land back here instead of
// on the home page.

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useT } from '@/lib/i18n';

// `reason` says which button was pressed, so the heading and the first perk
// describe what the visitor was actually trying to do.
export default function SignInGate({ title, reason = 'book', onClose }) {
  const { t } = useT();
  const pathname = usePathname();
  const next = encodeURIComponent(pathname || '/');
  const rating = reason === 'rate';

  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', esc);
    document.body.classList.add('modal-open');
    return () => {
      document.removeEventListener('keydown', esc);
      document.body.classList.remove('modal-open');
    };
  }, [onClose]);

  const perks = rating ? [
    ['calendar', t('gate.perkRate')],
    ['user', t('gate.perkRateName')],
    ['bell', t('gate.perkRateEdit')],
  ] : [
    ['calendar', t('gate.perkTrack')],
    ['user', t('gate.perkDetails')],
    ['bell', t('gate.perkUpdates')],
  ];

  const icons = {
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" /></>,
    bell: <><path d="M18 16V11a6 6 0 1 0-12 0v5l-2 3h16z" /><path d="M10 22h4" /></>,
  };

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="booking-modal prompt-modal" role="dialog" aria-modal="true" aria-labelledby="gateTitle">

        <div className="bm-head">
          <div>
            <h2 id="gateTitle">{rating ? t('gate.titleRate') : t('gate.title')}</h2>
            <p className="bm-sub">{title}</p>
          </div>
          <button type="button" className="bm-close" aria-label="Close" onClick={onClose}>×</button>
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

          <Link className="book-btn" href={`/signup?next=${next}`} onClick={onClose}>
            {t('gate.create')}
          </Link>
          <p className="prompt-foot">
            {t('gate.haveAccount')}{' '}
            <Link className="auth-link" href={`/login?next=${next}`} onClick={onClose}>{t('gate.signIn')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
