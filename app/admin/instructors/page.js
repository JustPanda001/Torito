'use client';

// Admin: the instructor roster for lessons with "Assign instructors" ticked
// (today the Gudauri lessons). New bookings are given an instructor from this
// list by assign_instructor() in the database:
//
//   * lowest Rank first: rank 1 is asked before rank 2, and so on
//   * the same Rank shares lessons equally: whoever has fewer hours booked
//     this season gets the next one; a tie goes to the one higher in the list
//   * someone is free when none of their lessons overlaps the hours, on any of
//     the days, of the new one; cancelled and declined bookings do not count
//   * nobody free: the booking is still taken, left Unassigned, and the team
//     gets a Telegram alert
//
// Starting roster: ski Saba (1), Luka (2), Ski helper 1-3 (3, 4, 5); snowboard
// Sandro and Gio (both 1, so they share), Snowboard helper 1-3 (2, 3, 4).
//
// Renaming someone renames them on every booking (bookings store the id).
// Untick Active to stop new lessons going to someone without losing their
// past ones. The gate below only hides the UI; the "admins manage instructors"
// policy is what lets a change through.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import MtaniLogo from '@/components/MtaniLogo';
import SiteHeader from '@/components/SiteHeader';
import { supabase, currentProfile, friendlyError } from '@/lib/supabaseClient';

const DISCIPLINES = [['ski', 'Ski'], ['snowboard', 'Snowboard']];
const RANKS = Array.from({ length: 10 }, (_, i) => i + 1);

const sortRoster = (list) => [...list].sort((a, b) => (
  a.discipline.localeCompare(b.discipline) || a.rank - b.rank || a.position - b.position
  || String(a.created_at).localeCompare(String(b.created_at))
));

