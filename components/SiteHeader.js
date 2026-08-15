'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import AccountMenu from './AccountMenu';

export default function SiteHeader({ solid = false }) {
  // sub-pages have no hero behind the header, so it stays solid all the time
  const [scrolled, setScrolled] = useState(solid);
  const [menuOpen, setMenuOpen] = useState(false);
  const header = useRef(null);

  useEffect(() => {
    if (solid) return undefined;
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [solid]);

  useEffect(() => {
    const away = (e) => { if (!header.current?.contains(e.target)) setMenuOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('click', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('click', away);
      document.removeEventListener('keydown', esc);
    };
  }, []);

  return (
    <header className={`site-header${scrolled || menuOpen ? ' solid' : ''}`} ref={header}>
      <div className="header-inner">

        <div className="header-left">
          <Link className="logo" href="/">
            <img src="/assets/torito-logo.png" alt="Torito — Georgian Ascent Tours" />
            <span className="logo-text">TORITO</span>
          </Link>
          <button
            className="menu-btn"
            type="button"
            aria-expanded={menuOpen}
            onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
          >
            <span className="burger"><span /><span /><span /></span>
            <span className="menu-label">Menu</span>
          </button>
        </div>

        <form className="search-box" onSubmit={(e) => e.preventDefault()}>
          <svg className="search-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
          </svg>
          <input type="search" placeholder="Search tours, hikes, instructors…" aria-label="Search" />
        </form>

        <div className="header-actions">
          <button className="icon-btn ai-btn" type="button" title="Ask AI" onClick={() => alert('AI assistant coming soon.')}>
            <span className="ai-dot" /><span className="hide-sm">Ask AI</span>
          </button>

          <AccountMenu />

          <Link className="icon-btn round" href="/tours" title="Saved">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 20s-7-4.6-7-9.4A4 4 0 0 1 12 8a4 4 0 0 1 7-2.6c0 4.8-7 9.4-7 9.4z" />
            </svg>
          </Link>
          <Link className="icon-btn round" href="/tours" title="Bookings">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M6 8h12l1 12H5z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" />
            </svg>
          </Link>
        </div>
      </div>

      {menuOpen && (
        <div className="mega-menu opening">
          <div className="mega-inner">
            <div><h4>Tours</h4>
              <Link href="/tours">Svaneti</Link><Link href="/tours">Kazbegi</Link>
              <Link href="/tours">Tusheti</Link><Link href="/tours">Mtskheta</Link>
              <Link href="/tours">Kakheti</Link>
            </div>
            <div><h4>Activities</h4>
              <Link href="/tours">Hiking</Link><Link href="/tours">Camping</Link>
              <Link href="/tours">Ski &amp; snowboard</Link><Link href="/tours">Horse riding</Link>
              <Link href="/tours">Rafting</Link>
            </div>
            <div><h4>Instructors</h4>
              <Link href="/tours">Ski instructors</Link><Link href="/tours">Snowboard instructors</Link>
              <Link href="/tours">Mountain guides</Link><Link href="/signup">Become an instructor</Link>
            </div>
            <div><h4>Info</h4>
              <Link href="/">Home</Link><Link href="/tours">About us</Link>
              <Link href="/tours">FAQ</Link><Link href="/tours">Contact</Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
