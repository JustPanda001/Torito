'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useT } from '@/lib/i18n';

/** Supabase error -> friendly, translated text; anything unknown gets a generic line. */
function authMessage(error, t) {
  const m = String(error?.message ?? error ?? '').toLowerCase();
  if (/failed to fetch|networkerror|load failed|network request failed|not connected/.test(m)) return t('auth.errNetwork');
  if (/invalid login credentials/.test(m)) return t('auth.errInvalid');
  if (/already registered|already been registered|already exists/.test(m)) return t('auth.errExists');
  if (/not confirmed/.test(m)) return t('auth.errUnconfirmed');
  if (error?.status === 429 || /rate limit|too many|security purposes/.test(m)) return t('auth.errRate');
  if (/different from the old/.test(m)) return t('auth.errSamePassword');
  if (/at least \d+ char/.test(m)) return t('auth.errShort');
  if (/weak|easy to guess|pwned/.test(m)) return t('auth.errWeak');
  if (/expired|invalid.*(token|link)|otp/.test(m)) return t('auth.errLinkExpired');
  return t('auth.errGeneric');
}

/** Where to go after signing in: back to the trip, if we came from one. */
function nextUrl() {
  const raw = new URLSearchParams(window.location.search).get('next');
  // only same-site paths, so the parameter cannot be used to bounce someone
  // off to another domain
  return raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';
}

export default function LoginPage() {
  const router = useRouter();
  const { t } = useT();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(null);
  // read after mount, so the server and browser render the same links first
  const [next, setNext] = useState('');
  useEffect(() => {
    const n = nextUrl();
    setNext(n === '/' ? '' : n);
  }, []);
  const withNext = (path) => (next ? `${path}?next=${encodeURIComponent(next)}` : path);

  async function onSubmit(e) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const email = String(data.get('email')).trim();
    const password = String(data.get('password'));

    if (!email || !password) {
      setNote({ error: true, key: 'auth.enterCreds' });
      return;
    }

    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);

    if (error) { setNote({ error: true, err: error }); return; }
    // replace, so Back does not return to the sign-in form
    router.replace(nextUrl());
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <Link className="auth-logo" href="/">
          <img src="/assets/torito-logo.png" alt={t('auth.logoAlt')} />
          <span>TORITO</span>
        </Link>

        <h1>{t('auth.signIn')}</h1>

        <form className="auth-form" onSubmit={onSubmit} noValidate>
          <label className="field">
            <span className="field-label">{t('auth.email')}</span>
            <input type="email" name="email" autoComplete="email" required />
          </label>

          <label className="field">
            <span className="field-label">{t('auth.password')}</span>
            <input type="password" name="password" autoComplete="current-password" required />
          </label>

          <div className="auth-row">
            <label className="check">
              <input type="checkbox" name="remember" /><span>{t('auth.remember')}</span>
            </label>
            <Link className="auth-link" href={withNext('/reset')}>{t('auth.forgot')}</Link>
          </div>

          <button className="auth-btn" type="submit" disabled={busy}>
            {busy ? t('auth.wait') : t('auth.signInBtn')}
          </button>

          {note && <p className={`form-note${note.error ? ' error' : ''}`}>{note.err ? authMessage(note.err, t) : t(note.key)}</p>}
        </form>

        <p className="auth-foot">{t('auth.newHere')} <Link className="auth-link" href={withNext('/signup')}>{t('auth.createAccount')}</Link></p>
      </div>
    </main>
  );
}
