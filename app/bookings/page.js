'use client';

// My bookings: the signed-in customer's requests, upcoming first then past.
// RLS ("read own bookings") means the plain select only returns their rows.

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { supabase, currentUser } from '@/lib/supabaseClient';
import { useT } from '@/lib/i18n';
import { bookingRef } from '@/lib/bookingRef';
import { markMyBookingsSeen } from '@/lib/badges';
import { money } from '@/lib/season';
import { findTour } from '@/lib/tours-data';
import { localizeTour } from '@/lib/trip-translations';
import '../styles/cancel.css';

const LOCALE = { en: 'en-GB', ka: 'ka-GE', ru: 'ru-RU', zh: 'zh-CN' };
const STATUS_KEY = {
  new: 'bookings.statusNew',
  confirmed: 'bookings.statusConfirmed',
  declined: 'bookings.statusDeclined',
  cancelled: 'bookings.cancelStatus',
};
// free cancellation closes this long before the service starts (the server
// checks the same rule; this only decides what to show)
const FREE_CANCEL_MS = 48 * 60 * 60 * 1000;
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

// When the service starts. Georgia is UTC+4 all year, so the date and time are
// read as +04:00 whatever the visitor's own zone is. No time means 00:00 that day.
function serviceStart(wantedDate, lessonTime) {
  const day = /^(\d{4}-\d{2}-\d{2})/.exec(String(wantedDate ?? ''))?.[1];
  if (!day) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(String(lessonTime ?? '').trim());
  const hh = m ? String(Math.min(Number(m[1]), 23)).padStart(2, '0') : '00';
  const start = new Date(`${day}T${hh}:${m ? m[2] : '00'}:00+04:00`);
  return Number.isNaN(start.getTime()) ? null : start.getTime();
}

// The cancel line of a card: a button, a short "too late" note, or nothing.
function CancelBlock({ b, onCancelled }) {
  const { t } = useT();
  const [step, setStep] = useState('idle');   // idle | asking | working
  const [error, setError] = useState('');

  const start = b.kind === 'waitlist' ? null : serviceStart(b.wanted_date, b.lesson_time);
  if (start === null || (b.status !== 'new' && b.status !== 'confirmed')) return null;

  // already started, or inside the 48 hours
  if (start - Date.now() < FREE_CANCEL_MS) {
    // a service that is over has nothing left to cancel; keep the note for upcoming ones
    return start > Date.now() ? <div className="mybk-cancel"><p className="mybk-cancel-late">{t('bookings.cancelLate')}</p></div> : null;
  }

  async function cancel() {
    setStep('working');
    setError('');
    try {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (!token) throw new Error('no session');
      const res = await fetch('/api/bookings/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: b.id }),
      });
      const result = await res.json().catch(() => null);
      if (!res.ok || !result?.ok) {
        setError(result?.code === 'too_late' ? t('bookings.cancelLate') : t('bookings.cancelFailed'));
        setStep('idle');
        return;
      }
      onCancelled(b.id);
    } catch {
      setError(t('bookings.cancelFailed'));
      setStep('idle');
    }
  }

  return (
    <div className="mybk-cancel">
      {step === 'idle' ? (
        <button type="button" className="auth-btn mybk-cancel-btn" onClick={() => { setError(''); setStep('asking'); }}>
          {t('bookings.cancelBtn')}
        </button>
      ) : (
        <>
          <p className="mybk-cancel-ask" role="alert">{t('bookings.cancelAsk')}</p>
          <div className="mybk-cancel-row">
            <button type="button" className="auth-btn mybk-cancel-yes" disabled={step === 'working'} onClick={cancel}>
              {step === 'working' ? t('bookings.cancelWorking') : t('bookings.cancelYes')}
            </button>
            <button type="button" className="auth-btn mybk-cancel-keep" disabled={step === 'working'} onClick={() => setStep('idle')}>
              {t('bookings.cancelNo')}
            </button>
          </div>
        </>
      )}
      {error && <p className="mybk-cancel-error" role="alert">{error}</p>}
    </div>
  );
}

function BookingCard({ b, onCancelled }) {
  const { t, lang } = useT();
  const waitlist = b.kind === 'waitlist';
  const status = b.status in STATUS_KEY ? b.status : 'new';
  const label = waitlist ? t('bookings.statusWaitlist') : t(STATUS_KEY[status]);
  const when = [formatDay(b.wanted_date, lang), b.lesson_time].filter(Boolean).join(' · ');
  const requested = formatCreated(b.created_at, lang);
  // the stored title is English; show the translated one when we know the trip
  const found = b.tour_slug ? findTour(b.tour_slug) : null;
  // full_title ('Gudauri Snowmobile Ride'), not the short card title ('Gudauri')
  const loc = found ? localizeTour(found, lang) : null;
  const title = loc?.full_title || b.tour_title || loc?.title || b.tour_slug;
  // the trip's first photo, beside the details
  const photo = found ? (found.gallery?.[0] || found.cover_image) : null;

  return (
    <article className={`mybk-card${photo ? ' has-photo' : ''}`}>
      {photo && (
        b.tour_slug
          ? <Link className="mybk-photo" href={`/activities/${b.tour_slug}`} tabIndex={-1} aria-hidden="true"><img src={photo} alt="" loading="lazy" /></Link>
          : <span className="mybk-photo" aria-hidden="true"><img src={photo} alt="" loading="lazy" /></span>
      )}
      <div className="mybk-body">
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
      <CancelBlock b={b} onCancelled={onCancelled} />
      </div>
    </article>
  );
}

export default function BookingsPage() {
  const { t } = useT();
  // checking | out | error | ready
  const [state, setState] = useState('checking');
  const [rows, setRows] = useState([]);
  const userIdRef = useRef(null);

  // The customer just cancelled this one: show it as cancelled, and count that
  // as seen so their own action does not light the "!" on My bookings.
  const onCancelled = (id) => {
    const next = rows.map((r) => (r.id === id ? { ...r, status: 'cancelled' } : r));
    setRows(next);
    markMyBookingsSeen(userIdRef.current, next);
  };

  const load = useCallback(async () => {
    setState('checking');
    try {
      const user = await currentUser();
      if (!user) { setRows([]); setState('out'); return; }
      userIdRef.current = user.id;
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        // RLS alone is not enough: an admin may read every booking
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setRows(data ?? []);
      setState('ready');
      // looking at the list is what clears the "!" on My bookings
      markMyBookingsSeen(user.id, data ?? []);
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
                    {upcoming.map((b) => <BookingCard key={b.id} b={b} onCancelled={onCancelled} />)}
                  </div>
                </>
              )}

              {past.length > 0 && (
                <>
                  <h2 className="mybk-heading">{t('bookings.past')}</h2>
                  <div className="mybk-list">
                    {past.map((b) => <BookingCard key={b.id} b={b} onCancelled={onCancelled} />)}
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
