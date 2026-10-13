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
              <Link className="btn-pill btn-winter" href="/tours?cat=ski">{t('hero.cta')}</Link>
              <Link className="btn-ghost" href="/tours">{t('hero.ctaAll')}</Link>
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
            <Link className="hot-btn" href="/tours?cat=ski">
              {t('winter.all')} <span aria-hidden="true">→</span>
            </Link>
          </div>

          <div className="winter-grid">
            {WINTER.map(([type, src]) => (
              <Link className="winter-card" href={`/tours?cat=ski&type=${type}`} key={type}>
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
              <Link className="activity-card" href={`/tours?cat=${cat}`} key={key}>
                <img src={src} alt="" /><span>{t(key)}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="section">
          <h2 className="section-title">{t('home.whatWeDo')}</h2>

          <div className="feature">
            <Link className="feature-img" href="/tours?cat=ski">
              <img src="/assets/gudauri.webp" alt="Skiing in Gudauri" />
            </Link>
            <div className="feature-text">
              <span className="tag">Winter season</span>
              <h3>Winter in Gudauri</h3>
              <p>
                Certified ski and snowboard instructors and schools for a first week on
                snow, freeride guiding in the wide open bowls above Gudauri, snowmobile
                rides up toward the Cross Pass, and tandem paragliding flights over the
                slopes when the wind is right.
              </p>
              <Link className="link-more" href="/tours?cat=ski">See winter activities →</Link>
            </div>
          </div>

          <div className="feature reverse">
            <Link className="feature-img" href="/tours?cat=hiking">
              <img src="/assets/svaneti(1).webp" alt="Hiking in the Georgian mountains" />
            </Link>
            <div className="feature-text">
              <span className="tag">Guided treks</span>
              <h3>Hiking</h3>
              <p>
                As experienced mountain guides, we are passionate about showing you the raw
                beauty of Georgia&apos;s grandest landscapes. From soaring alpine peaks and
                dramatic glaciers to ancient valleys, we lead you safely through the finest
                trails in Svaneti, Kazbegi, Tusheti and beyond.
              </p>
              <Link className="link-more" href="/tours?cat=hiking">See our hikes →</Link>
            </div>
          </div>

          <div className="feature">
            <Link className="feature-img" href="/tours?cat=camping">
              <img src="/assets/camping.jpg" alt="Camping in the mountains" />
            </Link>
            <div className="feature-text">
              <span className="tag">Nights outside</span>
              <h3>Camping</h3>
              <p>
                Lakeside camps, canyon nights and high meadows. We carry the tents, cook
                dinner on the fire and pick the pitch — you just walk in and watch the
                stars come out.
              </p>
              <Link className="link-more" href="/tours?cat=camping">See camping trips →</Link>
            </div>
          </div>

          <div className="feature reverse">
            <Link className="feature-img" href="/tours?cat=mountaineering">
              <img src="/assets/sameba.jpe" alt="Mount Kazbek" />
            </Link>
            <div className="feature-text">
              <span className="tag">Summer season</span>
              <h3>Mountaineering</h3>
              <p>
                Your first big summit with certified guides — Kazbek at 5,054 m and other
                Caucasus peaks, with acclimatisation days, glacier school and a reserve
                day built in so the weather decides, not the schedule.
              </p>
              <Link className="link-more" href="/tours?cat=mountaineering">See climbs →</Link>
            </div>
          </div>

          <div className="feature">
            <Link className="feature-img" href="/tours?cat=transfer">
              <img src="/assets/transfer.svg" alt="Transfers across Georgia" />
            </Link>
            <div className="feature-text">
              <span className="tag">Coming soon</span>
              <h3>Transfer</h3>
              <p>
                Airport pickups and transfers to the trailhead, the resort or the next
                region, for anything from a pair to a full minibus. We are still putting
                the vehicles together — tell us what you need and we will arrange it.
              </p>
              <Link className="link-more" href="/tours?cat=transfer">See transfers →</Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
