'use client';

// Trip photos for the admin form: pick several at once, star the one that
// becomes the cover, drag to reorder, remove.
//
// Files go to the tour-photos storage bucket and only their public URLs are
// kept on the tour row, so the same photo can be reused across trips.

import { useRef, useState } from 'react';
import { supabase, friendlyError } from '@/lib/supabaseClient';

const BUCKET = 'tour-photos';

// storage keys must be url-safe; the originals are full of spaces and brackets
const safeName = (name) => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-`
  + name.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/^-+|-+$/g, '');

export default function PhotoManager({ photos, cover, onChange }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState('');
  const [dragFrom, setDragFrom] = useState(null);
  const fileInput = useRef(null);

  async function addFiles(files) {
    const list = [...files].filter((f) => f.type.startsWith('image/'));
    if (!list.length) return;

    setBusy(true);
    setError(null);
    const added = [];

    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      setProgress(`Uploading ${i + 1} of ${list.length}…`);

      // compute the key once: safeName() is random, so calling it again would
      // build a public URL pointing at a key that was never uploaded
      const key = safeName(file.name);

      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(key, file, { cacheControl: '3600', upsert: false });

      if (upErr) { setError(friendlyError(upErr)); break; }

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(key);
      added.push(data.publicUrl);
    }

    setBusy(false);
    setProgress('');
    if (!added.length) return;

    const next = [...photos, ...added];
    // the first photo ever added becomes the cover, so a trip always has one
    // the first photo is the cover
    onChange({ photos: next, cover: next[0] ?? '' });
    if (fileInput.current) fileInput.current.value = '';
  }

  function remove(url) {
    const next = photos.filter((p) => p !== url);
    onChange({ photos: next, cover: next[0] ?? '' });
  }

  // The order here is the order on the trip page, and the first photo is the
  // cover (listing card and first gallery photo). Moving keeps that true.
  function move(from, to) {
    if (from === to || to < 0 || to >= photos.length) return;
    const next = [...photos];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange({ photos: next, cover: next[0] });
  }
  const makeCover = (i) => move(i, 0);

  return (
    <div className="photo-manager">
      <div className="photo-head">
        <span className="field-label">
          Photos {photos.length > 0 && <em>{photos.length} added</em>}
        </span>
        <span className="field-hint">
          Drag photos, or use the arrows, to set the order. This is the order on the trip page; the first one (★) is the cover.
        </span>
      </div>

      <div className="photo-grid">
        {photos.map((url, i) => (
          <div
            key={url}
            className={`photo-tile${i === 0 ? ' is-cover' : ''}${dragFrom === i ? ' dragging' : ''}`}
            draggable
            onDragStart={(e) => {
              setDragFrom(i);
              e.dataTransfer.effectAllowed = 'move';
              e.dataTransfer.setData('text/plain', String(i)); // Firefox needs data to start a drag
            }}
            // the photo moves live as it passes over the others
            onDragEnter={(e) => { e.preventDefault(); if (dragFrom !== null && dragFrom !== i) { move(dragFrom, i); setDragFrom(i); } }}
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
            onDrop={(e) => { e.preventDefault(); setDragFrom(null); }}
            onDragEnd={() => setDragFrom(null)}
          >
            {/* the image itself must not start its own drag */}
            <img src={url} alt="" draggable={false} />

            <button
              type="button"
              className={`photo-star${i === 0 ? ' on' : ''}`}
              title={i === 0 ? 'This is the cover photo' : 'Move to first (cover)'}
              aria-label={i === 0 ? 'Cover photo' : 'Make cover photo'}
              aria-pressed={i === 0}
              onClick={() => makeCover(i)}
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill={i === 0 ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8">
                <path d="M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8-5.3-2.8-5.3 2.8 1-5.8L3.5 9.7l5.9-.9z" />
              </svg>
            </button>

            <button type="button" className="photo-remove" title="Remove photo" aria-label="Remove photo" onClick={() => remove(url)}>×</button>

            {i === 0 && <span className="photo-badge">Cover</span>}
            <span className="photo-order">
              <button type="button" aria-label="Move earlier" title="Move earlier" disabled={i === 0} onClick={() => move(i, i - 1)}>‹</button>
              <span>{i + 1}</span>
              <button type="button" aria-label="Move later" title="Move later" disabled={i === photos.length - 1} onClick={() => move(i, i + 1)}>›</button>
            </span>
          </div>
        ))}

        <label className={`photo-drop${busy ? ' busy' : ''}`}>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            multiple
            disabled={busy}
            onChange={(e) => addFiles(e.target.files)}
          />
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.6">
            <rect x="3" y="6" width="18" height="14" rx="2.5" />
            <circle cx="12" cy="13" r="3.4" /><path d="M8 6l1.5-2h5L16 6" />
          </svg>
          <span>{busy ? progress : 'Upload photos'}</span>
        </label>
      </div>

      {error && <p className="form-note error">{error}</p>}
    </div>
  );
}
