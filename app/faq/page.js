'use client';

// Frequently asked questions. Placeholder answers — the owner will edit them.

import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { useT } from '@/lib/i18n';

// question n lives at faq.q<n>, its answer at faq.a<n>
const FAQ_COUNT = 8;
const FAQ = Array.from({ length: FAQ_COUNT }, (_, i) => [`faq.q${i + 1}`, `faq.a${i + 1}`]);

export default function FaqPage() {
  const { t } = useT();
  return (
    <div className="subpage-shell">
      <SiteHeader solid />
      <main className="info-page">
        <section className="info-body">
          <span className="tag">{t('faq.tag')}</span>
          <h1 className="info-title">{t('faq.title')}</h1>
          <p className="info-lead">{t('faq.lead')}</p>

          <div className="faq-list">
            {FAQ.map(([q, a]) => (
              <details className="faq-item" key={q}>
                <summary>{t(q)}</summary>
                <p>{t(a)}</p>
              </details>
            ))}
          </div>

          <div className="info-cta">
            <Link className="hot-btn" href="/contact">{t('faq.still')} <span aria-hidden="true">→</span></Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
