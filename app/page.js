'use client';

import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { useT } from '@/lib/i18n';

// winter leads: it is where the season's bookings are
const HERO = [
  '/assets/gudauri 1.jpe',
  '/assets/skier-gudauri-yellow-jacket-768x512.jpg',
  '/assets/gudauri.webp',
  '/assets/svaneti.jpg',
  '/assets/camping.jpg',
];

// The four ways onto the snow. Each opens the listing already narrowed to
// winter and to that one thing, so the visitor lands on what they clicked.
const WINTER = [
  ['lessons', '/assets/skier-gudauri-yellow-jacket-768x512.jpg'],
  ['freeride', '/assets/gudauri.webp'],
  ['snowmobile', '/assets/gudauri 1.jpe'],
  ['paragliding', '/assets/gudauri.jpe'],
];

// [image, label, tours-page category]
const ACTIVITIES = [
  ['/assets/Svaneti-history.jpg', 'cat.hiking', 'hiking'],
  ['/assets/camping fier.webp', 'cat.camping', 'camping'],
  ['/assets/sameba.webp', 'cat.mountaineering', 'mountaineering'],
  ['/assets/transfer.svg', 'cat.transfer', 'transfer'],
];

export default function HomePage() {
  const { t } = useT();

  return (
    <>
      <SiteHeader />
      <main id="top">

        <section className="hero">
          <div className="hero-track">
            {HERO.map((src) => (
              <div className="hero-slide" key={src}><img src={src} alt="" /></div>
            ))}
            {/* clone of slide 1 so the loop restarts without a visible jump */}
            <div className="hero-slide" aria-hidden="true"><img src={HERO[0]} alt="" /></div>
          </div>
          <div className="hero-scrim" />
          <div className="hero-content">
            <span className="hero-kicker">❄ {t('winter.kicker')}</span>
            <h1>{t('hero.title1')}<br />{t('hero.title2')}</h1>
            <p>{t('hero.sub')}</p>
            <div className="hero-ctas">
              <Link className="btn-pill btn-winter" href="/activities?cat=ski">{t('hero.cta')}</Link>
              <Link className="btn-ghost" href="/activities">{t('hero.ctaAll')}</Link>
            </div>
          </div>
        </section>

        <section className="section winter-spot" id="winter">
          <div className="winter-head">
            <div>
              <span className="winter-kicker">
                <span className="hot-dot" aria-hidden="true" />
                {t('winter.kicker')}
              </span>
              <h2>{t('winter.title')}</h2>
              <p>{t('winter.lead')}</p>
            </div>
            <Link className="hot-btn" href="/activities?cat=ski">
              {t('winter.all')} <span aria-hidden="true">→</span>
            </Link>
          </div>

          <div className="winter-grid">
            {WINTER.map(([type, src]) => (
              <Link className="winter-card" href={`/activities?cat=ski&type=${type}`} key={type}>
                <img src={src} alt="" loading="lazy" decoding="async" />
                <span className="winter-card-label">
                  <strong>{t(`winter.${type}`)}</strong>
                  <em>{t(`winter.${type}Note`)}</em>
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="section" id="activities">
          <h2 className="section-title">{t('home.catalog')}</h2>
          <div className="activity-row">
            {ACTIVITIES.map(([src, key, cat]) => (
              <Link className="activity-card" href={`/activities?cat=${cat}`} key={key}>
                <img src={src} alt="" /><span>{t(key)}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="section">
          <h2 className="section-title">{t('home.whatWeDo')}</h2>

          <div className="feature">
            <Link className="feature-img" href="/activities?cat=ski">
              <img src="/assets/gudauri.webp" alt={t('home.winter.alt')} />
            </Link>
            <div className="feature-text">
              <span className="tag">{t('home.winter.tag')}</span>
              <h3>{t('home.winter.title')}</h3>
              <p>
                {t('home.winter.text')}
              </p>
              <Link className="link-more" href="/activities?cat=ski">{t('home.winter.more')} →</Link>
            </div>
          </div>

          <div className="feature reverse">
            <Link className="feature-img" href="/activities?cat=hiking">
              <img src="/assets/svaneti(1).webp" alt={t('home.hiking.alt')} />
            </Link>
            <div className="feature-text">
              <span className="tag">{t('home.hiking.tag')}</span>
              <h3>{t('home.hiking.title')}</h3>
              <p>
                {t('home.hiking.text')}{' '}
                {t('home.laterNote')}
              </p>
              <Link className="link-more" href="/activities?cat=hiking">{t('home.hiking.more')} →</Link>
            </div>
          </div>

          <div className="feature">
            <Link className="feature-img" href="/activities?cat=camping">
              <img src="/assets/camping.jpg" alt={t('home.camping.alt')} />
            </Link>
            <div className="feature-text">
              <span className="tag">{t('home.camping.tag')}</span>
              <h3>{t('home.camping.title')}</h3>
              <p>
                {t('home.camping.text')}{' '}
                {t('home.laterNote')}
              </p>
              <Link className="link-more" href="/activities?cat=camping">{t('home.camping.more')} →</Link>
            </div>
          </div>

          <div className="feature reverse">
            <Link className="feature-img" href="/activities?cat=mountaineering">
              <img src="/assets/sameba.jpe" alt={t('home.climb.alt')} />
            </Link>
            <div className="feature-text">
              <span className="tag">{t('home.climb.tag')}</span>
              <h3>{t('home.climb.title')}</h3>
              <p>
                {t('home.climb.text')}{' '}
                {t('home.laterNote')}
              </p>
              <Link className="link-more" href="/activities?cat=mountaineering">{t('home.climb.more')} →</Link>
            </div>
          </div>

          <div className="feature">
            <Link className="feature-img" href="/activities?cat=transfer">
              <img src="/assets/transfer.svg" alt={t('home.transfer.alt')} />
            </Link>
            <div className="feature-text">
              <span className="tag">{t('home.transfer.tag')}</span>
              <h3>{t('home.transfer.title')}</h3>
              <p>
                {t('home.transfer.text')}
              </p>
              <Link className="link-more" href="/activities?cat=transfer">{t('home.transfer.more')} →</Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
