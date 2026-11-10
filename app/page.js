'use client';

import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { useT } from '@/lib/i18n';

// Optimised copies live next to the originals in /public/assets (made with
// sharp; originals are untouched). [src, srcSet, width, height]
const A = '/assets/';
const GUDAURI1 = [A + 'gudauri-1-1600.webp', A + 'gudauri-1-800.webp 800w, ' + A + 'gudauri-1-1600.webp 1600w', 1600, 900];
const GUDAURI = [A + 'gudauri-hero-1600.webp', A + 'gudauri-hero-800.webp 800w, ' + A + 'gudauri-hero-1600.webp 1600w', 1600, 900];
const SVANETI = [A + 'svaneti-1600.webp', A + 'svaneti-800.webp 800w, ' + A + 'svaneti-1600.webp 1600w', 1600, 1009];
const CAMPING = [A + 'camping-1300.webp', A + 'camping-800.webp 800w, ' + A + 'camping-1300.webp 1300w', 1300, 867];
const SKIER = [A + 'skier-768.webp', null, 768, 512];

// winter leads: it is where the season's bookings are
const HERO = [GUDAURI1, SKIER, GUDAURI, SVANETI, CAMPING];

// Card and feature pictures are shown at most ~600px wide, so 800px is enough.
const WINTER = [
  ['lessons', [A + 'skier-768.webp', null, 768, 512]],
  ['freeride', [A + 'gudauri-hero-800.webp', null, 800, 450]],
  ['snowmobile', [A + 'gudauri-1-800.webp', null, 800, 450]],
  ['paragliding', [A + 'gudauri-paraglide-800.webp', null, 800, 413]],
];

// [image, label, tours-page category]
const ACTIVITIES = [
  [[A + 'svaneti-history-800.webp', null, 800, 457], 'cat.hiking', 'hiking'],
  [[A + 'camping fier.webp', null, 1000, 667], 'cat.camping', 'camping'],
  [[A + 'sameba.webp', null, 474, 634], 'cat.mountaineering', 'mountaineering'],
];

// One place for the loading attributes. "first" marks the single picture that
// is above the fold on load; everything else is lazy.
// Hero slides after the first are fetched straight away but at low priority:
// they sit off-screen in a sliding track, where lazy loading never triggers, so
// "lazy" would leave them blank when they slide in.
function Pic({ p, alt = '', sizes, first = false, slide = false }) {
  const [src, srcSet, width, height] = p;
  return (
    <img
      src={src}
      srcSet={srcSet || undefined}
      sizes={srcSet ? sizes : undefined}
      width={width}
      height={height}
      alt={alt}
      loading={first || slide ? 'eager' : 'lazy'}
      decoding={first ? undefined : 'async'}
      fetchPriority={first ? 'high' : slide ? 'low' : undefined}
    />
  );
}

export default function HomePage() {
  const { t } = useT();

  return (
    <>
      <SiteHeader />
      <main id="top">

        <section className="hero">
          <div className="hero-track">
            {HERO.map((p, i) => (
              <div className="hero-slide" key={p[0]}><Pic p={p} sizes="100vw" first={i === 0} slide /></div>
            ))}
            {/* clone of slide 1 so the loop restarts without a visible jump */}
            <div className="hero-slide" aria-hidden="true"><Pic p={HERO[0]} sizes="100vw" slide /></div>
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
                <Pic p={src} />
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
                <Pic p={src} /><span>{t(key)}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="section">
          <h2 className="section-title">{t('home.whatWeDo')}</h2>

          <div className="feature">
            <Link className="feature-img" href="/activities?cat=ski">
              <Pic p={[A + 'gudauri-hero-800.webp', null, 800, 450]} alt={t('home.winter.alt')} />
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
              <Pic p={[A + 'svaneti-hiking-800.webp', null, 800, 450]} alt={t('home.hiking.alt')} />
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
              <Pic p={[A + 'camping-800.webp', null, 800, 534]} alt={t('home.camping.alt')} />
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
              <Pic p={[A + 'sameba-800.webp', null, 800, 533]} alt={t('home.climb.alt')} />
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

        </section>
      </main>
      <SiteFooter />
    </>
  );
}
