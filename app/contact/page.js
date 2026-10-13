'use client';

// Contact details and a short message form. Placeholder details — the owner
// will replace the email, phone and address.
//
// The form has no backend of its own: it opens the visitor's mail app with the
// message already written, so nothing is lost if a webhook is down.

import { useState } from 'react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

const EMAIL = 'hello@torito.ge';

const WAYS = [
  ['Email', EMAIL, `mailto:${EMAIL}`],
  ['Phone & WhatsApp', '+995 000 000 000', 'tel:+995000000000'],
  ['Find us', 'Gudauri, Georgia — winter base', null],
];

export default function ContactPage() {
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');

  function send(e) {
    e.preventDefault();
    const subject = encodeURIComponent(`Question from ${name || 'the website'}`);
    const body = encodeURIComponent(message);
    window.location.href = `mailto:${EMAIL}?subject=${subject}&body=${body}`;
  }

  return (
    <div className="subpage-shell">
      <SiteHeader solid />
      <main className="info-page">
        <section className="info-body">
          <span className="tag">Contact</span>
          <h1 className="info-title">Talk to us</h1>
          <p className="info-lead">
            Questions about a lesson, a date or a group booking? Write to us — we usually
            answer within a few hours. You can also use the chat in the corner of any page.
          </p>

          <div className="contact-grid">
            <div className="info-cards contact-ways">
              {WAYS.map(([label, value, href]) => (
                <div className="info-card" key={label}>
                  <h3>{label}</h3>
                  {href ? <a href={href}>{value}</a> : <p>{value}</p>}
                </div>
              ))}
            </div>

            <form className="info-card contact-form" onSubmit={send}>
              <h3>Send a message</h3>
              <label className="field">
                <span className="field-label">Your name</span>
                <input className="bm-text" value={name} onChange={(e) => setName(e.target.value)} />
              </label>
              <label className="field">
                <span className="field-label">Message *</span>
                <textarea
                  className="bm-text"
                  rows={5}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </label>
              <button type="submit" className="hot-btn" disabled={!message.trim()}>
                Send <span aria-hidden="true">→</span>
              </button>
            </form>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
