'use client';

// Frequently asked questions. Placeholder answers — the owner will edit them.

import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

const FAQ = [
  ['When is the winter season in Gudauri?',
    'Usually from December until March. In a good snow year the lifts run into April — check the dates on each activity.'],
  ['I have never skied. Can I still book a lesson?',
    'Yes. Most of our lesson bookings are complete beginners. Pick "Beginner" when you book and the instructor will start from the very first steps.'],
  ['Do I need experience for the snowmobile or paragliding?',
    'No. Both come with a short briefing. On a tandem paragliding flight the pilot does all the flying — you only run a few steps at take-off.'],
  ['What happens if the weather is bad?',
    'Safety comes first. If wind or snow makes an activity unsafe we move it to another time or day, or give you your money back.'],
  ['How do I pay?',
    'You send a request on the site, we confirm it, and you pay on the day. No card details are taken online.'],
  ['Can I cancel?',
    'Yes. Tell us as early as you can in the chat or by email. Free cancellation up to 48 hours before the start.'],
  ['Do you rent equipment?',
    'Ski and snowboard gear is rented in the resort; we can arrange it for you. Paragliding and snowmobile gear is included.'],
  ['Can you pick us up from the airport?',
    'Yes — ask for a transfer. We can collect you in Tbilisi or Kutaisi and drive you to Gudauri or the trailhead.'],
];

export default function FaqPage() {
  return (
    <div className="subpage-shell">
      <SiteHeader solid />
      <main className="info-page">
        <section className="info-body">
          <span className="tag">FAQ</span>
          <h1 className="info-title">Frequently asked questions</h1>
          <p className="info-lead">The things people ask us most. Anything else — just write to us.</p>

          <div className="faq-list">
            {FAQ.map(([q, a]) => (
              <details className="faq-item" key={q}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>

          <div className="info-cta">
            <Link className="hot-btn" href="/contact">Still have a question? <span aria-hidden="true">→</span></Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
