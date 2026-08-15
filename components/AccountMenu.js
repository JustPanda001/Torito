'use client';

// Swaps the header "Log in" link for the signed-in user, and reveals the
// Admin link when that user's profile row has role = 'admin'.

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { currentProfile, signOut } from '@/lib/supabaseClient';
import { useT } from '@/lib/i18n';

export default function AccountMenu() {
  const { t } = useT();
  const [profile, setProfile] = useState(null);
  const [open, setOpen] = useState(false);
  const wrap = useRef(null);

  useEffect(() => {
    let alive = true;
    // ?mockuser=admin renders the signed-in menu without a real session, so the
    // dropdown can be checked locally. Dev only — never true in production.
    if (process.env.NODE_ENV !== 'production'
        && typeof window !== 'undefined'
        && new URLSearchParams(window.location.search).has('mockuser')) {
      const role = new URLSearchParams(window.location.search).get('mockuser');
      setProfile({ id: 'mock', full_name: 'Sandro Phkhaladze', email: 'justpanda001@gmail.com', role });
      return () => { alive = false; };
    }
    currentProfile()
      .then((p) => { if (alive) setProfile(p); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  // Close on a click outside the menu. Checking containment rather than relying
  // on stopPropagation: React attaches its handlers at the root, so the native
  // event can still reach a document listener and close the menu on the very
  // click that opened it.
  useEffect(() => {
    if (!open) return undefined;
    const away = (e) => { if (!wrap.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('click', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('click', away);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  if (!profile) {
    return (
      <Link className="icon-btn" href="/login" title={t('nav.login')}>
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
        </svg>
        <span className="hide-sm">{t('nav.login')}</span>
      </Link>
    );
  }

  const name = (profile.full_name || profile.email || 'Account').split(' ')[0];
  const isAdmin = profile.role === 'admin';

  return (
    <div className="account-menu" ref={wrap}>
      <button
        className="icon-btn account-btn"
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
        </svg>
        <span className="hide-sm">{name}</span>
      </button>

      {open && (
        <div className="account-drop" role="menu">
          <div className="account-who">
            <strong>{profile.full_name || name}</strong>
            <span>{profile.email}</span>
          </div>

          {isAdmin && (
            <Link href="/admin" className="admin-link" onClick={() => setOpen(false)}>
              {t('account.adminPanel')}
            </Link>
          )}
          <Link href="/tours" onClick={() => setOpen(false)}>{t('account.myBookings')}</Link>
          <Link href="/reset" onClick={() => setOpen(false)}>{t('account.changePassword')}</Link>

          <button type="button" className="signout" onClick={signOut}>
            {t('account.signOut')}
          </button>
        </div>
      )}
    </div>
  );
}
