'use client';

import Link from 'next/link';
import { useT } from '@/lib/i18n';

export default function SiteFooter() {
  const { t } = useT();
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <img src="/assets/torito-logo.png" alt="" className="footer-logo" />
          <p>{t('footer.tagline')}</p>
        </div>
        <div><h4>{t('footer.explore')}</h4>
          <Link href="/activities?cat=ski">{t('cat.ski')}</Link><Link href="/activities?cat=hiking">{t('cat.hiking')}</Link>
          <Link href="/activities?cat=camping">{t('cat.camping')}</Link><Link href="/activities?cat=mountaineering">{t('cat.mountaineering')}</Link>
          <Link href="/activities?cat=transfer">{t('cat.transfer')}</Link>
        </div>
        <div><h4>{t('nav.info')}</h4>
          <Link href="/">{t('nav.home')}</Link><Link href="/about">{t('nav.about')}</Link>
          <Link href="/faq">{t('nav.faq')}</Link><Link href="/contact">{t('nav.contact')}</Link>
        </div>
        <div><h4>{t('nav.contact')}</h4>
          <a href="mailto:hello@torito.ge">hello@torito.ge</a>
          <a href="tel:+995000000000">+995 000 000 000</a>
          <span>{t('footer.location')}</span>
        </div>
      </div>
      <p className="copyright">© 2026 Torito</p>
    </footer>
  );
}
