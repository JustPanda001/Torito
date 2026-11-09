'use client';

// "Continue with Google / Apple" for the login and signup pages.
//
// Each button only shows once its provider is switched on: Supabase needs the
// provider set up first (Authentication → Sign In / Providers), and these flags
// in Vercel say it is ready. Without them nothing renders, so a half-finished
// setup never shows visitors a button that fails.
//   NEXT_PUBLIC_GOOGLE_SIGNIN=1
//   NEXT_PUBLIC_APPLE_SIGNIN=1
//
// Supabase sends the visitor to the provider and back to `next`; the client
// picks the session up from the URL on arrival. A first sign-in creates the
// account (the handle_new_user trigger makes the profile from the provider's
// name), so this is both sign-in and sign-up.

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useT } from '@/lib/i18n';

const GOOGLE = process.env.NEXT_PUBLIC_GOOGLE_SIGNIN === '1';
const APPLE = process.env.NEXT_PUBLIC_APPLE_SIGNIN === '1';
// The web client ID from Google Cloud (Google Auth Platform → Clients). Not a
// secret: it is sent to every visitor's browser by design.
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  || '768346774799-plt823vofi4n23ffiitec5cmnjqumn0b.apps.googleusercontent.com';

/** Loads Google's sign-in script once. */
function loadGsi(hl) {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!window.__gsiLoading) {
    window.__gsiLoading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = `https://accounts.google.com/gsi/client?hl=${encodeURIComponent(hl || 'en')}`;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => { window.__gsiLoading = null; reject(new Error('gsi load failed')); };
      document.head.appendChild(s);
    });
  }
  return window.__gsiLoading;
}

/** Random nonce, and its SHA-256 hex for Google (Supabase checks the pair). */
async function makeNonce() {
  const raw = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  const hex = [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return { raw, hex };
}

/**
 * Google's own button (Google Identity Services). It runs on mtani.ge, so the
 * Google screen says "mtani.ge" rather than the database's supabase.co
 * address; the ID token it returns is handed to Supabase to sign in.
 */
function GoogleButton({ next, onError }) {
  const router = useRouter();
  const { t, lang } = useT();
  const box = useRef(null);

  useEffect(() => {
    let alive = true;
    // dark site -> Google's dark button; drawn again when the theme changes
    const draw = () => {
      if (!alive || !box.current || !window.google?.accounts?.id) return;
      box.current.innerHTML = '';
      // Google's button is laid invisibly over our own, so the click is
      // Google's (it has to be) while the look is ours in every theme
      window.google.accounts.id.renderButton(box.current, {
        type: 'standard', theme: 'outline', size: 'large', shape: 'pill',
        text: 'continue_with',
        width: Math.max(200, Math.min(400, Math.floor(box.current.clientWidth))),
        locale: lang || 'en',
      });
    };
    (async () => {
      try {
        await loadGsi(lang);
        const nonce = await makeNonce();
        if (!alive || !box.current) return;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          nonce: nonce.hex,
          use_fedcm_for_prompt: true,
          callback: async ({ credential }) => {
            const { error } = await supabase.auth.signInWithIdToken({
              provider: 'google', token: credential, nonce: nonce.raw,
            });
            if (error) { console.error('Google sign-in failed:', error.message); onError(); return; }
            // Google gives no phone: the next page asks once, then moves on
            router.replace(`/complete-profile?next=${encodeURIComponent(next || '/')}`);
          },
        });
        draw();
      } catch (e) {
        console.error(e);
        if (alive) onError();
      }
    })();
    return () => { alive = false; };
  }, [next, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="google-wrap">
      <div className="social-btn" aria-hidden="true">
        <GoogleG />
        <span>{t('auth.google')}</span>
      </div>
      <div ref={box} className="google-gsi" />
    </div>
  );
}

const GoogleG = () => (
  <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);

const AppleIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
    <path d="M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8 1.6 0 2 .8 3.4.8 1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9 0 0-2.7-1-2.7-4.1zM13.9 5c.7-.9 1.2-2 1.1-3.2-1 0-2.3.7-3 1.6-.7.8-1.2 2-1.1 3.1 1.1.1 2.3-.6 3-1.5z" />
  </svg>
);

/** `next` is the same-site path to come back to after the provider. */
export default function SocialSignIn({ next = '/' }) {
  const { t } = useT();
  const [busy, setBusy] = useState('');
  const [failed, setFailed] = useState(false);

  if (!GOOGLE && !APPLE) return null;

  async function go(provider) {
    setBusy(provider);
    setFailed(false);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}${next || '/'}` },
    });
    // on success the browser is already leaving for the provider
    if (error) {
      console.error('OAuth sign-in failed:', error.message);
      setBusy('');
      setFailed(true);
    }
  }

  return (
    <div className="social-signin">
      {GOOGLE && <GoogleButton next={next} onError={() => setFailed(true)} />}
      {APPLE && (
        <button type="button" className="social-btn social-apple" onClick={() => go('apple')} disabled={!!busy}>
          <AppleIcon />
          <span>{busy === 'apple' ? t('auth.wait') : t('auth.apple')}</span>
        </button>
      )}
      {failed && <p className="form-note error">{t('auth.errGeneric')}</p>}
      <p className="social-note">{t('auth.socialNote').split(/(\{terms\}|\{privacy\})/).map((part, i) => (
        part === '{terms}' ? <Link key={i} className="auth-link" href="/terms">{t('auth.terms')}</Link>
          : part === '{privacy}' ? <Link key={i} className="auth-link" href="/privacy">{t('auth.privacy')}</Link>
          : part
      ))}</p>
      <div className="social-or"><span>{t('auth.or')}</span></div>
    </div>
  );
}
