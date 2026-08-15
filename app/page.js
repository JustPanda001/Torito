'use client';

import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { useT } from '@/lib/i18n';

const HERO = [
  '/assets/svaneti.jpg',
  '/assets/gudauri 1.jpe',
  '/assets/camping.jpg',
  '/assets/sameba.jpe',
  '/assets/kaxeti.jpg',
];

const ACTIVITIES = [
  ['/assets/Svaneti-history.jpg', 'cat.hiking'],
  ['/assets/camping.jpg', 'cat.camping'],
  ['/assets/sameba.webp', 'cat.culture'],
  ['/assets/skier-gudauri-yellow-jacket-768x512.jpg', 'cat.ski'],
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
            <h1>{t('hero.title1')}<br />{t('hero.title2')}</h1>
            <p>{t('hero.sub')}</p>
            <Link className="btn-pill" href="/tours">{t('hero.cta')}</Link>
          </div>
        </section>

        <section className="section reveal visible" id="activities">
          <h2 className="section-title">{t('home.exploreByActivity')}</h2>
          <div className="activity-row">
            {ACTIVITIES.map(([src, key]) => (
              <Link className="activity-card" href="/tours" key={key}>
                <img src={src} alt="" /><span>{t(key)}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="section">
          <h2 className="section-title">{t('home.whatWeDo')}</h2>

          <div className="feature reveal visible">
            <div className="feature-img">
              <img src="/assets/svaneti(1).webp" alt="Hiking in the Georgian mountains" />
            </div>
            <div className="feature-text">
              <span className="tag">Guided treks</span>
              <h3>Hiking</h3>
              <p>
                As experienced mountain guides, we are passionate about showing you the raw
                beauty of Georgia&apos;s grandest landscapes. From soaring alpine peaks and
                dramatic glaciers to ancient valleys, we lead you safely through nature&apos;s
                finest trails while sharing the rich history, culture, and warm hospitality
                that make Georgia unforgettable.
              </p>
              <Link className="link-more" href="/tours">See our hikes →</Link>
            </div>
          </div>

          <div className="feature reverse reveal visible">
            <div className="feature-img">
              <img src="/assets/camping fier.webp" alt="Camping in Georgia" />
            </div>
            <div className="feature-text">
              <span className="tag">Under canvas</span>
              <h3>Camping</h3>
              <p>
                Nights beside alpine lakes and in river gorges, with the tents pitched and
                dinner cooking by the time you arrive. Trips that suit families and
                first-time campers as readily as seasoned walkers.
              </p>
              <Link className="link-more" href="/tours">See our camps →</Link>
            </div>
          </div>

          <div className="feature reveal visible">
            <div className="feature-img">
              <img src="/assets/gudauri.webp" alt="Skiing in Gudauri" />
            </div>
            <div className="feature-text">
              <span className="tag">Winter season</span>
              <h3>Ski &amp; snowboard</h3>
              <p>
                Certified instructors for a first week on snow in Bakuriani, and freeride
                guiding in the wide open bowls above Gudauri when the conditions line up.
              </p>
              <Link className="link-more" href="/tours">See winter trips →</Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
