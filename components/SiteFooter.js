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
          <Link href="/tours?cat=ski">Winter</Link><Link href="/tours?cat=hiking">Hikes</Link>
          <Link href="/tours?cat=camping">Camping</Link><Link href="/tours?cat=mountaineering">Mountaineering</Link>
        </div>
        <div><h4>{t('nav.info')}</h4>
          <Link href="/">{t('nav.home')}</Link><Link href="/about">About us</Link>
          <Link href="/faq">FAQ</Link><Link href="/contact">Contact</Link>
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
