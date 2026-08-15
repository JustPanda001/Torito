'use client';

// Admin panel: add, edit and delete tours.
//
// The gate below only hides the UI — the row-level security rules in
// supabase-schema.sql are what actually stop a non-admin writing anything, so
// bypassing this page achieves nothing.

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import { supabase, currentProfile, friendlyError } from '@/lib/supabaseClient';

// name -> label; the name must match the tours table column exactly
const FIELDS = [
  ['title', 'Title *', { required: true, placeholder: 'Mestia – Ushguli Trek' }],
  ['slug', 'URL slug *', { required: true, placeholder: 'mestia-ushguli-trek', hint: 'Lowercase, dashes instead of spaces' }],
  ['subtitle', 'Subtitle', { placeholder: '4 days' }],
  ['category', 'Category *', { required: true, options: ['hiking', 'camping', 'ski', 'culture', 'other'] }],
  ['region', 'Region', { placeholder: 'Svaneti' }],
  ['cover_image', 'Cover image', { placeholder: '/assets/svaneti.jpg' }],
  ['price', 'Price per person', { type: 'number', min: 0, placeholder: '890' }],
  ['distance', 'Distance', { placeholder: '58 km' }],
  ['duration', 'Duration', { placeholder: '4 days' }],
  ['difficulty', 'Difficulty', { placeholder: 'Moderate' }],
  ['capacity', 'Capacity *', { type: 'number', min: 1, required: true, defaultValue: 10 }],
  ['spots_left', 'Spots left', { type: 'number', min: 0, placeholder: '5' }],
  ['elevation_gain', 'Elevation gain', { placeholder: '2,400 m' }],
  ['season', 'Season', { placeholder: 'June – October' }],
  ['season_from', 'Season starts', { placeholder: '06-01', hint: 'MM-DD — used by the date filter' }],
  ['season_to', 'Season ends', { placeholder: '10-31', hint: 'Winter seasons may wrap, e.g. 12-01 → 04-15' }],
  ['languages', 'Languages', { placeholder: 'EN · GE · RU' }],
  ['stay', 'Accommodation', { placeholder: 'Guesthouses' }],
  ['badge', 'Badge', { options: ['', 'top', 'new'] }],
  ['departure_point', 'Departure point', { placeholder: 'Tbilisi, Liberty Square' }],
  ['departure_time', 'Departure time', { placeholder: '07:00' }],
  ['return_info', 'Return', { placeholder: 'Day 4, ~21:00 Tbilisi' }],
  ['transport', 'Transport', { placeholder: 'Minibus + 4x4' }],
  ['group_size', 'Group size', { placeholder: '6 – 12 people' }],
  ['walking_per_day', 'Walking per day', { placeholder: '5 – 7 hours' }],
];

