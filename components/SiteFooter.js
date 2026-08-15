import Link from 'next/link';

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div>
          <img src="/assets/torito-logo.png" alt="" className="footer-logo" />
          <p>Tours, hikes, ski instructors and camping across Georgia.</p>
        </div>
        <div><h4>Explore</h4>
          <Link href="/tours">Tours</Link><Link href="/tours">Hikes</Link>
          <Link href="/tours">Ski &amp; snowboard</Link><Link href="/tours">Camping</Link>
        </div>
        <div><h4>Info</h4>
          <Link href="/">Home</Link><Link href="/tours">About us</Link>
          <Link href="/tours">FAQ</Link><Link href="/tours">Terms</Link>
        </div>
        <div><h4>Contact</h4>
          <a href="mailto:hello@torito.ge">hello@torito.ge</a>
          <a href="tel:+995000000000">+995 000 000 000</a>
          <span>Tbilisi, Georgia</span>
        </div>
      </div>
      <p className="copyright">© 2026 Torito</p>
    </footer>
  );
}
