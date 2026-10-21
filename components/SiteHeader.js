'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AccountMenu from './AccountMenu';
import SearchSuggest from './SearchSuggest';
import { ThemeToggle } from './HeaderToggles';
import { useT } from '@/lib/i18n';
import { useFavorites } from '@/lib/favorites';

// useSearchParams needs a Suspense boundary on statically built pages, so the
// watcher is its own tiny component rather than a hook in the header itself.
function RouteWatcher({ onChange }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const key = `${pathname}?${params.toString()}`;
  useEffect(() => { onChange(); }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

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
  const closeMenu = () => setMenuOpen(false);

  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState('');
  // the suggestion list shows while a search field has focus
  const [typing, setTyping] = useState(false);

  // arriving on /activities?q=… (a reload, or the back button) should leave the term
  // in the box rather than showing filtered results next to an empty field
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('q');
    setQuery(pathname === '/activities' ? (q ?? '') : '');
  }, [pathname]);

  function submitSearch(e) {
    e.preventDefault();
    const q = query.trim();
    setSearchOpen(false);
    setTyping(false);
    router.push(q ? `/activities?q=${encodeURIComponent(q)}` : '/activities');
  }

  function pickSuggestion(href) {
    setTyping(false);
    setSearchOpen(false);
    router.push(href);
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
            <img src="/assets/torito-logo.png" alt={t('header.logoAlt')} />
            <span className="logo-text">TORITO</span>
          </Link>
          {/* phone only: sits next to the logo */}
          <button
            className="icon-btn round search-toggle"
            type="button"
            aria-expanded={searchOpen}
            title={t('nav.search')}
            aria-label={t('nav.search')}
            onClick={(e) => { e.stopPropagation(); setMenuOpen(false); setSearchOpen((v) => !v); }}
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
            onFocus={() => setTyping(true)}
            onBlur={() => setTyping(false)}
            placeholder={t('nav.search')}
            aria-label={t('nav.search')}
            autoComplete="off"
          />
          <SearchSuggest query={query} open={typing} onPick={pickSuggestion} onSeeAll={() => submitSearch({ preventDefault() {} })} />
        </form>

        {/* order, left to right: Ask AI, Menu, theme, favorites, profile (far right).
            The language picker lives in the profile menu only. */}
        <div className="header-actions">
          <button className="icon-btn ai-btn" type="button" title={t('nav.askAi')} aria-label={t('nav.askAi')} onClick={() => alert(t('header.aiSoon'))}>
            <span className="ai-dot" /><span className="hide-sm">{t('nav.askAi')}</span>
          </button>

          <ThemeToggle />

          {/* on very narrow phones this moves into the account menu */}
          <Link className="icon-btn round saved-btn" href="/activities?saved=1" title={t('nav.saved')} aria-label={t('nav.saved')}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 20s-7-4.6-7-9.4A4 4 0 0 1 12 8a4 4 0 0 1 7-2.6c0 4.8-7 9.4-7 9.4z" />
            </svg>
            {savedCount > 0 && <span className="saved-count">{savedCount}</span>}
          </Link>

          <AccountMenu />

          {/* far right, next to the profile */}
          <button
            className="menu-btn"
            type="button"
            aria-expanded={menuOpen}
            aria-label={t('nav.menu')}
            onClick={(e) => { e.stopPropagation(); setSearchOpen(false); setMenuOpen((v) => !v); }}
          >
            <span className="burger"><span /><span /><span /></span>
            <span className="menu-label">{t('nav.menu')}</span>
          </button>
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
              onFocus={() => setTyping(true)}
              onBlur={() => setTyping(false)}
              placeholder={t('nav.search')}
              aria-label={t('nav.search')}
              autoComplete="off"
            />
            <SearchSuggest query={query} open={typing} onPick={pickSuggestion} onSeeAll={() => submitSearch({ preventDefault() {} })} />
          </form>
        </div>
      )}

      {/* closes the menu whenever the page or its query string changes */}
      <Suspense fallback={null}>
        <RouteWatcher onChange={closeMenu} />
      </Suspense>

      {menuOpen && (
        // any click on a link inside closes the panel (bubbles from the Links):
        // picking an item on the page you are already on changes only the query,
        // so the panel would otherwise stay open
        <div className="mega-menu opening" aria-label={t('header.menuPanel')} onClick={(e) => { if (e.target.closest('a')) closeMenu(); }}>
          <div className="mega-inner">
            <div><h4>{t('nav.catalog')}</h4>
              <Link href="/activities?cat=ski">{t('cat.ski')}</Link>
              <Link href="/activities?cat=hiking">{t('cat.hiking')}</Link>
              <Link href="/activities?cat=camping">{t('cat.camping')}</Link>
              <Link href="/activities?cat=mountaineering">{t('cat.mountaineering')}</Link>
              <Link href="/activities?cat=transfer">{t('cat.transfer')}</Link>
            </div>
            <div><h4>{t('nav.winter')}</h4>
              <Link href="/activities?cat=ski&type=lessons">{t('header.instructors')}</Link>
              <Link href="/activities?cat=ski&type=freeride">{t('cat.freeride')}</Link>
              <Link href="/activities?cat=ski&type=snowmobile">{t('header.snowmobile')}</Link>
              <Link href="/activities?cat=ski&type=paragliding">{t('header.paragliding')}</Link>
            </div>
            <div><h4>{t('nav.info')}</h4>
              <Link href="/">{t('nav.home')}</Link><Link href="/about">{t('nav.about')}</Link>
              <Link href="/faq">{t('nav.faq')}</Link><Link href="/contact">{t('nav.contact')}</Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