export default function AdminInstructorsPage() {
  const [profile, setProfile] = useState(undefined);   // undefined = still checking
  const [rows, setRows] = useState(null);               // null = still loading
  const [drafts, setDrafts] = useState({});             // id -> edited fields
  const [note, setNote] = useState(null);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState({ name: '', discipline: 'ski', rank: 1 });

  useEffect(() => { currentProfile().then(setProfile).catch(() => setProfile(null)); }, []);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('instructors').select('*')
      .order('discipline').order('rank').order('position');
    if (error) {
      setRows((prev) => prev ?? []);
      setNote({ error: true, text: `Could not load the roster: ${friendlyError(error)}` });
      return;
    }
    setRows(sortRoster(data ?? []));
    setDrafts({});
  }, []);

  useEffect(() => { if (profile?.role === 'admin') load(); }, [profile, load]);

  if (profile === undefined) return <Denied message="Checking your account…" />;
  if (!profile) return <Denied message="You are not signed in." />;
  if (profile.role !== 'admin') {
    return <Denied message={`Signed in as ${profile.email ?? 'this account'}, but this account is not an admin.`} />;
  }

  const edit = (id, patch) => setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  const view = (r) => ({ ...r, ...drafts[r.id] });

  async function run(task, done) {
    setBusy(true);
    setNote(null);
    try {
      await task();
      setNote({ error: false, text: done });
      await load();
    } catch (error) {
      setNote({ error: true, text: friendlyError(error) });
    } finally {
      setBusy(false);
    }
  }

  function save(r) {
    const v = view(r);
    const name = String(v.name ?? '').trim();
    if (!name) { setNote({ error: true, text: 'A name cannot be empty.' }); return; }
    run(async () => {
      const { error } = await supabase.from('instructors')
        .update({ name, discipline: v.discipline, rank: Number(v.rank), active: Boolean(v.active) })
        .eq('id', r.id);
      if (error) throw error;
    }, `Saved ${name}.`);
  }

  // up / down inside the same discipline: swaps the two positions
  function move(r, dir) {
    const same = (rows ?? []).filter((x) => x.discipline === r.discipline);
    const i = same.findIndex((x) => x.id === r.id);
    const other = same[i + dir];
    if (!other) return;
    run(async () => {
      // renumber the whole discipline so equal positions can never tie
      const order = same.map((x) => x.id);
      [order[i], order[i + dir]] = [order[i + dir], order[i]];
      for (let k = 0; k < order.length; k += 1) {
        const { error } = await supabase.from('instructors').update({ position: k + 1 }).eq('id', order[k]);
        if (error) throw error;
      }
      // moving across ranks would be confusing: the list is sorted by rank first
      if (other.rank !== r.rank) {
        const { error } = await supabase.from('instructors').update({ rank: other.rank }).eq('id', r.id);
        if (error) throw error;
      }
    }, 'Order saved.');
  }

  function remove(r) {
    if (!window.confirm(`Remove ${r.name} from the roster? Their bookings stay, but show as Unassigned. To keep their history, untick Active instead.`)) return;
    run(async () => {
      const { error } = await supabase.from('instructors').delete().eq('id', r.id);
      if (error) throw error;
    }, `Removed ${r.name}.`);
  }

  function add(e) {
    e.preventDefault();
    const name = adding.name.trim();
    if (!name) return;
    const last = Math.max(0, ...(rows ?? []).filter((x) => x.discipline === adding.discipline).map((x) => x.position));
    run(async () => {
      const { error } = await supabase.from('instructors')
        .insert({ name, discipline: adding.discipline, rank: Number(adding.rank), position: last + 1 });
      if (error) throw error;
      setAdding((prev) => ({ ...prev, name: '' }));
    }, `Added ${name}.`);
  }

  return (
    <div className="subpage-shell">
      <SiteHeader solid />
      <main className="detail-page rev-admin">
        <div className="listing-head rev-admin-head">
          <h1>Instructors</h1>
          <span>
            <Link className="auth-link" href="/admin/bookings">Bookings</Link>
            {' · '}
            <Link className="auth-link" href="/admin">Manage activities</Link>
          </span>
        </div>
        <p className="rev-admin-intro">
          New lessons on trips with &ldquo;Assign instructors&rdquo; ticked get someone from this list.
          Lower rank is asked first; people with the same rank share lessons equally (fewer hours this
          season first, a tie goes to the one higher in the list). If nobody is free, the booking is still
          taken, shows as Unassigned on Bookings, and Telegram gets an alert. Untick Active to stop new
          lessons going to someone.
        </p>

        {note && <p className={note.error ? 'rev-error' : 'form-note'} role={note.error ? 'alert' : 'status'}>{note.text}</p>}

        {rows === null ? <p className="rev-empty">Loading the roster…</p> : DISCIPLINES.map(([d, label]) => {
          const list = rows.filter((r) => r.discipline === d);
          return (
            <section className="detail-block" key={d}>
              <h2>{label}</h2>
              {list.length === 0 && <p className="rev-empty">Nobody yet.</p>}
              <ul className="rev-list">
                {list.map((r, i) => {
                  const v = view(r);
                  const dirty = Boolean(drafts[r.id]);
                  return (
                    <li className="rev-card" key={r.id} style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                      <span style={{ display: 'flex', flexDirection: 'column' }}>
                        <button type="button" className="chip" disabled={busy || i === 0} onClick={() => move(r, -1)} aria-label={`Move ${r.name} up`}>↑</button>
                        <button type="button" className="chip" disabled={busy || i === list.length - 1} onClick={() => move(r, 1)} aria-label={`Move ${r.name} down`}>↓</button>
                      </span>
                      <label className="field" style={{ flex: '1 1 180px', margin: 0 }}>
                        <span className="field-label">Name</span>
                        <input value={v.name} maxLength={80} onChange={(e) => edit(r.id, { name: e.target.value })} />
                      </label>
                      <label className="field" style={{ flex: '0 0 auto', margin: 0 }}>
                        <span className="field-label">Rank</span>
                        <select value={v.rank} onChange={(e) => edit(r.id, { rank: Number(e.target.value) })}>
                          {RANKS.map((n) => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </label>
                      <label className="field" style={{ flex: '0 0 auto', margin: 0 }}>
                        <span className="field-label">Teaches</span>
                        <select value={v.discipline} onChange={(e) => edit(r.id, { discipline: e.target.value })}>
                          {DISCIPLINES.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
                        </select>
                      </label>
                      <label className="check" style={{ margin: 0 }}>
                        <input type="checkbox" checked={Boolean(v.active)} onChange={(e) => edit(r.id, { active: e.target.checked })} />
                        <span>Active</span>
                      </label>
                      <span className="rev-actions" style={{ marginTop: 0 }}>
                        <button type="button" className="rev-btn approve" disabled={busy || !dirty} onClick={() => save(r)}>Save</button>
                        <button type="button" className="rev-btn reject" disabled={busy} onClick={() => remove(r)}>Remove</button>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}

        <section className="detail-block">
          <h2>Add an instructor</h2>
          <form onSubmit={add} style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' }}>
            <label className="field" style={{ flex: '1 1 180px', margin: 0 }}>
              <span className="field-label">Name</span>
              <input value={adding.name} maxLength={80} required onChange={(e) => setAdding((p) => ({ ...p, name: e.target.value }))} />
            </label>
            <label className="field" style={{ margin: 0 }}>
              <span className="field-label">Teaches</span>
              <select value={adding.discipline} onChange={(e) => setAdding((p) => ({ ...p, discipline: e.target.value }))}>
                {DISCIPLINES.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
              </select>
            </label>
            <label className="field" style={{ margin: 0 }}>
              <span className="field-label">Rank</span>
              <select value={adding.rank} onChange={(e) => setAdding((p) => ({ ...p, rank: Number(e.target.value) }))}>
                {RANKS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <button type="submit" className="rev-btn approve" disabled={busy}>Add</button>
          </form>
        </section>
      </main>
    </div>
  );
}

// same gate screen as app/admin/page.js
function Denied({ message }) {
  return (
    <main className="auth-page">
      <div className="auth-card">
        <Link className="auth-logo" href="/">
          <MtaniLogo className="auth-logo-mark" />
        </Link>
        <h1>Admins only</h1>
        <p className="form-note">{message}</p>
        <p className="auth-foot">
          <Link className="auth-link" href="/login">Sign in</Link> · <Link className="auth-link" href="/">Back to site</Link>
        </p>
      </div>
    </main>
  );
}
