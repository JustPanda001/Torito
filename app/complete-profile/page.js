'use client';

// One extra step after a Google sign-in: Google gives us a name and email but
// no phone, and the owner needs a number to reach every customer. Shown once;
// the number lands on the profile, where the booking form reads it back.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useT } from '@/lib/i18n';
import { DEFAULT_DIAL, phoneDigits } from '@/lib/dial-codes';
import DialSelect from '@/components/DialSelect';

/** Same-site path to continue to afterwards. */
function nextUrl() {
  const raw = new URLSearchParams(window.location.search).get('next');
  return raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';
}

export default function CompleteProfilePage() {
  const router = useRouter();
  const { t } = useT();
  const [userId, setUserId] = useState(null);
  const [dial, setDial] = useState(DEFAULT_DIAL);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace('/login'); return; }
      const { data } = await supabase.from('profiles').select('phone').eq('id', session.user.id).maybeSingle();
      // already has one: nothing to ask
      if (data?.phone && phoneDigits(data.phone).length >= 6) { router.replace(nextUrl()); return; }
      setUserId(session.user.id);
    })();
  }, [router]);

  async function onSubmit(e) {
    e.preventDefault();
    const phone = String(new FormData(e.currentTarget).get('phone')).trim();
    if (phoneDigits(phone).length < 6) { setNote({ error: true, key: 'auth.errPhone' }); return; }

    setBusy(true);
    const { error } = await supabase.from('profiles').update({ phone: `${dial} ${phone}` }).eq('id', userId);
    setBusy(false);
    if (error) { console.error('Saving phone failed:', error.message); setNote({ error: true, key: 'auth.errGeneric' }); return; }
    router.replace(nextUrl());
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <Link className="auth-logo" href="/">
          <img src="/assets/mtani-mark.svg" alt={t('auth.logoAlt')} />
          <span>MTANI</span>
        </Link>

        <h1>{t('auth.phoneTitle')}</h1>
        <p className="form-note">{t('auth.phoneIntro')}</p>

        {userId && (
          <form className="auth-form" onSubmit={onSubmit} noValidate>
            <div className="field">
              <span className="field-label">{t('auth.phone')}</span>
              <div className="bm-phone">
                <DialSelect value={dial} onChange={setDial} />
                {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
                <input name="phone" inputMode="tel" autoComplete="tel" placeholder="599 12 34 56" autoFocus required />
              </div>
              <span className="field-hint">{t('auth.phoneHint')}</span>
            </div>
            <button className="auth-btn" type="submit" disabled={busy}>
              {busy ? t('auth.wait') : t('auth.savePhone')}
            </button>
            {note && <p className={`form-note${note.error ? ' error' : ''}`}>{t(note.key)}</p>}
          </form>
        )}
      </div>
    </main>
  );
}
