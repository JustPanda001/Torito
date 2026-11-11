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
import InclusionEditor from '@/components/InclusionEditor';
import BookingQuestionsEditor from '@/components/BookingQuestionsEditor';
import OptionsEditor from '@/components/OptionsEditor';
import PlaceSearch from '@/components/PlaceSearch';
import AdminNav from '@/components/AdminNav';
import AdminTripPreview, { FIELD_BLOCK } from '@/components/AdminTripPreview';
import { isTimed, isTimeQuestion, defaultTimeQuestion } from '@/lib/lessons';
import { NO_TIMES, numberLimits } from '@/lib/bookingQuestions';
import { supabase, currentProfile, friendlyError } from '@/lib/supabaseClient';
import { slugify } from '@/lib/slug';
import {
  LESSON, HOURLY_RATES, SUGGESTED_HOURLY_RATES, LESSON_MAX_GROUP, LESSON_MIN_HOURS, LESSON_MAX_HOURS,
  parseGroupSize, formatGroupSize,
  HOURS_ROLE, PEOPLE_ROLE, lessonHours, isHoursQuestion, isPeopleQuestion, defaultHoursQuestion, defaultPeopleQuestion,
} from '@/lib/lessons';

// the "Group size" dropdowns offer 1 to 30 people (tours run bigger groups
// than lessons; a lesson still shows at most LESSON_MAX_GROUP rate boxes)
const GROUP_SIZE_OPTIONS = Array.from({ length: 30 }, (_, i) => i + 1);
// rate boxes a lesson shows before a group size is picked
const DEFAULT_LESSON_GROUP = 4;
import { ITINERARY_MODES, itineraryMode, stepLabel } from '@/lib/itinerary';
import { CATEGORIES } from '@/lib/catalog';

// what the dropdowns show; the stored values stay short
const OPTION_LABELS = {
  ski: 'Winter (ski, snowboard, snowmobile, paragliding…)',
  hiking: 'Hiking',
  camping: 'Camping',
  mountaineering: 'Mountaineering',
  lessons: 'Instructors & schools (lessons)',
  freeride: 'Freeride',
  freestyle: 'Freestyle',
  snowmobile: 'Snowmobile rides',
  paragliding: 'Paragliding',
  unlimited: '∞  Unlimited',
};
import { parseCoord, parsePair } from '@/lib/coords';

// these render as dropdowns backed by tour_options, with a + to add a choice
const OPTION_FIELDS = [
  ['difficulty', 'Difficulty'],
  ['stay', 'Accommodation'],
  ['languages', 'Languages'],
  ['departure_point', 'Departure point'],
  ['transport', 'Transport'],
];

// the dropdown-backed fields a lesson keeps; the rest of OPTION_FIELDS is
// travel (difficulty, stay, transport) and is hidden and saved as null
const LESSON_OPTION_FIELDS = new Set(['languages', 'departure_point']);
const OPTION_HINTS = {
  languages: 'Shown as EN · GE · RU on the trip page. Pick a combination, + adds a new one, edit removes one.',
};

// name -> label; the name must match the tours table column exactly
// Fields a ski or snowboard lesson actually has. A lesson goes nowhere, so
// everything about distance, transport and the shape of a journey is dropped —
// see lib/lessons.js. Anything not listed here is hidden for that category and
// saved as null, rather than sitting empty on the trip page.
const LESSON_FIELDS = new Set([
  'title', 'slug', 'subtitle', 'category', 'subtype', 'region', 'price',
  'duration', 'capacity', 'spots_left', 'season', 'season_from', 'season_to',
  'badge', 'group_size', 'lat', 'lng', 'slot_limit',
]);

