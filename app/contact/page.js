'use client';

// Contact details and a short message form. Placeholder details — the owner
// will replace the email, phone and address.
//
// The form has no backend of its own: it opens the visitor's mail app with the
// message already written, so nothing is lost if a webhook is down.

import { useState } from 'react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { useT } from '@/lib/i18n';

const EMAIL = 'hello@torito.ge';

// [label key, value (or value key), href, value is a key?]
const WAYS = [
  ['contact.email', EMAIL, `mailto:${EMAIL}`, false],
  ['contact.phone', '+995 000 000 000', 'tel:+995000000000', false],
  ['contact.find', 'contact.findValue', null, true],
];

export default function ContactPage() {
  const { t } = useT();
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');

  function send(e) {
    e.preventDefault();
    // the subject is read by our team, not the visitor, so it stays in English
    const subject = encodeURIComponent(`Question from ${name || 'the website'}`);
    const body = encodeURIComponent(message);
    window.location.href = `mailto:${EMAIL}?subject=${subject}&body=${body}`;
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
                <input className="bm-text" value={name} onChange={(e) => setName(e.target.value)} />
              </label>
              <label className="field">
                <span className="field-label">{t('contact.message')}</span>
                <textarea
                  className="bm-text"
                  rows={5}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </label>
              <button type="submit" className="hot-btn" disabled={!message.trim()}>
                {t('contact.send')} <span aria-hidden="true">→</span>
              </button>
            </form>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
