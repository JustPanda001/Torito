'use client';

// Password reset and change.
//
//   * not signed in, no link      -> ask for an email, send a recovery link
//   * arrived on a recovery link  -> set a new password
//   * already signed in           -> set a new password
//
// Supabase turns the token in the recovery link into a session on load, which
// is what lets updateUser() change the password without the old one.

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

/** Where they were headed before they hit "forgot password", if anywhere. */
function nextUrl() {
  const raw = new URLSearchParams(window.location.search).get('next');
  // only same-site paths, so the parameter cannot be used to bounce someone
  // off to another domain
  return raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';
}

export default function ResetPage() {
  const router = useRouter();
  const { t } = useT();
  // read after mount, so the server and browser render the same links first
  const [next, setNext] = useState('');
  const [mode, setMode] = useState('checking');   // checking | request | update | done
  // { key, vars } rather than text, so it follows a language change
  const [intro, setIntro] = useState(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(null);

  const loginHref = next ? `/login?next=${encodeURIComponent(next)}` : '/login';

  useEffect(() => {
    const n = nextUrl();
    setNext(n === '/' ? '' : n);
    // the recovery token arrives in the URL fragment; supabase consumes it
    // asynchronously, so listen for the event rather than reading the hash once
    const recovery = typeof window !== 'undefined' && window.location.hash.includes('type=recovery');

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('update');
        setIntro({ key: 'auth.introNew' });
      }
    });

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session || recovery) {
        setMode('update');
        setIntro(session && !recovery
          ? { key: 'auth.introSigned', vars: { email: session.user.email } }
          : { key: 'auth.introNew' });
      } else {
        setMode('request');
        setIntro({ key: 'auth.introRequest' });
      }
    })();

    return () => sub.subscription.unsubscribe();
  }, []);

  async function sendLink(e) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get('email')).trim();
    if (!email) { setNote({ error: true, key: 'auth.errEmailReset' }); return; }

    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      // keep `next` through the emailed link too
      redirectTo: `${window.location.origin}/reset${next ? `?next=${encodeURIComponent(next)}` : ''}`,
    });
    setBusy(false);

    if (error) { setNote({ error: true, err: error }); return; }
    // deliberately the same message either way, so this form cannot be used to
    // find out who has an account
    setNote({ error: false, key: 'auth.resetSent' });
  }

  async function savePassword(e) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const password = String(data.get('password'));

    if (password !== String(data.get('confirm'))) {
      setNote({ error: true, key: 'auth.errMismatch' });
      return;
    }
    if (password.length < 8) {
      setNote({ error: true, key: 'auth.errShort' });
      return;
    }

    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);

    if (error) { setNote({ error: true, err: error }); return; }

    setMode('done');
    setIntro({ key: 'auth.changedGo' });
    setTimeout(() => router.push(loginHref), 2500);
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <Link className="auth-logo" href="/">
          <img src="/assets/torito-logo.png" alt={t('auth.logoAlt')} />
          <span>TORITO</span>
        </Link>

        <h1>{mode === 'request' ? t('auth.resetTitle') : mode === 'done' ? t('auth.doneTitle') : t('auth.newTitle')}</h1>
        {intro && <p className="form-note">{t(intro.key, intro.vars)}</p>}

        {mode === 'request' && (
          <form className="auth-form" onSubmit={sendLink} noValidate>
            <label className="field">
              <span className="field-label">{t('auth.email')}</span>
              <input type="email" name="email" autoComplete="email" required />
            </label>
            <button className="auth-btn" type="submit" disabled={busy}>
              {busy ? t('auth.wait') : t('auth.sendLink')}
            </button>
            {note && <p className={`form-note${note.error ? ' error' : ''}`}>{note.err ? authMessage(note.err, t) : t(note.key)}</p>}
          </form>
        )}

        {mode === 'update' && (
          <form className="auth-form" onSubmit={savePassword} noValidate>
            <label className="field">
              <span className="field-label">{t('auth.newPassword')}</span>
              <input type="password" name="password" autoComplete="new-password" minLength={8} required />
              <span className="field-hint">{t('auth.newPasswordHint')}</span>
            </label>
            <label className="field">
              <span className="field-label">{t('auth.confirmNew')}</span>
              <input type="password" name="confirm" autoComplete="new-password" minLength={8} required />
            </label>
            <button className="auth-btn" type="submit" disabled={busy}>
              {busy ? t('auth.wait') : t('auth.saveNew')}
            </button>
            {note && <p className={`form-note${note.error ? ' error' : ''}`}>{note.err ? authMessage(note.err, t) : t(note.key)}</p>}
          </form>
        )}

        <p className="auth-foot"><Link className="auth-link" href={loginHref}>{t('auth.backToSignIn')}</Link></p>
      </div>
    </main>
  );
}
