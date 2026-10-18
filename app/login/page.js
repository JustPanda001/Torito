'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase, friendlyError } from '@/lib/supabaseClient';

/** Where to go after signing in: back to the trip, if we came from one. */
function nextUrl() {
  const raw = new URLSearchParams(window.location.search).get('next');
  // only same-site paths, so the parameter cannot be used to bounce someone
  // off to another domain
  return raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';
}

export default function LoginPage() {
  const router = useRouter();
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
      setNote({ error: true, text: 'Enter your email and password.' });
      return;
    }

    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);

    if (error) { setNote({ error: true, text: friendlyError(error) }); return; }
    // replace, so Back does not return to the sign-in form
    router.replace(nextUrl());
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <Link className="auth-logo" href="/">
          <img src="/assets/torito-logo.png" alt="Torito — Georgian Ascent Tours" />
          <span>TORITO</span>
        </Link>

        <h1>Sign in to your account</h1>

        <form className="auth-form" onSubmit={onSubmit} noValidate>
          <label className="field">
            <span className="field-label">Email address</span>
            <input type="email" name="email" autoComplete="email" required />
          </label>

          <label className="field">
            <span className="field-label">Password</span>
            <input type="password" name="password" autoComplete="current-password" required />
          </label>

          <div className="auth-row">
            <label className="check">
              <input type="checkbox" name="remember" /><span>Remember me</span>
            </label>
            <Link className="auth-link" href={withNext('/reset')}>Forgot password?</Link>
          </div>

          <button className="auth-btn" type="submit" disabled={busy}>
            {busy ? 'Please wait…' : 'Sign in'}
          </button>

          {note && <p className={`form-note${note.error ? ' error' : ''}`}>{note.text}</p>}
        </form>

        <p className="auth-foot">New here? <Link className="auth-link" href={withNext('/signup')}>Create your account</Link></p>
      </div>
    </main>
  );
}
