'use client';

import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import HotSection from '@/components/HotSection';
import { useT } from '@/lib/i18n';

const HERO = [
  '/assets/svaneti.jpg',
  '/assets/gudauri 1.jpe',
  '/assets/camping.jpg',
  '/assets/sameba.jpe',
  '/assets/kaxeti.jpg',
];

// [image, label, tours-page category] — the category preselects the filter
// chip on the listing, so the visitor lands on what they clicked
const ACTIVITIES = [
  ['/assets/sameba.webp', 'cat.tours', 'tours'],
  ['/assets/Svaneti-history.jpg', 'cat.hiking', 'hiking'],
  ['/assets/skier-gudauri-yellow-jacket-768x512.jpg', 'cat.ski', 'ski'],
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
            <h1>{t('hero.title1')}<br />{t('hero.title2')}</h1>
            <p>{t('hero.sub')}</p>
            <Link className="btn-pill" href="/tours">{t('hero.cta')}</Link>
          </div>
        </section>

        <section className="section reveal visible" id="activities">
          <h2 className="section-title">{t('home.catalog')}</h2>
          <div className="activity-row">
            {ACTIVITIES.map(([src, key, cat]) => (
              <Link className="activity-card" href={`/tours?cat=${cat}`} key={key}>
                <img src={src} alt="" /><span>{t(key)}</span>
              </Link>
            ))}
          </div>
        </section>

        <HotSection />

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
              <Link className="link-more" href="/tours?cat=hiking">See our hikes →</Link>
            </div>
          </div>

          <div className="feature reverse reveal visible">
            <div className="feature-img">
              <img src="/assets/sameba.jpe" alt="Touring Georgia" />
            </div>
            <div className="feature-text">
              <span className="tag">All year</span>
              <h3>Tours around the country</h3>
              <p>
                Monasteries, wine country and old capitals, from a single day out of
                Tbilisi to a week across several regions — with the nights under canvas
                for the trips that end up in the mountains.
              </p>
              <Link className="link-more" href="/tours?cat=tours">See our tours →</Link>
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
              <Link className="link-more" href="/tours?cat=ski">See winter trips →</Link>
            </div>
          </div>

          <div className="feature reverse reveal visible">
            <div className="feature-img">
              <img src="/assets/transfer.svg" alt="Transfers across Georgia" />
            </div>
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
