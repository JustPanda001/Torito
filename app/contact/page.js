'use client';

// Contact details and a short message form. Placeholder details — the owner
// will replace the email, phone and address.
//
// The form posts to /api/contact, which emails the team (Reply-To is the
// visitor). Sending needs an account; a signed-out visitor is shown the
// sign-in prompt instead.

import { useEffect, useState } from 'react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import SignInGate from '@/components/SignInGate';
import { supabase } from '@/lib/supabaseClient';
import { useT } from '@/lib/i18n';

const EMAIL = 'support@mtani.ge';
const DRAFT_KEY = 'contactDraft';

// [label key, value (or value key), href, value is a key?]
const WAYS = [
  ['contact.email', EMAIL, `mailto:${EMAIL}`, false],
  ['contact.phone', '+995 000 000 000', 'tel:+995000000000', false],
  ['contact.find', 'contact.findValue', null, true],
];

export default function ContactPage() {
  const { t, lang } = useT();
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [gate, setGate] = useState(false);
  const [busy, setBusy] = useState(false);
  // { kind: 'ok' | 'error', text }
  const [status, setStatus] = useState(null);

  // bring back a draft saved before the visitor went off to sign in
  useEffect(() => {
    try {
      const draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? 'null');
      if (draft && typeof draft === 'object') {
        if (typeof draft.name === 'string') setName(draft.name.slice(0, 80));
        if (typeof draft.message === 'string') setMessage(draft.message.slice(0, 2000));
      }
    } catch { /* no storage or bad draft */ }
  }, []);

  async function send(e) {
    e.preventDefault();
    if (busy) return;
    setStatus(null);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      // keep what they typed through the sign-in round trip
      try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ name, message })); } catch { /* storage blocked */ }
      setStatus({ kind: 'error', text: t('contact.signInFirst') });
      setGate(true);
      return;
    }

    setBusy(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ name: name.trim(), message: message.trim(), lang }),
      });
      if (res.ok) {
        setMessage('');
        try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* storage blocked */ }
        setStatus({ kind: 'ok', text: t('contact.sent') });
      } else if (res.status === 401) {
        try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ name, message })); } catch { /* storage blocked */ }
        setStatus({ kind: 'error', text: t('contact.signInFirst') });
        setGate(true);
      } else if (res.status === 429) {
        setStatus({ kind: 'error', text: t('contact.tooMany') });
      } else {
        setStatus({ kind: 'error', text: t('contact.error') });
      }
    } catch {
      setStatus({ kind: 'error', text: t('contact.error') });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="subpage-shell">
      <SiteHeader solid />
      <main className="info-page">
        <section className="info-body">
          <span className="tag">{t('nav.contact')}</span>
          <h1 className="info-title">{t('contact.title')}</h1>
          <p className="info-lead">{t('contact.lead')}</p>

          <div className="contact-grid">
            <div className="info-cards contact-ways">
              {WAYS.map(([label, value, href, isKey]) => (
                <div className="info-card" key={label}>
                  <h3>{t(label)}</h3>
                  {href ? <a href={href}>{value}</a> : <p>{isKey ? t(value) : value}</p>}
                </div>
              ))}
            </div>

            <form className="info-card contact-form" onSubmit={send}>
              <h3>{t('contact.sendTitle')}</h3>
              <label className="field">
                <span className="field-label">{t('contact.yourName')}</span>
                <input className="bm-text" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
              </label>
              <label className="field">
                <span className="field-label">{t('contact.message')}</span>
                <textarea
                  className="bm-text"
                  rows={5}
                  required
                  maxLength={2000}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </label>
              {status && (
                <p className={`bm-note ${status.kind}`} role={status.kind === 'error' ? 'alert' : 'status'}>
                  {status.text}
                </p>
              )}
              <button type="submit" className="hot-btn" disabled={busy || !message.trim()}>
                {busy ? t('contact.sending') : t('contact.send')} <span aria-hidden="true">→</span>
              </button>
            </form>
          </div>
        </section>
      </main>
      {gate && <SignInGate title={t('contact.sendTitle')} reason="contact" onClose={() => setGate(false)} />}
      <SiteFooter />
    </div>
  );
}