export default function AdminPage() {
  const [profile, setProfile] = useState(undefined);   // undefined = still checking
  const [tours, setTours] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [note, setNote] = useState(null);
  const [saving, setSaving] = useState(false);
  const form = useRef(null);

  useEffect(() => {
    currentProfile().then(setProfile).catch(() => setProfile(null));
  }, []);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('tours').select('*').order('created_at', { ascending: false });
    if (error) { setNote({ error: true, text: friendlyError(error) }); return; }
    setTours(data ?? []);
  }, []);

  useEffect(() => { if (profile?.role === 'admin') load(); }, [profile, load]);

  if (profile === undefined) {
    return <Denied message="Checking your account…" />;
  }
  if (!profile) {
    return <Denied message="You are not signed in." />;
  }
  if (profile.role !== 'admin') {
    return <Denied message={`Signed in as ${profile.email}, but this account is not an admin.`} />;
  }

  function edit(tour) {
    setEditingId(tour.id);
    for (const [key, value] of Object.entries(tour)) {
      const input = form.current?.elements[key];
      if (!input) continue;
      if (input.type === 'checkbox') input.checked = Boolean(value);
      else input.value = value ?? '';
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetForm() {
    setEditingId(null);
    form.current?.reset();
    setNote(null);
  }

  async function remove(id, title) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    const { error } = await supabase.from('tours').delete().eq('id', id);
    if (error) setNote({ error: true, text: friendlyError(error) });
    else { setNote({ error: false, text: `Deleted "${title}".` }); load(); }
  }

  async function onSubmit(e) {
    e.preventDefault();
    const row = Object.fromEntries(new FormData(e.currentTarget).entries());

    row.published = e.currentTarget.elements.published.checked;
    row.capacity = Number(row.capacity);
    row.spots_left = row.spots_left === '' ? null : Number(row.spots_left);
    row.price = row.price === '' ? null : Number(row.price);
    if (row.badge === '') row.badge = null;

    setSaving(true);
    const { error } = editingId
      ? await supabase.from('tours').update(row).eq('id', editingId)
      : await supabase.from('tours').insert(row);
    setSaving(false);

    if (error) { setNote({ error: true, text: friendlyError(error) }); return; }

    setNote({ error: false, text: editingId ? 'Changes saved.' : `Added "${row.title}".` });
    resetForm();
    load();
  }

  return (
    <div className="subpage-shell">
      <SiteHeader solid />
      <main className="detail-page">
        <div className="listing-head">
          <h1>Manage tours</h1>
          <p className="listing-count">{tours.length} tours</p>
        </div>

        <section className="detail-block">
          <h2>{editingId ? 'Editing tour' : 'Add a tour'}</h2>

          <form className="admin-form" ref={form} onSubmit={onSubmit}>
            <div className="admin-grid">
              {FIELDS.map(([name, label, opts = {}]) => (
                <label className="field" key={name}>
                  <span className="field-label">{label}</span>
                  {opts.options ? (
                    <select name={name} required={opts.required} defaultValue="">
                      {opts.options.map((o) => (
                        <option value={o} key={o || 'none'}>{o === '' ? 'None' : o}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      name={name}
                      type={opts.type || 'text'}
                      min={opts.min}
                      required={opts.required}
                      placeholder={opts.placeholder}
                      defaultValue={opts.defaultValue}
                    />
                  )}
                  {opts.hint && <span className="field-hint">{opts.hint}</span>}
                </label>
              ))}
            </div>

            <label className="field">
              <span className="field-label">Summary</span>
              <textarea name="summary" rows={3} placeholder="What the trip is, in a couple of sentences." />
            </label>

            <label className="check">
              <input type="checkbox" name="published" defaultChecked />
              <span>Published (visible on the site)</span>
            </label>

            <div className="admin-actions">
              <button className="auth-btn" type="submit" disabled={saving}>
                {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add tour'}
              </button>
              {editingId && (
                <button className="auth-btn google" type="button" onClick={resetForm}>Cancel edit</button>
              )}
            </div>

            {note && <p className={`form-note${note.error ? ' error' : ''}`}>{note.text}</p>}
          </form>
        </section>

        <section className="detail-block">
          <h2>Existing tours</h2>
          {tours.length === 0 && <p className="form-note">No tours yet. Add one above.</p>}
          {tours.map((t) => (
            <div className="admin-row" key={t.id}>
              <img src={t.cover_image || '/assets/hero.svg'} alt="" />
              <div className="admin-row-main">
                <strong>{t.title}</strong>
                <span>
                  {t.region || '—'} · {t.duration || '—'} · {t.capacity} people
                  {!t.published && ' · draft'}
                </span>
              </div>
              <div className="admin-row-btns">
                <button className="chip" type="button" onClick={() => edit(t)}>Edit</button>
                <button className="chip danger" type="button" onClick={() => remove(t.id, t.title)}>Delete</button>
              </div>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}

function Denied({ message }) {
  return (
    <main className="auth-page">
      <div className="auth-card">
        <Link className="auth-logo" href="/">
          <img src="/assets/torito-logo.png" alt="" /><span>TORITO</span>
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
