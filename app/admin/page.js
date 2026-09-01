'use client';

// Admin panel: add, edit and delete tours.
//
// The gate below only hides the UI — the row-level security rules in
// supabase-schema.sql are what actually stop a non-admin writing anything, so
// bypassing this page achieves nothing.

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import OptionSelect from '@/components/OptionSelect';
import PhotoManager from '@/components/PhotoManager';
import PairListEditor from '@/components/PairListEditor';
import { supabase, currentProfile, friendlyError } from '@/lib/supabaseClient';
import { slugify } from '@/lib/slug';
import { LESSON } from '@/lib/lessons';
import { CATEGORIES } from '@/lib/catalog';

// these render as dropdowns backed by tour_options, with a + to add a choice
const OPTION_FIELDS = [
  ['difficulty', 'Difficulty'],
  ['stay', 'Accommodation'],
  ['languages', 'Languages'],
  ['departure_point', 'Departure point'],
  ['transport', 'Transport'],
];

// name -> label; the name must match the tours table column exactly
// Fields a ski or snowboard lesson actually has. A lesson goes nowhere, so
// everything about distance, transport and the shape of a journey is dropped —
// see lib/lessons.js. Anything not listed here is hidden for that category and
// saved as null, rather than sitting empty on the trip page.
const LESSON_FIELDS = new Set([
  'title', 'slug', 'subtitle', 'category', 'subtype', 'region', 'price',
  'duration', 'capacity', 'spots_left', 'season', 'season_from', 'season_to',
  'badge', 'group_size', 'lat', 'lng',
]);

// [section title, note, field names] — the form is built from this, so the
// order here is the order of the page it produces
const SECTIONS = [
  ['The basics', 'Title and category decide everything else', ['title', 'category', 'subtype', 'slug', 'subtitle', 'region', 'price']],
  ['The facts panel', 'The list beside the photos on the trip page', ['distance', 'duration', 'difficulty', 'capacity', 'spots_left', 'elevation_gain', 'season', 'season_from', 'season_to', 'stay', 'languages', 'badge']],
  ['Getting there', 'The grid under "About this trip"', ['departure_point', 'departure_time', 'return_info', 'transport', 'group_size', 'walking_per_day']],
  ['On the map', 'Drives the little map and the weather tile', ['lat', 'lng', 'strava']],
];

const FIELDS = [
  ['title', 'Title *', { required: true, placeholder: 'Mestia – Ushguli Trek' }],
  ['category', 'Category *', { required: true, options: CATEGORIES }],
  // ski only: what the visitor is actually booking. A lesson has no journey,
  // so choosing it strips the form down the same way the category used to.
  ['subtype', 'Type *', { options: ['', 'lessons', 'freeride', 'freestyle'], onlyFor: 'ski' }],
  ['slug', 'URL slug *', { required: true, placeholder: 'mestia-ushguli-trek', hint: 'Fills itself from the title — edit it if you want a different address' }],
  ['subtitle', 'Subtitle', { placeholder: '4 days' }],
  ['region', 'Region', { placeholder: 'Svaneti' }],
  ['lat', 'Latitude', { type: 'number', step: 'any', placeholder: '43.0451', hint: 'Right-click the spot in Google Maps and copy the first number' }],
  ['lng', 'Longitude', { type: 'number', step: 'any', placeholder: '42.7280', hint: 'The second number from the same copy' }],
  ['strava', 'Strava route', { placeholder: 'https://www.strava.com/routes/123456789', hint: 'Optional. A public route or activity — its map and elevation replace the plain map' }],
  ['price', 'Price per person', { type: 'number', min: 0, placeholder: '890' }],
  ['distance', 'Distance', { placeholder: '58 km' }],
  ['duration', 'Duration', { placeholder: '4 days' }],
  ['capacity', 'Capacity *', { type: 'number', min: 1, required: true, defaultValue: 10 }],
  ['spots_left', 'Spots left', { type: 'number', min: 0, placeholder: '5' }],
  ['elevation_gain', 'Elevation gain', { placeholder: '2,400 m' }],
  ['season', 'Season', { placeholder: 'June – October' }],
  ['season_from', 'Season starts', { placeholder: '06-01', hint: 'MM-DD — used by the date filter' }],
  ['season_to', 'Season ends', { placeholder: '10-31', hint: 'Winter seasons may wrap, e.g. 12-01 → 04-15' }],
  ['badge', 'Badge', { options: ['', 'top', 'new'] }],
  ['departure_time', 'Departure time', { placeholder: '07:00' }],
  ['return_info', 'Return', { placeholder: 'Day 4, ~21:00 Tbilisi' }],
  ['group_size', 'Group size', { placeholder: '6 – 12 people' }],
  ['walking_per_day', 'Walking per day', { placeholder: '5 – 7 hours' }],
];

