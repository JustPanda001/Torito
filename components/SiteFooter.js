'use client';

import Link from 'next/link';
import { useT } from '@/lib/i18n';
import MtaniLogo from './MtaniLogo';

export default function SiteFooter() {
  const { t } = useT();
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <MtaniLogo tagline className="footer-logo" />
          <p>{t('footer.tagline')}</p>
        </div>
        <div><h4>{t('footer.explore')}</h4>
          <Link href="/activities?cat=ski">{t('cat.ski')}</Link><Link href="/activities?cat=hiking">{t('cat.hiking')}</Link>
          <Link href="/activities?cat=camping">{t('cat.camping')}</Link><Link href="/activities?cat=mountaineering">{t('cat.mountaineering')}</Link>
        </div>
        <div><h4>{t('nav.info')}</h4>
          <Link href="/">{t('nav.home')}</Link><Link href="/about">{t('nav.about')}</Link>
          <Link href="/faq">{t('nav.faq')}</Link><Link href="/contact">{t('nav.contact')}</Link>
          <Link href="/terms">{t('legal.terms.tag')}</Link><Link href="/privacy">{t('legal.privacy.tag')}</Link>
        </div>
        <div><h4>{t('nav.contact')}</h4>
          <a href="mailto:support@mtani.ge">support@mtani.ge</a>
          <a href="tel:+995000000000">+995 000 000 000</a>
          <span>{t('footer.location')}</span>
        </div>
      </div>
      <p className="copyright">© 2026 MTANI</p>
    </footer>
  );
}
