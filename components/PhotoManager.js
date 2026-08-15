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
    onChange({ photos: next, cover: cover || next[0] });
    if (fileInput.current) fileInput.current.value = '';
  }

  function remove(url) {
    const next = photos.filter((p) => p !== url);
    onChange({ photos: next, cover: cover === url ? (next[0] ?? '') : cover });
  }

  function drop(toIndex) {
    if (dragFrom === null || dragFrom === toIndex) return;
    const next = [...photos];
    const [moved] = next.splice(dragFrom, 1);
    next.splice(toIndex, 0, moved);
    setDragFrom(null);
    onChange({ photos: next, cover });
  }

  return (
    <div className="photo-manager">
      <div className="photo-head">
        <span className="field-label">
          Photos {photos.length > 0 && <em>{photos.length} added</em>}
        </span>
        <span className="field-hint">
          Star the cover photo. Drag to reorder — the first is shown after the cover.
        </span>
      </div>

      <div className="photo-grid">
        {photos.map((url, i) => (
          <div
            key={url}
            className={`photo-tile${cover === url ? ' is-cover' : ''}${dragFrom === i ? ' dragging' : ''}`}
            draggable
            onDragStart={() => setDragFrom(i)}
            onDragEnd={() => setDragFrom(null)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => drop(i)}
          >
            <img src={url} alt="" />

            <button
              type="button"
              className={`photo-star${cover === url ? ' on' : ''}`}
              title={cover === url ? 'This is the cover photo' : 'Make this the cover photo'}
              aria-label={cover === url ? 'Cover photo' : 'Make cover photo'}
              aria-pressed={cover === url}
              onClick={() => onChange({ photos, cover: url })}
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill={cover === url ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8">
                <path d="M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8-5.3-2.8-5.3 2.8 1-5.8L3.5 9.7l5.9-.9z" />
              </svg>
            </button>

            <button type="button" className="photo-remove" title="Remove photo" aria-label="Remove photo" onClick={() => remove(url)}>×</button>

            {cover === url && <span className="photo-badge">Cover</span>}
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
