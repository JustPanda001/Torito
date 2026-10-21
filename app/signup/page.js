'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useT } from '@/lib/i18n';
import { DEFAULT_DIAL, phoneDigits } from '@/lib/dial-codes';
import DialSelect from '@/components/DialSelect';

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

export default function SignupPage() {
  const router = useRouter();
  const { t } = useT();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(null);
  const [dial, setDial] = useState(DEFAULT_DIAL);
  // read after mount, so the server and browser render the same links first
  const [next, setNext] = useState('');
  useEffect(() => {
    const n = nextUrl();
    setNext(n === '/' ? '' : n);
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const password = String(data.get('password'));

    if (password !== String(data.get('confirm'))) {
      setNote({ error: true, key: 'auth.errMismatch' });
      return;
    }
    // checked by hand: the minLength attribute only applies to values the
    // visitor typed, so it misses anything set any other way
    if (password.length < 8) {
      setNote({ error: true, key: 'auth.errShort' });
      return;
    }
    if (!String(data.get('name')).trim()) {
      setNote({ error: true, key: 'auth.errName' });
      return;
    }
    if (!data.get('terms')) {
      setNote({ error: true, key: 'auth.errTerms' });
      return;
    }
    const phone = String(data.get('phone')).trim();
    if (phoneDigits(phone).length < 6) {
      setNote({ error: true, key: 'auth.errPhone' });
      return;
    }

    setBusy(true);
    const { data: result, error } = await supabase.auth.signUp({
      email: String(data.get('email')).trim(),
      password,
      // both land on the profile row through the handle_new_user trigger, so
      // the booking form can read them back instead of asking again
      options: {
        // the confirmation link brings them back to where they started
        emailRedirectTo: `${window.location.origin}${nextUrl()}`,
        data: {
          full_name: String(data.get('name')).trim(),
          phone: `${dial} ${phone}`,
        },
      },
    });
    setBusy(false);

    if (error) { setNote({ error: true, err: error }); return; }

    // with email confirmation on there is no session until the link is clicked
    if (result.session) router.replace(nextUrl());
    else {
      const trip = nextUrl().startsWith('/activities/');
      setNote({
        error: false,
        key: trip ? 'auth.signupDoneTrip' : 'auth.signupDoneHere',
      });
      form.reset();
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <Link className="auth-logo" href="/">
          <img src="/assets/torito-logo.png" alt={t('auth.logoAlt')} />
          <span>TORITO</span>
        </Link>

        <h1>{t('auth.createAccount')}</h1>

        <form className="auth-form" onSubmit={onSubmit} noValidate>
          <label className="field">
            <span className="field-label">{t('auth.fullName')}</span>
            <input type="text" name="name" autoComplete="name" required />
          </label>

          <label className="field">
            <span className="field-label">{t('auth.email')}</span>
            <input type="email" name="email" autoComplete="email" required />
          </label>

          <div className="field">
            <span className="field-label">{t('auth.phone')}</span>
            <div className="bm-phone">
              <DialSelect value={dial} onChange={setDial} />
              <input name="phone" inputMode="tel" autoComplete="tel" placeholder="599 12 34 56" required />
            </div>
            <span className="field-hint">{t('auth.phoneHint')}</span>
          </div>

          <label className="field">
            <span className="field-label">{t('auth.password')}</span>
            <input type="password" name="password" autoComplete="new-password" minLength={8} required />
            <span className="field-hint">{t('auth.passwordHint')}</span>
          </label>

          <label className="field">
            <span className="field-label">{t('auth.confirm')}</span>
            <input type="password" name="confirm" autoComplete="new-password" minLength={8} required />
          </label>

          <label className="check">
            <input type="checkbox" name="terms" required />
            <span>{t('auth.agree').split(/(\{terms\}|\{privacy\})/).map((part, i) => (
              part === '{terms}' ? <Link key={i} className="auth-link" href="/activities">{t('auth.terms')}</Link>
                : part === '{privacy}' ? <Link key={i} className="auth-link" href="/activities">{t('auth.privacy')}</Link>
                : part
            ))}</span>
          </label>

          <button className="auth-btn" type="submit" disabled={busy}>
            {busy ? t('auth.wait') : t('auth.createBtn')}
          </button>

          {note && <p className={`form-note${note.error ? ' error' : ''}`}>{note.err ? authMessage(note.err, t) : t(note.key)}</p>}
        </form>

        <p className="auth-foot">{t('auth.haveAccount')} <Link className="auth-link" href={next ? `/login?next=${encodeURIComponent(next)}` : '/login'}>{t('auth.signInBtn')}</Link></p>
      </div>
    </main>
  );
}
