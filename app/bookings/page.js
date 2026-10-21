'use client';

// My bookings: the signed-in customer's requests, upcoming first then past.
// RLS ("read own bookings") means the plain select only returns their rows.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { supabase, currentUser } from '@/lib/supabaseClient';
import { useT } from '@/lib/i18n';
import { bookingRef } from '@/lib/bookingRef';
import { money } from '@/lib/season';
import { findTour } from '@/lib/tours-data';
import { localizeTour } from '@/lib/trip-translations';

const LOCALE = { en: 'en-GB', ka: 'ka-GE', ru: 'ru-RU', zh: 'zh-CN' };
const STATUS_KEY = { new: 'bookings.statusNew', confirmed: 'bookings.statusConfirmed', declined: 'bookings.statusDeclined' };
// bookings are made for Georgian dates, whatever the visitor's own time zone
const TBILISI = 'Asia/Tbilisi';

// "2026-12-28" -> "28 Dec 2026" in the visitor's language. The date has no
// time zone, so it is formatted as UTC to keep the day from shifting.
function formatDay(value, lang) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value ?? ''));
  if (!m) return '';
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return new Intl.DateTimeFormat(LOCALE[lang] || 'en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(d);
}

// created_at is a timestamp; show the day it was in Tbilisi
function formatCreated(value, lang) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(LOCALE[lang] || 'en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TBILISI }).format(d);
}

// today as YYYY-MM-DD in Tbilisi (en-CA prints dates in that shape)
const tbilisiToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: TBILISI }).format(new Date());

function BookingCard({ b }) {
  const { t, lang } = useT();
  const waitlist = b.kind === 'waitlist';
  const status = b.status in STATUS_KEY ? b.status : 'new';
  const label = waitlist ? t('bookings.statusWaitlist') : t(STATUS_KEY[status]);
  const when = [formatDay(b.wanted_date, lang), b.lesson_time].filter(Boolean).join(' · ');
  const requested = formatCreated(b.created_at, lang);
  // the stored title is English; show the translated one when we know the trip
  const found = b.tour_slug ? findTour(b.tour_slug) : null;
  const title = (found && localizeTour(found, lang).title) || b.tour_title || b.tour_slug;

  return (
    <article className="mybk-card">
      <div className="mybk-top">
        <h3 className="mybk-title">
          {b.tour_slug
            ? <Link href={`/activities/${b.tour_slug}`}>{title}</Link>
            : (b.tour_title || t('bookings.yourRequest'))}
        </h3>
        <span className={`mybk-status is-${waitlist ? 'waitlist' : status}`}>{label}</span>
      </div>
      <p className="mybk-ref">{bookingRef(b.id)}</p>
      <dl className="mybk-meta">
        {when && <div><dt>{t('bookings.when')}</dt><dd>{when}</dd></div>}
        {b.people != null && <div><dt>{t('bookings.people')}</dt><dd>{b.people}</dd></div>}
        {b.total != null && <div><dt>{t('bookings.total')}</dt><dd>{money(b.total)}</dd></div>}
      </dl>
      {requested && <p className="mybk-requested">{t('bookings.requested', { date: requested })}</p>}
    </article>
  );
}

export default function BookingsPage() {
  const { t } = useT();
  // checking | out | error | ready
  const [state, setState] = useState('checking');
  const [rows, setRows] = useState([]);

  const load = useCallback(async () => {
    setState('checking');
    try {
      const user = await currentUser();
      if (!user) { setRows([]); setState('out'); return; }
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        // RLS alone is not enough: an admin may read every booking
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setRows(data ?? []);
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);

  useEffect(() => {
    load();
    // the session can arrive late (e.g. straight after an email-confirmation link)
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') load();
    });
    return () => data?.subscription?.unsubscribe();
  }, [load]);

  const today = tbilisiToday();
  // no date (waitlist) counts as upcoming
  const upcoming = rows.filter((b) => !b.wanted_date || b.wanted_date.slice(0, 10) >= today);
  const past = rows.filter((b) => b.wanted_date && b.wanted_date.slice(0, 10) < today);

  return (
    <div className="subpage-shell">
      <SiteHeader solid />
      <main className="info-page mybk-page">
        <section className="info-body">
          <h1 className="info-title">{t('account.myBookings')}</h1>

          {state === 'checking' && <p className="mybk-note">{t('bookings.loading')}</p>}

          {state === 'out' && (
            <div className="mybk-empty">
              <p>{t('bookings.signInPrompt')}</p>
              <div className="mybk-actions">
                <Link className="book-btn" href="/login?next=%2Fbookings">{t('auth.signInBtn')}</Link>
                <Link className="auth-link" href="/signup?next=%2Fbookings">{t('auth.createBtn')}</Link>
              </div>
            </div>
          )}

          {state === 'error' && (
            <div className="mybk-empty">
              <p>{t('bookings.loadFailed')}</p>
              <div className="mybk-actions">
                <button type="button" className="book-btn" onClick={load}>{t('bookings.retry')}</button>
              </div>
            </div>
          )}

          {state === 'ready' && (
            <>
              <p className="mybk-note">{t('bookings.note')}</p>

              {rows.length === 0 && (
                <div className="mybk-empty">
                  <p>{t('bookings.none')}</p>
                  <div className="mybk-actions">
                    <Link className="book-btn" href="/activities">{t('bookings.browse')}</Link>
                  </div>
                </div>
              )}

              {upcoming.length > 0 && (
                <>
                  <h2 className="mybk-heading">{t('bookings.upcoming')}</h2>
                  <div className="mybk-list">
                    {upcoming.map((b) => <BookingCard key={b.id} b={b} />)}
                  </div>
                </>
              )}

              {past.length > 0 && (
                <>
                  <h2 className="mybk-heading">{t('bookings.past')}</h2>
                  <div className="mybk-list">
                    {past.map((b) => <BookingCard key={b.id} b={b} />)}
                  </div>
                </>
              )}
            </>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
