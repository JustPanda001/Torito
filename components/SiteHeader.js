'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import AccountMenu from './AccountMenu';
import { ThemeToggle, LanguageToggle } from './HeaderToggles';
import { useT } from '@/lib/i18n';
import { useFavorites } from '@/lib/favorites';

export default function SiteHeader({ solid = false }) {
  const { t } = useT();
  const { favorites } = useFavorites();
  const savedCount = favorites.size;
  // on phones the search field cannot share the row with the buttons, so it
  // collapses to an icon that drops a full-width field below the bar
  const [searchOpen, setSearchOpen] = useState(false);
  // sub-pages have no hero behind the header, so it stays solid all the time
  const [scrolled, setScrolled] = useState(solid);
  const [menuOpen, setMenuOpen] = useState(false);
  const header = useRef(null);

  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState('');

  // arriving on /tours?q=… (a reload, or the back button) should leave the term
  // in the box rather than showing filtered results next to an empty field
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('q');
    setQuery(pathname === '/tours' ? (q ?? '') : '');
  }, [pathname]);

  function submitSearch(e) {
    e.preventDefault();
    const q = query.trim();
    setSearchOpen(false);
    router.push(q ? `/tours?q=${encodeURIComponent(q)}` : '/tours');
  }

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
            <span className="menu-label">{t('nav.menu')}</span>
          </button>

          {/* phone only: sits with the menu on the left, not among the
              right-hand controls */}
          <button
            className="icon-btn round search-toggle"
            type="button"
            aria-expanded={searchOpen}
            title={t('nav.search')}
            aria-label={t('nav.search')}
            onClick={(e) => { e.stopPropagation(); setSearchOpen((v) => !v); }}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
            </svg>
          </button>
        </div>

        <form className="search-box" onSubmit={submitSearch} role="search">
          <button className="search-icon-btn" type="submit" aria-label={t('nav.search')}>
            <svg className="search-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
            </svg>
          </button>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('nav.search')}
            aria-label={t('nav.search')}
          />
        </form>

        <div className="header-actions">
          <button className="icon-btn ai-btn" type="button" title="Ask AI" onClick={() => alert('AI assistant coming soon.')}>
            <span className="ai-dot" /><span className="hide-sm">{t('nav.askAi')}</span>
          </button>

          <LanguageToggle />
          <ThemeToggle />
          <AccountMenu />

          {/* on phones this moves into the account menu, where there is room */}
          <Link className="icon-btn round saved-btn" href="/tours?saved=1" title={t('nav.saved')} aria-label={t('nav.saved')}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 20s-7-4.6-7-9.4A4 4 0 0 1 12 8a4 4 0 0 1 7-2.6c0 4.8-7 9.4-7 9.4z" />
            </svg>
            {savedCount > 0 && <span className="saved-count">{savedCount}</span>}
          </Link>
        </div>
      </div>

      {searchOpen && (
        <div className="mobile-search" onClick={(e) => e.stopPropagation()}>
          <form className="search-box" onSubmit={submitSearch} role="search">
            <button className="search-icon-btn" type="submit" aria-label={t('nav.search')}>
              <svg className="search-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
              </svg>
            </button>
            {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
            <input
              type="search"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('nav.search')}
              aria-label={t('nav.search')}
            />
          </form>
        </div>
      )}

      {menuOpen && (
        <div className="mega-menu opening">
          <div className="mega-inner">
            <div><h4>Tours</h4>
              <Link href="/tours?q=svaneti">Svaneti</Link><Link href="/tours?q=kazbegi">Kazbegi</Link>
              <Link href="/tours?q=tusheti">Tusheti</Link><Link href="/tours?q=mtskheta">Mtskheta</Link>
              <Link href="/tours?q=kakheti">Kakheti</Link>
            </div>
            <div><h4>Activities</h4>
              <Link href="/tours?cat=hiking">Hiking</Link><Link href="/tours?cat=camping">Camping</Link>
              <Link href="/tours?cat=ski">Ski &amp; snowboard</Link>
              <Link href="/tours?cat=lesson">Lessons</Link>
              <Link href="/tours?cat=freeride">Freeride</Link>
              {/* no category of their own yet, so these search instead */}
              <Link href="/tours?q=horse">Horse riding</Link>
              <Link href="/tours?q=rafting">Rafting</Link>
            </div>
            <div><h4>Instructors</h4>
              <Link href="/tours?cat=lesson">Ski instructors</Link><Link href="/tours?cat=lesson">Snowboard instructors</Link>
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