export default function AdminPage() {
  const [profile, setProfile] = useState(undefined);   // undefined = still checking
  const [tours, setTours] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [note, setNote] = useState(null);
  const [saving, setSaving] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [cover, setCover] = useState('');
  // drives which fields the form shows; lessons need far fewer
  const [category, setCategory] = useState('tours');
  const [itinerary, setItinerary] = useState([]);
  const [included, setIncluded] = useState([]);
  const [excluded, setExcluded] = useState([]);
  // ski's second choice, which decides whether this is a lesson
  const [subtype, setSubtype] = useState('');
  const lessonForm = category === 'ski' && subtype === LESSON;
  const form = useRef(null);
  // once the slug has been typed in by hand, the title stops overwriting it
  const slugTouched = useRef(false);

  useEffect(() => {
    // ?mockuser=admin renders the panel without a real session so the form can
    // be checked locally. Dev only — never true in production.
    if (process.env.NODE_ENV !== 'production'
        && typeof window !== 'undefined'
        && new URLSearchParams(window.location.search).get('mockuser') === 'admin') {
      setProfile({ id: 'mock', full_name: 'Sandro Phkhaladze', email: 'justpanda001@gmail.com', role: 'admin' });
      return;
    }
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
    slugTouched.current = true;
    setCategory(tour.category ?? 'tours');
    const asPairs = (list) => (Array.isArray(list) ? list : []).map((item) => (
      Array.isArray(item) ? { title: item[0], note: item[1] } : item
    ));
    setItinerary(asPairs(tour.itinerary));
    setIncluded(asPairs(tour.included));
    setExcluded(asPairs(tour.excluded));
    setSubtype(tour.subtype ?? '');
    setPhotos(Array.isArray(tour.gallery) ? tour.gallery : []);
    setCover(tour.cover_image ?? '');
    for (const [key, value] of Object.entries(tour)) {
      const input = form.current?.elements[key];
      if (!input) continue;

      if (input.type === 'checkbox') { input.checked = Boolean(value); continue; }

      const v = value ?? '';
      // A dropdown can only take a value it already lists. A tour saved with an
      // option that has since been removed would otherwise blank the field on
      // edit and quietly wipe it on save, so add it back for this row.
      if (input.tagName === 'SELECT' && v !== ''
          && !Array.from(input.options).some((o) => o.value === v)) {
        const opt = document.createElement('option');
        opt.value = v;
        opt.textContent = v;
        input.appendChild(opt);
      }
      input.value = v;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function onTitleInput(e) {
    // an existing trip keeps its address: changing it would 404 every link
    // already shared, including the ones sitting in the chat inbox
    if (editingId || slugTouched.current) return;
    const slug = form.current?.elements.slug;
    if (slug) slug.value = slugify(e.target.value);
  }

  function resetForm() {
    setEditingId(null);
    setPhotos([]);
    setCover('');
    slugTouched.current = false;
    setCategory('tours');
    setSubtype('');
    setItinerary([]);
    setIncluded([]);
    setExcluded([]);
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
    // empty means "no map on this trip", which is not the same as zero
    row.lat = row.lat === '' ? null : Number(row.lat);
    row.lng = row.lng === '' ? null : Number(row.lng);
    if (row.badge === '') row.badge = null;

    if (lessonForm) {
      for (const [name] of FIELDS) if (!LESSON_FIELDS.has(name)) row[name] = null;
    }
    if (row.subtype === '') row.subtype = null;

    const pairs = (rows) => rows
      .filter((r) => (r.title ?? '').trim())
      .map((r) => [r.title.trim(), (r.note ?? '').trim()]);

    row.itinerary = pairs(itinerary);
    row.included = pairs(included);
    row.excluded = pairs(excluded);

    row.gallery = photos;
    // a starred photo wins; otherwise fall back to the first one
    row.cover_image = cover || photos[0] || null;

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
          {lessonForm && (
            <p className="form-note">
              Lessons ask the visitor for the day, time, how many of them there
              are, their skill level and the kind of lesson when they book, so
              none of that is set here. The travel fields are hidden too, since
              a lesson goes nowhere — set those on a freeride week instead.
            </p>
          )}

          <form className="admin-form" ref={form} onSubmit={onSubmit}>
            {SECTIONS.map(([sectionTitle, sectionHint, names]) => {
              const fields = FIELDS
                .filter(([name]) => names.includes(name))
                .filter(([, , opts = {}]) => !opts.onlyFor || opts.onlyFor === category)
                .filter(([name]) => !lessonForm || LESSON_FIELDS.has(name));

              // the dropdown-backed fields sit in whichever section names them
              const options = lessonForm
                ? []
                : OPTION_FIELDS.filter(([name]) => names.includes(name));

              // a section whose every field belongs to another category would
              // otherwise render as a heading over nothing
              if (!fields.length && !options.length) return null;

              return (
                <section className="admin-section" key={sectionTitle}>
                  <div className="admin-section-head">
                    <h3>{sectionTitle}</h3>
                    <span className="field-hint">{sectionHint}</span>
                  </div>
                  <div className="admin-grid">
                    {fields.map(([name, label, opts = {}]) => (
                <label className="field" key={name}>
                  <span className="field-label">{label}</span>
                  {opts.options ? (
                    <select
                      name={name}
                      required={opts.required}
                      defaultValue=""
                      onChange={
                        name === 'category' ? (e) => { setCategory(e.target.value); setSubtype(''); }
                          : name === 'subtype' ? (e) => setSubtype(e.target.value)
                            : undefined
                      }
                    >
                      {opts.options.map((o) => (
                        <option value={o} key={o || 'none'}>{o === '' ? 'None' : o}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      name={name}
                      type={opts.type || 'text'}
                      min={opts.min}
                      step={opts.step}
                      required={opts.required}
                      placeholder={opts.placeholder}
                      defaultValue={opts.defaultValue}
                      onChange={
                        name === 'title' ? onTitleInput
                          : name === 'slug' ? () => { slugTouched.current = true; }
                            : undefined
                      }
                    />
                  )}
                  {opts.hint && <span className="field-hint">{opts.hint}</span>}
                </label>
                    ))}

                    {options.map(([name, label]) => (
                      <OptionSelect key={name} name={name} field={name} label={label} />
                    ))}
                  </div>
                </section>
              );
            })}

            <section className="admin-section">
              <div className="admin-section-head">
                <h3>Photos</h3>
                <span className="field-hint">The first is the cover, shown on the listing card</span>
              </div>
              <PhotoManager
                photos={photos}
                cover={cover}
                onChange={({ photos: p, cover: c }) => { setPhotos(p); setCover(c); }}
              />
            </section>

            <section className="admin-section">
              <div className="admin-section-head">
                <h3>About this trip</h3>
                <span className="field-hint">The paragraph under the photos</span>
              </div>
              <label className="field">
                <span className="field-label">Summary</span>
                <textarea name="summary" rows={3} placeholder="What the trip is, in a couple of sentences." />
              </label>
            </section>

            {!lessonForm && (
              <section className="admin-section">
                <PairListEditor
                  label="Where we go"
                  hint="One row per day, in order"
                  rows={itinerary}
                  onChange={setItinerary}
                  titleLabel="Tbilisi → Mestia"
                  notePlaceholder="What happens that day"
                  numbered
                  addLabel="Add a day"
                />
              </section>
            )}

            <section className="admin-section">
              <PairListEditor
                label="What's included"
                hint="Ticked items on the trip page"
                rows={included}
                onChange={setIncluded}
                titleLabel="2 mountain guides"
                notePlaceholder="Certified, first-aid trained"
                addLabel="Add an inclusion"
              />
            </section>

            <section className="admin-section">
              <PairListEditor
                label="Not included"
                hint="Crossed-out items, so nobody is surprised on the day"
                rows={excluded}
                onChange={setExcluded}
                titleLabel="Travel insurance"
                notePlaceholder="Required — arrange before arrival"
                addLabel="Add an exclusion"
              />
            </section>

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
              <Link className="admin-row-link" href={`/tours/${t.slug}`} target="_blank" rel="noreferrer">
                <img src={t.cover_image || '/assets/hero.svg'} alt="" />
                <div className="admin-row-main">
                  <strong>{t.title}</strong>
                  <span>
                    {t.region || '—'} · {t.duration || '—'} · {t.capacity} people
                    {!t.published && ' · draft'}
                  </span>
                </div>
              </Link>
              <div className="admin-row-btns">
                <Link className="chip" href={`/tours/${t.slug}`} target="_blank" rel="noreferrer">View</Link>
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
