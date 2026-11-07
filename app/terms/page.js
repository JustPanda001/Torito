'use client';

// terms page. All text lives in lib/strings/legal.js (en, ka, ru, zh).

import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { useT } from '@/lib/i18n';

// Change the company name here (one place per page).
const COMPANY = 'MTANI';
const EMAIL = 'hello@mtani.ge';
const ENTITY = '[TODO: legal entity name, registration number and registered address]';
const RETENTION = '[TODO: confirm how long account and booking data are kept]';
const LAW = '[TODO: governing law and court]';

const SECTIONS = 9;

export default function LegalPage() {
  const { t } = useT();
  const fill = (s) => s
    .replaceAll('{company}', COMPANY)
    .replaceAll('{email}', EMAIL)
    .replaceAll('{entity}', ENTITY)
    .replaceAll('{retentionTodo}', RETENTION)
    .replaceAll('{law}', LAW);
  const k = (id) => fill(t(`legal.terms.${id}`));

  return (
    <div className="subpage-shell">
      <SiteHeader solid />
      <main className="info-page">
        <section className="info-body">
          <span className="tag">{k('tag')}</span>
          <h1 className="info-title">{k('title')}</h1>
          <p className="info-lead">{k('lead')}</p>
          <p className="legal-updated">{t('legal.updated')}</p>

          {Array.from({ length: SECTIONS }, (_, i) => (
            <div className="legal-sec" key={i}>
              <h2>{k(`s${i + 1}h`)}</h2>
              {k(`s${i + 1}p`).split('\n\n').map((para, j) => <p key={j}>{para}</p>)}
            </div>
          ))}

          <div className="info-cta">
            <Link className="hot-btn" href="/">{t('legal.back')} <span aria-hidden="true">→</span></Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
