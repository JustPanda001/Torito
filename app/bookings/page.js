'use client';

// My bookings: the signed-in customer's requests, upcoming first then past.
// RLS ("read own bookings") means the plain select only returns their rows.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { supabase, currentUser } from '@/lib/supabaseClient';
import { useT } from '@/lib/i18n';
import { bookingRef, STATUS_LABEL } from '@/lib/bookingRef';
import { MONTHS, iso, money } from '@/lib/season';

// "2026-12-28" -> "28 Dec 2026". Parsed by hand: new Date('YYYY-MM-DD') is UTC
// and can land on the previous day in local time.
function formatDay(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value ?? ''));
  if (!m) return '';
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1].slice(0, 3)} ${m[1]}`;
}

// created_at is a timestamp; show the customer's local day
function formatCreated(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return formatDay(iso(d));
}

function BookingCard({ b }) {
  const waitlist = b.kind === 'waitlist';
  const status = b.status in STATUS_LABEL ? b.status : 'new';
  const label = waitlist ? 'On the waitlist' : STATUS_LABEL[status];
  const when = [formatDay(b.wanted_date), b.lesson_time].filter(Boolean).join(' · ');
  const requested = formatCreated(b.created_at);

  return (
    <article className="mybk-card">
      <div className="mybk-top">
        <h3 className="mybk-title">
          {b.tour_slug
            ? <Link href={`/tours/${b.tour_slug}`}>{b.tour_title || b.tour_slug}</Link>
            : (b.tour_title || 'Your request')}
        </h3>
        <span className={`mybk-status is-${waitlist ? 'waitlist' : status}`}>{label}</span>
      </div>
      <p className="mybk-ref">{bookingRef(b.id)}</p>
      <dl className="mybk-meta">
        {when && <div><dt>When</dt><dd>{when}</dd></div>}
        {b.people != null && <div><dt>People</dt><dd>{b.people}</dd></div>}
        {b.total != null && <div><dt>Total</dt><dd>{money(b.total)}</dd></div>}
      </dl>
      {requested && <p className="mybk-requested">Requested {requested}</p>}
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

  const today = iso(new Date());
  // no date (waitlist) counts as upcoming
  const upcoming = rows.filter((b) => !b.wanted_date || b.wanted_date.slice(0, 10) >= today);
  const past = rows.filter((b) => b.wanted_date && b.wanted_date.slice(0, 10) < today);

  return (
    <div className="subpage-shell">
      <SiteHeader solid />
      <main className="info-page mybk-page">
        <section className="info-body">
          <h1 className="info-title">{t('account.myBookings')}</h1>

          {state === 'checking' && <p className="mybk-note">Loading your bookings…</p>}

          {state === 'out' && (
            <div className="mybk-empty">
              <p>Sign in to see the trips and lessons you have requested.</p>
              <div className="mybk-actions">
                <Link className="book-btn" href="/login?next=%2Fbookings">Sign in</Link>
                <Link className="auth-link" href="/signup?next=%2Fbookings">Create account</Link>
              </div>
            </div>
          )}

          {state === 'error' && (
            <div className="mybk-empty">
              <p>We could not load your bookings just now. Please try again in a moment.</p>
              <div className="mybk-actions">
                <button type="button" className="book-btn" onClick={load}>Try again</button>
              </div>
            </div>
          )}

          {state === 'ready' && (
            <>
              <p className="mybk-note">We confirm every request by email. Questions? Use the chat.</p>

              {rows.length === 0 && (
                <div className="mybk-empty">
                  <p>You have not requested anything yet.</p>
                  <div className="mybk-actions">
                    <Link className="book-btn" href="/tours">Browse trips and lessons</Link>
                  </div>
                </div>
              )}

              {upcoming.length > 0 && (
                <>
                  <h2 className="mybk-heading">Upcoming</h2>
                  <div className="mybk-list">
                    {upcoming.map((b) => <BookingCard key={b.id} b={b} />)}
                  </div>
                </>
              )}

              {past.length > 0 && (
                <>
                  <h2 className="mybk-heading">Past</h2>
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
