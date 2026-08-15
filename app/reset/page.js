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
import { supabase, friendlyError } from '@/lib/supabaseClient';

export default function ResetPage() {
  const router = useRouter();
  const [mode, setMode] = useState('checking');   // checking | request | update | done
  const [intro, setIntro] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(null);

  useEffect(() => {
    // the recovery token arrives in the URL fragment; supabase consumes it
    // asynchronously, so listen for the event rather than reading the hash once
    const recovery = typeof window !== 'undefined' && window.location.hash.includes('type=recovery');

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('update');
        setIntro('Choose a new password for your account.');
      }
    });

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session || recovery) {
        setMode('update');
        setIntro(session && !recovery
          ? `Signed in as ${session.user.email}. Enter a new password below.`
          : 'Choose a new password for your account.');
      } else {
        setMode('request');
        setIntro('Enter your email and we will send you a link to set a new password.');
      }
    })();

    return () => sub.subscription.unsubscribe();
  }, []);

  async function sendLink(e) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get('email')).trim();
    if (!email) { setNote({ error: true, text: 'Enter the email address on your account.' }); return; }

    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset`,
    });
    setBusy(false);

    if (error) { setNote({ error: true, text: friendlyError(error) }); return; }
    // deliberately the same message either way, so this form cannot be used to
    // find out who has an account
    setNote({ error: false, text: 'If that address has an account, a reset link is on its way. Check your inbox.' });
  }

  async function savePassword(e) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const password = String(data.get('password'));

    if (password !== String(data.get('confirm'))) {
      setNote({ error: true, text: 'Passwords do not match.' });
      return;
    }
    if (password.length < 8) {
      setNote({ error: true, text: 'Password must be at least 8 characters.' });
      return;
    }

    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);

    if (error) { setNote({ error: true, text: friendlyError(error) }); return; }

    setMode('done');
    setIntro('Your password has been changed. Taking you to sign in…');
    setTimeout(() => router.push('/login'), 2500);
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <Link className="auth-logo" href="/">
          <img src="/assets/torito-logo.png" alt="Torito — Georgian Ascent Tours" />
          <span>TORITO</span>
        </Link>

        <h1>{mode === 'request' ? 'Reset your password' : mode === 'done' ? 'Password updated' : 'Set a new password'}</h1>
        {intro && <p className="form-note">{intro}</p>}

        {mode === 'request' && (
          <form className="auth-form" onSubmit={sendLink} noValidate>
            <label className="field">
              <span className="field-label">Email address</span>
              <input type="email" name="email" autoComplete="email" required />
            </label>
            <button className="auth-btn" type="submit" disabled={busy}>
              {busy ? 'Please wait…' : 'Email me a reset link'}
            </button>
            {note && <p className={`form-note${note.error ? ' error' : ''}`}>{note.text}</p>}
          </form>
        )}

        {mode === 'update' && (
          <form className="auth-form" onSubmit={savePassword} noValidate>
            <label className="field">
              <span className="field-label">New password</span>
              <input type="password" name="password" autoComplete="new-password" minLength={8} required />
              <span className="field-hint">At least 8 characters. Use a password manager if you can.</span>
            </label>
            <label className="field">
              <span className="field-label">Confirm new password</span>
              <input type="password" name="confirm" autoComplete="new-password" minLength={8} required />
            </label>
            <button className="auth-btn" type="submit" disabled={busy}>
              {busy ? 'Please wait…' : 'Save new password'}
            </button>
            {note && <p className={`form-note${note.error ? ' error' : ''}`}>{note.text}</p>}
          </form>
        )}

        <p className="auth-foot"><Link className="auth-link" href="/login">Back to sign in</Link></p>
      </div>
    </main>
  );
}
