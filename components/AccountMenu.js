'use client';

// Swaps the header "Log in" link for the signed-in user, and reveals the
// Admin link when that user's profile row has role = 'admin'.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { currentProfile, signOut } from '@/lib/supabaseClient';
import { useT } from '@/lib/i18n';

export default function AccountMenu() {
  const { t } = useT();
  const [profile, setProfile] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    currentProfile()
      .then((p) => { if (alive) setProfile(p); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const close = () => setOpen(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  if (!profile) {
    return (
      <Link className="icon-btn" href="/login" title="Log in">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
        </svg>
        <span className="hide-sm">{t('nav.login')}</span>
      </Link>
    );
  }

  const name = (profile.full_name || profile.email || 'Account').split(' ')[0];

  return (
    <div className="account-menu">
      <button
        className="icon-btn account-btn"
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
        </svg>
        <span className="hide-sm">{name}</span>
      </button>

      {open && (
        <div className="account-drop">
          {profile.role === 'admin' && <Link href="/admin" className="admin-link">{t('account.adminPanel')}</Link>}
          <Link href="/tours">{t('account.myBookings')}</Link>
          <Link href="/reset">{t('account.changePassword')}</Link>
          <button type="button" className="signout" onClick={signOut}>{t('account.signOut')}</button>
        </div>
      )}
    </div>
  );
}
