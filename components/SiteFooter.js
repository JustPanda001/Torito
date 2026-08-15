'use client';

import Link from 'next/link';
import { useT } from '@/lib/i18n';

export default function SiteFooter() {
  const { t } = useT();
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div>
          <img src="/assets/torito-logo.png" alt="" className="footer-logo" />
          <p>{t('footer.tagline')}</p>
        </div>
        <div><h4>{t('footer.explore')}</h4>
          <Link href="/tours">Tours</Link><Link href="/tours">Hikes</Link>
          <Link href="/tours">Ski &amp; snowboard</Link><Link href="/tours">Camping</Link>
        </div>
        <div><h4>{t('nav.info')}</h4>
          <Link href="/">{t('nav.home')}</Link><Link href="/tours">About us</Link>
          <Link href="/tours">FAQ</Link><Link href="/tours">Terms</Link>
        </div>
        <div><h4>{t('nav.contact')}</h4>
          <a href="mailto:hello@torito.ge">hello@torito.ge</a>
          <a href="tel:+995000000000">+995 000 000 000</a>
          <span>Tbilisi, Georgia</span>
        </div>
      </div>
      <p className="copyright">© 2026 Torito</p>
    </footer>
  );
}
