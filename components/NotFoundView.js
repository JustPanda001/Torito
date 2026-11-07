'use client';

// Shared "not found" / "something broke" screen, used by app/not-found.js,
// app/error.js and the trip page. The root layout does not add the site
// chrome by itself, so the header and footer are rendered here.

import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { useT } from '@/lib/i18n';

/** kind: 'page' | 'trip' | 'error'. onRetry only matters for 'error'. */
export default function NotFoundView({ kind = 'page', onRetry }) {
  const { t } = useT();
  const isError = kind === 'error';
  const tag = isError ? t('errors.errorTag') : t('errors.tag');
  const title = isError ? t('errors.errorTitle') : kind === 'trip' ? t('errors.tripTitle') : t('errors.notFoundTitle');
  const text = isError ? t('errors.errorText') : kind === 'trip' ? t('errors.tripText') : t('errors.notFoundText');

  return (
    <div className="subpage-shell">
      <SiteHeader solid />
      <main className="info-page">
        <section className="info-body nf-body">
          <span className="tag">{tag}</span>
          <h1 className="info-title">{title}</h1>
          <p className="info-lead">{text}</p>
          <div className="info-cta">
            {isError && onRetry && (
              <button type="button" className="hot-btn nf-btn" onClick={onRetry}>{t('errors.tryAgain')}</button>
            )}
            <Link className="hot-btn" href="/">{t('errors.goHome')}</Link>
            <Link className="auth-link" href="/activities">{t('errors.browse')} <span aria-hidden="true">→</span></Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

/** Shown while the trip lookup is still running. */
export function TripLoading() {
  const { t } = useT();
  return (
    <div className="subpage-shell">
      <SiteHeader solid />
      <main className="info-page">
        <section className="info-body nf-body">
          <p className="info-lead" role="status" aria-live="polite">{t('errors.loading')}</p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
