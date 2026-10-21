'use client';

// Placeholder copy — the owner will replace it with their own words.

import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { useT } from '@/lib/i18n';

// [title key, text key]
const VALUES = [
  ['about.v1Title', 'about.v1Text'],
  ['about.v2Title', 'about.v2Text'],
  ['about.v3Title', 'about.v3Text'],
];

export default function AboutPage() {
  const { t } = useT();
  return (
    <div className="subpage-shell">
      <SiteHeader solid />
      <main className="info-page">
        <section className="info-hero">
          <img src="/assets/gudauri 1.jpe" alt="" />
          <div className="info-hero-text">
            <span className="tag">{t('nav.about')}</span>
            <h1>{t('about.title')}</h1>
          </div>
        </section>

        <section className="info-body">
          <p className="info-lead">{t('about.lead')}</p>
          <p>{t('about.body')}</p>

          <div className="info-cards">
            {VALUES.map(([title, text]) => (
              <div className="info-card" key={title}>
                <h3>{t(title)}</h3>
                <p>{t(text)}</p>
              </div>
            ))}
          </div>

          <div className="info-cta">
            <Link className="hot-btn" href="/activities?cat=ski">{t('about.ctaWinter')} <span aria-hidden="true">→</span></Link>
            <Link className="auth-link" href="/contact">{t('about.ctaContact')}</Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