// [section title, note, field names] — the form is built from this, so the
// order here is the order of the page it produces
const SECTIONS = [
  ['The basics', 'Title and category decide everything else', ['title', 'category', 'subtype', 'slug', 'subtitle', 'price']],
  ['The facts panel', 'The list beside the photos on the trip page', ['distance', 'duration', 'difficulty', 'capacity', 'slot_limit', 'spots_left', 'elevation_gain', 'season', 'season_from', 'season_to', 'stay', 'languages', 'badge']],
  ['Getting there', 'The grid under "About this trip"', ['departure_point', 'departure_time', 'return_info', 'transport', 'group_size', 'walking_per_day']],
  ['On the map', 'Drives the little map and the weather tile', ['region', 'lat', 'lng', 'strava']],
];

const FIELDS = [
  ['title', 'Title *', { required: true, wide: true, placeholder: 'Mestia – Ushguli Trek' }],
  ['category', 'Category *', { required: true, wide: true, options: CATEGORIES }],
  // ski only: what the visitor is actually booking. A lesson has no journey,
  // so choosing it strips the form down the same way the category used to.
  ['subtype', 'Winter type *', { options: ['', 'lessons', 'freeride', 'freestyle', 'snowmobile', 'paragliding'], wide: true, onlyFor: 'ski' }],
  ['slug', 'URL slug *', { required: true, wide: true, placeholder: 'mestia-ushguli-trek', hint: 'Fills itself from the title — edit it if you want a different address' }],
  ['subtitle', 'Subtitle', { wide: true, placeholder: '4 days' }],
  ['region', 'Region', { placeholder: 'Svaneti' }],
  ['lat', 'Latitude', { placeholder: `43.0451 or 43°02'42.4"N`, hint: 'Paste either form — or paste the whole pair here and the longitude fills itself' }],
  ['lng', 'Longitude', { placeholder: `42.7280 or 42°43'40.8"E` }],
  ['strava', 'Strava route', { wide: true, placeholder: 'https://www.strava.com/routes/123456789', hint: 'Optional. A public route or activity — its map and elevation replace the plain map' }],
  ['price', 'Price per person', { type: 'number', min: 0, placeholder: '890' }],
  ['distance', 'Distance', { placeholder: '58 km' }],
  ['duration', 'Duration', { placeholder: '4 days' }],
  ['capacity', 'Capacity *', { type: 'number', min: 1, required: true, defaultValue: 10 }],
  // team-only: never shown on the trip page. How many separate bookings one
  // time slot takes — one per free instructor or pilot.
  ['slot_limit', 'Bookings per time slot', { options: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '15', '20', 'unlimited'], hint: 'Team only, not shown to customers. For lessons, snowmobile and paragliding' }],
  // Empty = open, no number shown. 0 = fully booked, only the waitlist is
  // offered. A number = shown as "N spots left" and caps one booking's size.
  ['spots_left', 'Spots left', {
    options: ['', '0', ...Array.from({ length: 20 }, (_, i) => String(i + 1))],
    labels: { '': 'Yes — open (no number shown)', 0: 'No — fully booked (waitlist only)' },
    hint: 'Pick a number only if you want customers to see "N spots left"',
  }],
  ['elevation_gain', 'Elevation gain', { placeholder: '2,400 m' }],
  ['season', 'Season', { placeholder: 'June – October' }],
  ['season_from', 'Season starts', { placeholder: '06-01', hint: 'MM-DD — used by the date filter' }],
  ['season_to', 'Season ends', { placeholder: '10-31', hint: 'Winter seasons may wrap, e.g. 12-01 → 04-15' }],
  ['badge', 'Badge', { options: ['', 'top', 'new'] }],
  ['departure_time', 'Departure time', { placeholder: '07:00' }],
  ['return_info', 'Return', { placeholder: 'Day 4, ~21:00 Tbilisi' }],
  ['group_size', 'Group size', { group: true }],
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
  const [category, setCategory] = useState('ski');
  const [itinerary, setItinerary] = useState([]);
  const [included, setIncluded] = useState([]);
  const [excluded, setExcluded] = useState([]);
  // what this trip's booking window asks, beyond a date and a headcount
  const [bookingFields, setBookingFields] = useState([]);
  // the page body, for the section navigator to read its headings from
  const pageRef = useRef(null);
  // versions of the service (10 min / 20 min flight) and the table comparing them
  const [options, setOptions] = useState([]);
  const [compare, setCompare] = useState([]);
  // set once a timed service's time question is removed on purpose, so the
  // default times are not put back when the trip is saved or reopened
  const [noTimes, setNoTimes] = useState(false);
  function editQuestions(next) {
    if (bookingFields.some(isTimeQuestion) && !next.some(isTimeQuestion)) setNoTimes(true);
    if (next.some(isTimeQuestion)) setNoTimes(false);
    setBookingFields(next);
  }
  // a timed service shows its time picker here as an ordinary question, so it
  // can be edited or removed like any other
  function withTimeQuestion(list, cat, sub, optedOut, groupTop = DEFAULT_LESSON_GROUP) {
    let out = list;
    if (!optedOut && isTimed({ category: cat, subtype: sub }) && !out.some(isTimeQuestion)) {
      out = [defaultTimeQuestion(), ...out];
    }
    // a lesson's hours and people counters are questions here too, so their
    // wording and limits can be edited like everything else
    if (cat === 'ski' && sub === LESSON) {
      out = out.map((q) => (q.role ? q
        : isHoursQuestion(q) ? { ...q, role: HOURS_ROLE }
          : isPeopleQuestion(q) ? { ...q, role: PEOPLE_ROLE } : q));
      if (!out.some((q) => q.role === HOURS_ROLE)) out = [...out, defaultHoursQuestion()];
      if (!out.some((q) => q.role === PEOPLE_ROLE)) out = [...out, defaultPeopleQuestion(groupTop)];
    }
    return out;
  }
  // kit the visitor brings themselves, ticked off before they can book
  const [requiredItems, setRequiredItems] = useState([]);
  // lessons only: price per hour for 1, 2, 3 and 4 people, as typed. All
  // empty = no rate table, so the lesson keeps the price-per-person rule.
  const noRates = () => Array.from({ length: LESSON_MAX_GROUP }, () => '');
  const [rates, setRates] = useState(noRates);
  const setRate = (i, value) => setRates((prev) => prev.map((r, j) => (j === i ? value : r)));
  // "Group size" as { min, max, note }, or null when none is set. A lesson
  // shows one rate box per group size up to max.
  const [group, setGroup] = useState(null);
  // an older free-text group size with no number in it ("Small groups"),
  // kept as typed until a size is picked, so saving never wipes it
  const [groupText, setGroupText] = useState('');
  const groupMax = Math.min(LESSON_MAX_GROUP, group?.max ?? DEFAULT_LESSON_GROUP);
  const pickGroup = (key, value) => setGroup((g) => {
    const n = Number(value);
    const next = { min: 1, max: DEFAULT_LESSON_GROUP, note: '', ...g, [key]: n };
    // keep From ≤ To whichever one moved
    if (next.min > next.max) { if (key === 'min') next.max = n; else next.min = n; }
    return next;
  });
  // whether the plan is counted in days or in places visited in one day
  const [itinMode, setItinMode] = useState('days');
  const dayTrip = itinMode === 'stops';
  // ski's second choice, which decides whether this is a lesson
  const [subtype, setSubtype] = useState('');
  const lessonForm = category === 'ski' && subtype === LESSON;
  // the hours a lesson can be booked for, as its hours question says
  const adminHours = lessonHours({ booking_fields: bookingFields });
  const form = useRef(null);
  // once the slug has been typed in by hand, the title stops overwriting it
  const slugTouched = useRef(false);
  // the form is uncontrolled, so the preview reads a copy of it after each change
  const [draft, setDraft] = useState({});
  const [focusField, setFocusField] = useState(null);
  // which block of the preview the focused field belongs to
  const [focusBlock, setFocusBlock] = useState(null);
  // edit() and the after-save reload fill the form from a saved row; the fields
  // a category adds only exist after the next render, so the fill waits for it
  const pendingFill = useRef(null);
  const [fillTick, setFillTick] = useState(0);
  const noteRef = useRef(null);
  const syncPreview = useCallback(() => {
    if (form.current) setDraft(Object.fromEntries(new FormData(form.current).entries()));
  }, []);
  // switching category adds and removes fields
  useEffect(syncPreview, [syncPreview, profile, category, subtype, group]);

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

  useEffect(() => {
    const job = pendingFill.current;
    if (!job) return;
    pendingFill.current = null;
    fillFormValues(job.tour);
    syncPreview();
    if (job.scrollY != null) {
      // after a save: stay where the save button is, with the note in view
      window.scrollTo({ top: job.scrollY });
      requestAnimationFrame(() => noteRef.current?.scrollIntoView({ block: 'nearest' }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fillTick]);

  if (profile === undefined) {
    return <Denied message="Checking your account…" />;
  }
  if (!profile) {
    return <Denied message="You are not signed in." />;
  }
  if (profile.role !== 'admin') {
    return <Denied message={`Signed in as ${profile.email}, but this account is not an admin.`} />;
  }

  function edit(tour, opts = {}) {
    setEditingId(tour.id);
    slugTouched.current = true;
    setCategory(tour.category ?? 'ski');
    const asPairs = (list) => (Array.isArray(list) ? list : []).map((item) => (
      Array.isArray(item) ? { title: item[0], note: item[1] } : item
    ));
    setItinerary(asPairs(tour.itinerary));
    setIncluded(asPairs(tour.included));
    setExcluded(asPairs(tour.excluded));
    {
      const raw = Array.isArray(tour.booking_fields) ? tour.booking_fields : [];
      const optedOut = raw.some((q) => q?.type === NO_TIMES);
      setNoTimes(optedOut);
      // the rate table is a hidden entry in the same list; it is edited in its
      // own boxes, not as a question
      const saved = raw.find((q) => q?.type === HOURLY_RATES)?.rates;
      setRates(noRates().map((_, i) => (Array.isArray(saved) && saved[i] != null ? String(saved[i]) : '')));
      setBookingFields(withTimeQuestion(
        raw.filter((q) => q?.type !== NO_TIMES && q?.type !== HOURLY_RATES),
        tour.category, tour.subtype, optedOut,
        Array.isArray(saved) && saved.length ? saved.length : (parseGroupSize(tour.group_size)?.max ?? DEFAULT_LESSON_GROUP),
      ));
    }
    setGroup(parseGroupSize(tour.group_size));
    setGroupText(parseGroupSize(tour.group_size) ? '' : String(tour.group_size ?? ''));
    setRequiredItems(asPairs(tour.required_items));
    setOptions(Array.isArray(tour.options) ? tour.options.map((o) => ({ ...o, price: o.price ?? '' })) : []);
    setCompare(Array.isArray(tour.compare) ? tour.compare : []);
    setItinMode(itineraryMode({ ...tour, itinerary: asPairs(tour.itinerary) }));
    setSubtype(tour.subtype ?? '');
    setPhotos(Array.isArray(tour.gallery) ? tour.gallery : []);
    setCover(tour.cover_image ?? '');
    pendingFill.current = { tour, scrollY: opts.scrollY ?? null };
    setFillTick((n) => n + 1);
    if (opts.scrollY == null) {
      setNote(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // writes a saved row into the form's inputs
  function fillFormValues(tour) {
    for (const [key, value] of Object.entries(tour)) {
      const input = form.current?.elements[key];
      if (!input) continue;

      if (input.type === 'checkbox') { input.checked = Boolean(value); continue; }

      const v = value == null ? '' : String(value);
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
  }

  function onCoordInput(e) {
    const pair = parsePair(e.target.value);
    if (!pair) return;
    const [lat, lng] = pair;
    e.target.value = String(lat);
    const other = form.current?.elements.lng;
    if (other) other.value = String(lng);
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
    setCategory('ski');
    setSubtype('');
    setItinerary([]);
    setIncluded([]);
    setExcluded([]);
    setBookingFields([]);
    setNoTimes(false);
    setRequiredItems([]);
    setRates(noRates());
    setGroup(null);
    setGroupText('');
    setOptions([]);
    setCompare([]);
    setItinMode('days');
    form.current?.reset();
    syncPreview();
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

    // options: drop half-written rows; the cheapest one becomes the service's
    // own price, so anything still reading tour.price shows "from" that
    row.options = options
      .map((o) => ({
        name: (o.name ?? '').trim(),
        price: Number(o.price),
        duration: (o.duration ?? '').trim(),
        note: (o.note ?? '').trim(),
      }))
      .filter((o) => o.name && o.price !== null && String(o.price) !== '' && Number.isFinite(o.price));
    row.compare = row.options.length
      ? compare
        .map((r) => ({
          feature: (r.feature ?? '').trim(),
          values: row.options.map((_, i) => String(r.values?.[i] ?? '').trim()),
        }))
        .filter((r) => r.feature)
      : [];
    if (row.options.length) row.price = Math.min(...row.options.map((o) => o.price));
    // empty means "no map on this trip", which is not the same as zero
    row.lat = parseCoord(row.lat);
    row.lng = parseCoord(row.lng);
    if (row.badge === '') row.badge = null;

    if (lessonForm) {
      for (const [name] of FIELDS) if (!LESSON_FIELDS.has(name)) row[name] = null;
      for (const [name] of OPTION_FIELDS) if (!LESSON_OPTION_FIELDS.has(name)) row[name] = null;
    }
    if (row.subtype === '') row.subtype = null;

    const pairs = (rows) => rows
      .filter((r) => (r.title ?? '').trim())
      .map((r) => [r.title.trim(), (r.note ?? '').trim()]);

    row.itinerary = pairs(itinerary);
    row.included = pairs(included);
    row.excluded = pairs(excluded);
    row.required_items = pairs(requiredItems);
    row.itinerary_mode = itinMode;

    // a question still being typed — no label yet, or a "pick one" with
    // nothing to pick from — is dropped rather than saved half-made
    row.booking_fields = bookingFields
      .map((q) => ({
        label: (q.label ?? '').trim(),
        type: q.type ?? 'choice',
        options: (q.options ?? []).map((o) => String(o).trim()).filter(Boolean),
        required: Boolean(q.required),
        hint: (q.hint ?? '').trim(),
        hintStrong: Boolean(q.hintStrong),
        ...numberLimits({ ...q, type: q.type ?? 'choice' }),
        ...(q.role && (q.type ?? 'choice') === 'number' ? { role: q.role } : {}),
      }))
      .filter((q) => q.label && (q.type !== 'choice' || q.options.length > 0));
    if (noTimes && isTimed(row) && !row.booking_fields.some(isTimeQuestion)) {
      row.booking_fields.push({ label: 'no times', type: NO_TIMES });
    }
    // a lesson's rate table: one rate per group size up to Group size's
    // maximum, all filled in, or none at all
    if (lessonForm) {
      const typed = rates.slice(0, groupMax).map((r) => String(r ?? '').trim());
      if (typed.some((r) => r !== '')) {
        const nums = typed.map(Number);
        if (typed.some((r) => r === '') || !nums.every((n) => Number.isFinite(n) && n > 0)) {
          setNote({ error: true, text: `Price per hour: fill in all ${groupMax} rates with a number above 0, or leave them all empty.` });
          return;
        }
        row.booking_fields.push({ type: HOURLY_RATES, rates: nums });
      }
    }

    row.gallery = photos;
    // a starred photo wins; otherwise fall back to the first one
    row.cover_image = cover || photos[0] || null;

    const scrollY = window.scrollY;
    const wasEditing = editingId;
    setSaving(true);
    const { error } = editingId
      ? await supabase.from('tours').update(row).eq('id', editingId)
      : await supabase.from('tours').insert(row);
    setSaving(false);

    if (error) { setNote({ error: true, text: friendlyError(error) }); return; }

    // stay on this trip: read the saved row back and put it in the form, so
    // what is on screen is what is stored (and a new trip becomes an edit)
    const fresh = wasEditing
      ? await supabase.from('tours').select('*').eq('id', wasEditing).maybeSingle()
      : await supabase.from('tours').select('*').eq('slug', row.slug).maybeSingle();
    load();
    if (fresh.error || !fresh.data) {
      setNote({ error: false, text: wasEditing ? 'Changes saved.' : `Added "${row.title}".` });
      return;
    }
    edit(fresh.data, { scrollY });
    setNote({ error: false, text: wasEditing ? 'Changes saved.' : `Added "${row.title}". You are now editing it.` });
  }

  return (
    <div className="subpage-shell">
      <SiteHeader solid />
      <main className="detail-page admin-page" ref={pageRef}>
        <div className="listing-head">
          <h1>Manage tours</h1>
          <p className="listing-count">{tours.length} tours</p>
        </div>

        {/* the section list down the left, the form beside it */}
        <div className="admin-layout">
        <AdminNav rootRef={pageRef} />
        <div className="admin-main">

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

          <div className="admin-edit">
          <form
            className="admin-form"
            ref={form}
            onSubmit={onSubmit}
            onChange={syncPreview}
            onFocus={(e) => {
              const el = e.target;
              const sec = el.closest?.('[data-pv]');
              // fields inside the list editors only pick the preview block
              setFocusField(sec ? (el.name === 'summary' ? 'summary' : null) : (el.name || null));
              const b = sec?.dataset.pv || FIELD_BLOCK[el.name];
              if (b) setFocusBlock(b);
            }}
            onBlur={() => setFocusField(null)}
          >
            {SECTIONS.map(([sectionTitle, sectionHint, names]) => {
              const fields = FIELDS
                .filter(([name]) => names.includes(name))
                .filter(([, , opts = {}]) => !opts.onlyFor || opts.onlyFor === category)
                .filter(([name]) => !lessonForm || LESSON_FIELDS.has(name));

              // the dropdown-backed fields sit in whichever section names them
              const options = OPTION_FIELDS
                .filter(([name]) => names.includes(name))
                .filter(([name]) => !lessonForm || LESSON_OPTION_FIELDS.has(name));

              // a section whose every field belongs to another category would
              // otherwise render as a heading over nothing
              if (!fields.length && !options.length) return null;

              return (
                <section className="admin-section" key={sectionTitle}>
                  <div className="admin-section-head">
                    <h3>{sectionTitle}</h3>
                    <span className="field-hint">{sectionHint}</span>
                  </div>
                  {sectionTitle === 'On the map' && (
                    <PlaceSearch
                      onPick={({ lat, lng, name }) => {
                        const el = form.current?.elements;
                        if (!el) return;
                        el.lat.value = lat;
                        el.lng.value = lng;
                        // picking a place is a deliberate choice, so it sets the region
                        // too; it can still be typed over afterwards
                        if (el.region) el.region.value = name;
                      }}
                    />
                  )}
                  <div className="admin-grid">
                    {fields.map(([name, label, opts = {}]) => (
                <label className={`field${opts.wide ? ' wide' : ''}`} key={name}>
                  <span className="field-label">{label}</span>
                  {opts.group ? (
                    <span className="group-size-pick">
                      {/* the column keeps its "1 – 5 people" text; the dropdowns write it */}
                      <input type="hidden" name={name} value={group ? formatGroupSize(group) : groupText} readOnly />
                      <select aria-label="Group size from" value={group?.min ?? ''} onChange={(e) => pickGroup('min', e.target.value)}>
                        {!group && <option value="">From</option>}
                        {GROUP_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
                      </select>
                      <span aria-hidden="true">–</span>
                      <select aria-label="Group size to" value={group?.max ?? ''} onChange={(e) => pickGroup('max', e.target.value)}>
                        {!group && <option value="">To</option>}
                        {GROUP_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
                      </select>
                      <span>people</span>
                      {group && (
                        <button type="button" className="chip" onClick={() => { setGroup(null); setGroupText(''); }}>Clear</button>
                      )}
                      {!group && groupText && <span className="field-hint">Now: “{groupText}”</span>}
                    </span>
                  ) : opts.options ? (
                    <select
                      name={name}
                      required={opts.required}
                      defaultValue=""
                      onChange={
                        name === 'category' ? (e) => { setCategory(e.target.value); setSubtype(''); }
                          : name === 'subtype' ? (e) => {
                            setSubtype(e.target.value);
                            setBookingFields((list) => withTimeQuestion(list, category, e.target.value, noTimes, groupMax));
                          }
                            : undefined
                      }
                    >
                      {opts.options.map((o) => (
                        <option value={o} key={o || 'none'}>{opts.labels?.[o] ?? OPTION_LABELS[o] ?? (o === '' ? 'None' : o)}</option>
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
                            : name === 'lat' ? onCoordInput
                              : undefined
                      }
                    />
                  )}
                  {opts.hint && <span className="field-hint">{opts.hint}</span>}
                </label>
                    ))}

                    {options.map(([name, label]) => (
                      <OptionSelect
                        key={name}
                        name={name}
                        field={name}
                        label={name === 'departure_point' && lessonForm ? 'Meeting point' : label}
                        hint={name === 'departure_point' && lessonForm
                          ? 'Where the instructor meets the group. Shown as MEETING POINT on the lesson page.'
                          : OPTION_HINTS[name]}
                      />
                    ))}
                  </div>
                </section>
              );
            })}

            {lessonForm && (
              <section className="admin-section" data-pv="facts">
                <div className="admin-section-head">
                  <h3>Price per hour</h3>
                  <span className="field-hint">
                    Customers pick {adminHours.min} to {adminHours.max} hours (set in the hours question below) and up to {groupMax} people (set by Group size).
                    Total = rate for the group × hours. Leave all empty to use the price per person instead.
                  </span>
                </div>
                <div className="admin-grid">
                  {rates.slice(0, groupMax).map((value, i) => (
                    <label className="field" key={i}>
                      <span className="field-label">{i + 1} {i === 0 ? 'person' : 'people'} — ₾ per hour</span>
                      {/* no name: these are saved into booking_fields, not as columns */}
                      <input
                        type="number"
                        min={1}
                        inputMode="decimal"
                        value={value}
                        placeholder={String(SUGGESTED_HOURLY_RATES[i])}
                        onChange={(e) => setRate(i, e.target.value)}
                      />
                      {Number(value) > 0 && (
                        <span className="field-hint">{adminHours.min} h = {Number(value) * adminHours.min} ₾</span>
                      )}
                    </label>
                  ))}
                </div>
                {rates.slice(0, groupMax).every((r) => String(r).trim() === '') && (
                  <button
                    type="button"
                    className="chip"
                    onClick={() => setRates(noRates().map((_, i) => (i < groupMax ? String(SUGGESTED_HOURLY_RATES[i]) : '')))}
                  >
                    Fill in {SUGGESTED_HOURLY_RATES.slice(0, groupMax).join(' / ')} ₾
                  </button>
                )}
              </section>
            )}

            <section className="admin-section" data-pv="photos">
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

            <section className="admin-section" data-pv="about">
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
              <section className="admin-section" data-pv="about">
                <PairListEditor
                  label="Where we go"
                  hint={dayTrip
                    ? 'One row per place, in the order you reach them'
                    : 'One row per day, in order'}
                  rows={itinerary}
                  onChange={setItinerary}
                  titleLabel={dayTrip ? 'Jvari Pass' : 'Tbilisi → Mestia'}
                  notePlaceholder={dayTrip ? 'What you see there' : 'What happens that day'}
                  numberLabel={(i) => stepLabel(itinMode, i)}
                  addLabel={dayTrip ? 'Add a place' : 'Add a day'}
                  headExtra={(
                    <div className="pair-mode">
                      {ITINERARY_MODES.map(([value, label, note]) => (
                        <button
                          key={value}
                          type="button"
                          title={note}
                          className={`chip small${itinMode === value ? ' active' : ''}`}
                          onClick={() => setItinMode(value)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                />
              </section>
            )}

            <section className="admin-section" data-pv="included">
              <InclusionEditor kind="included" category={category} rows={included} onChange={setIncluded} />
            </section>

            <section className="admin-section" data-pv="included">
              <InclusionEditor kind="excluded" category={category} rows={excluded} onChange={setExcluded} />
            </section>

            <section className="admin-section" data-pv="bring">
              <PairListEditor
                label="What they must bring"
                hint="Kit without which they cannot come. Shown on the trip page, and every line has to be ticked before the booking window will send a request."
                rows={requiredItems}
                onChange={setRequiredItems}
                titleLabel="Sleeping bag"
                notePlaceholder="Rated to −5 °C — the huts are cold in September"
                addLabel="Add an item"
              />
            </section>

            <section className="admin-section" data-pv="facts">
              <OptionsEditor
                options={options}
                compare={compare}
                onChange={(o, c) => { setOptions(o); setCompare(c); }}
              />
            </section>

            <section className="admin-section" data-pv="booking">
              <BookingQuestionsEditor rows={bookingFields} onChange={editQuestions} />
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

            {note && <p ref={noteRef} className={`form-note${note.error ? ' error' : ''}`}>{note.text}</p>}
          </form>

          <AdminTripPreview
            focus={focusField}
            block={focusBlock}
            row={{
              booking_fields: bookingFields,
              ...draft,
              slug: draft.slug || 'preview',
              category,
              subtype,
              capacity: Number(draft.capacity),
              spots_left: draft.spots_left ? Number(draft.spots_left) : draft.spots_left === '0' ? 0 : null,
              price: draft.price ? Number(draft.price) : null,
              badge: draft.badge || null,
              options: options.filter((o) => o.name).map((o) => ({ ...o, price: Number(o.price) })),
              compare,
              gallery: photos,
              cover_image: cover || photos[0] || null,
              itinerary: itinerary.map((r) => [r.title, r.note]),
              itinerary_mode: itinMode,
              included,
              excluded,
              required_items: requiredItems.filter((r) => r.title).map((r) => [r.title, r.note]),
            }}
          />
          </div>
        </section>

        <section className="detail-block">
          <h2>Existing tours</h2>
          {tours.length === 0 && <p className="form-note">No tours yet. Add one above.</p>}
          {tours.map((t) => (
            <div className="admin-row" key={t.id}>
              <Link className="admin-row-link" href={`/activities/${t.slug}`} target="_blank" rel="noreferrer">
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
                <Link className="chip" href={`/activities/${t.slug}`} target="_blank" rel="noreferrer">View</Link>
                <button className="chip" type="button" onClick={() => edit(t)}>Edit</button>
                <button className="chip danger" type="button" onClick={() => remove(t.id, t.title)}>Delete</button>
              </div>
            </div>
          ))}
        </section>
        </div>
        </div>
      </main>
    </div>
  );
}

function Denied({ message }) {
  return (
    <main className="auth-page">
      <div className="auth-card">
        <Link className="auth-logo" href="/">
          <img src="/assets/mtani-mark.svg" alt="" /><span>MTANI</span>
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
