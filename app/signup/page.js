'use client';

import { useState } from 'react';
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

export default function SignupPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const password = String(data.get('password'));

    if (password !== String(data.get('confirm'))) {
      setNote({ error: true, text: 'Passwords do not match.' });
      return;
    }
    // checked by hand: the minLength attribute only applies to values the
    // visitor typed, so it misses anything set any other way
    if (password.length < 8) {
      setNote({ error: true, text: 'Password must be at least 8 characters.' });
      return;
    }

    setBusy(true);
    const { data: result, error } = await supabase.auth.signUp({
      email: String(data.get('email')).trim(),
      password,
      options: { data: { full_name: String(data.get('name')).trim() } },
    });
    setBusy(false);

    if (error) { setNote({ error: true, text: friendlyError(error) }); return; }

    // with email confirmation on there is no session until the link is clicked
    if (result.session) router.push(nextUrl());
    else {
      setNote({ error: false, text: 'Account created. Check your email to confirm it, then sign in.' });
      form.reset();
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <Link className="auth-logo" href="/">
          <img src="/assets/torito-logo.png" alt="Torito — Georgian Ascent Tours" />
          <span>TORITO</span>
        </Link>

        <h1>Create your account</h1>

        <form className="auth-form" onSubmit={onSubmit} noValidate>
          <label className="field">
            <span className="field-label">Full name</span>
            <input type="text" name="name" autoComplete="name" required />
          </label>

          <label className="field">
            <span className="field-label">Email address</span>
            <input type="email" name="email" autoComplete="email" required />
          </label>

          <label className="field">
            <span className="field-label">Password</span>
            <input type="password" name="password" autoComplete="new-password" minLength={8} required />
            <span className="field-hint">At least 8 characters</span>
          </label>

          <label className="field">
            <span className="field-label">Confirm password</span>
            <input type="password" name="confirm" autoComplete="new-password" minLength={8} required />
          </label>

          <label className="check">
            <input type="checkbox" name="terms" required />
            <span>I agree to the <Link className="auth-link" href="/tours">terms</Link> and <Link className="auth-link" href="/tours">privacy policy</Link></span>
          </label>

          <button className="auth-btn" type="submit" disabled={busy}>
            {busy ? 'Please wait…' : 'Create account'}
          </button>

          {note && <p className={`form-note${note.error ? ' error' : ''}`}>{note.text}</p>}
        </form>

        <p className="auth-foot">Already have an account? <Link className="auth-link" href="/login">Sign in</Link></p>
      </div>
    </main>
  );
}
