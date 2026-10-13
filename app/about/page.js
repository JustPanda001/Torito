'use client';

// Placeholder copy — the owner will replace it with their own words.

import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

const VALUES = [
  ['Certified guides', 'Every instructor and mountain guide we work with is certified and first-aid trained.'],
  ['Small groups', 'Fewer people per guide means more time on snow and on the trail, and safer days out.'],
  ['Local, all year', 'We live under these mountains. Winter in Gudauri, summer in Svaneti, Kazbegi and Tusheti.'],
];

export default function AboutPage() {
  return (
    <div className="subpage-shell">
      <SiteHeader solid />
      <main className="info-page">
        <section className="info-hero">
          <img src="/assets/gudauri 1.jpe" alt="" />
          <div className="info-hero-text">
            <span className="tag">About us</span>
            <h1>We take people into the Georgian mountains</h1>
          </div>
        </section>

        <section className="info-body">
          <p className="info-lead">
            Torito is a small team of skiers, snowboarders and mountain guides from Georgia.
            In winter we teach and guide in Gudauri — ski and snowboard lessons, freeride,
            snowmobile rides and paragliding. When the snow melts we head higher: multi-day
            hikes, camping trips and first summits like Kazbek.
          </p>
          <p>
            We started Torito because we wanted visitors to see the mountains the way we do —
            safely, without rushing, and with someone who knows every valley. Whether it is
            your first day on skis or your first glacier, we will plan it with you and be
            there the whole way.
          </p>

          <div className="info-cards">
            {VALUES.map(([title, text]) => (
              <div className="info-card" key={title}>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>

          <div className="info-cta">
            <Link className="hot-btn" href="/tours?cat=ski">See winter activities <span aria-hidden="true">→</span></Link>
            <Link className="auth-link" href="/contact">Get in touch</Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
