'use client';

// The "Rate this trip" dialog.
//
// One review per person per trip, so opening this after you have already rated
// loads what you wrote and edits it rather than starting a second one.
//
// Only the star count is required. A visitor who wants to leave four stars and
// nothing else should not have to write a paragraph to do it.

import { useEffect, useState } from 'react';
import { Star } from './Stars';
import { myReview, saveReview } from '@/lib/ratings';
import { friendlyError } from '@/lib/supabaseClient';

const WORDS = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'];

export default function ReviewModal({ tour, profile, onClose, onSaved }) {
  const [rating, setRating] = useState(0);
  // the star the pointer is over, previewed without committing
  const [hover, setHover] = useState(0);
  const [recommend, setRecommend] = useState(true);
  const [body, setBody] = useState('');
  const [existing, setExisting] = useState(null);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', esc);
    document.body.classList.add('modal-open');
    return () => {
      document.removeEventListener('keydown', esc);
      document.body.classList.remove('modal-open');
    };
  }, [onClose]);

  useEffect(() => {
    let alive = true;
    myReview(tour.slug)
      .then((mine) => {
        if (!alive || !mine) return;
        setExisting(mine);
        setRating(mine.rating);
        setRecommend(mine.recommend);
        setBody(mine.body ?? '');
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [tour.slug]);

  async function submit() {
    if (!rating || saving) return;
    setSaving(true);
    setFailed(null);
    try {
      await saveReview(tour.slug, {
        rating,
        recommend,
        body,
        authorName: profile?.full_name,
      });
      setDone(true);
      onSaved?.();
    } catch (error) {
      setFailed(friendlyError(error));
    } finally {
      setSaving(false);
    }
  }

  const shown = hover || rating;

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="booking-modal review-modal" role="dialog" aria-modal="true" aria-labelledby="rvTitle">

        <div className="bm-head">
          <div>
            <h2 id="rvTitle">{existing ? 'Update your review' : 'Rate this trip'}</h2>
            <p className="bm-sub">{tour.full_title || tour.title}</p>
          </div>
          <button type="button" className="bm-close" aria-label="Close" onClick={onClose}>×</button>
        </div>

        <div className="bm-body">
          {done ? (
            <div className="rv-done">
              <p><strong>Thanks — your review is live.</strong></p>
              <p className="field-hint">It now counts towards this trip&apos;s score.</p>
              <button type="button" className="book-btn" onClick={onClose}>Close</button>
            </div>
          ) : (
            <>
              <div className="rv-stars" role="radiogroup" aria-label="Your rating">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={rating === n}
                    aria-label={`${n} ${n === 1 ? 'star' : 'stars'}`}
                    className={`star-btn${n <= shown ? ' on' : ''}`}
                    onClick={() => setRating(n)}
                    onMouseEnter={() => setHover(n)}
                    onMouseLeave={() => setHover(0)}
                    onFocus={() => setHover(n)}
                    onBlur={() => setHover(0)}
                  >
                    <Star size={34} filled={n <= shown} />
                  </button>
                ))}
                <span className="rv-word">{WORDS[shown]}</span>
              </div>

              <div className="field">
                <span className="field-label">Would you recommend it?</span>
                <div className="rv-rec">
                  <button
                    type="button"
                    className={`chip small${recommend ? ' active' : ''}`}
                    onClick={() => setRecommend(true)}
                  >
                    Yes, I&apos;d recommend it
                  </button>
                  <button
                    type="button"
                    className={`chip small${!recommend ? ' active' : ''}`}
                    onClick={() => setRecommend(false)}
                  >
                    No
                  </button>
                </div>
              </div>

              <div className="field">
                <span className="field-label">Anything you&apos;d tell someone thinking about it?</span>
                <textarea
                  className="rv-text"
                  rows={4}
                  maxLength={1200}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="The guide, the pace, what surprised you — optional."
                />
                <span className="field-hint">{body.length}/1200 · posting as {profile?.full_name || 'your account'}</span>
              </div>

              {failed && <p className="form-note error">{failed}</p>}

              <button
                type="button"
                className="book-btn"
                disabled={!rating || saving}
                onClick={submit}
              >
                {saving ? 'Saving…' : existing ? 'Update review' : 'Post review'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
