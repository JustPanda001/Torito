'use client';

// The "Rate this trip" dialog.
//
// One review per person per trip, so opening this after you have already rated
// loads what you wrote and edits it rather than starting a second one.
//
// Only the star count is required. A visitor who wants to leave four stars and
// nothing else should not have to write a paragraph to do it.
//
// Reviews are checked by the team before the public sees them
// (REVIEWS-MODERATION.sql). The dialog says so plainly: after posting, and
// whenever the visitor reopens it while their review is still waiting, so it
// never looks live when it is not.

import { useEffect, useState } from 'react';
import { Star } from './Stars';
import { myReview, saveReview } from '@/lib/ratings';
import { friendlyError } from '@/lib/supabaseClient';
import { useT } from '@/lib/i18n';
import { localizeTour } from '@/lib/trip-translations';

const WORD_KEYS = ['', 'trip.rvPoor', 'trip.rvFair', 'trip.rvGood', 'trip.rvGreat', 'trip.rvExcellent'];

export default function ReviewModal({ tour, profile, onClose, onSaved }) {
  const [rating, setRating] = useState(0);
  // the star the pointer is over, previewed without committing
  const [hover, setHover] = useState(0);
  const [recommend, setRecommend] = useState(true);
  const [body, setBody] = useState('');
  const [existing, setExisting] = useState(null);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(null);
  // null until posted; then the status the database gave the review
  const [done, setDone] = useState(null);
  const { t, lang } = useT();
  const view = localizeTour(tour, lang);

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
      const status = await saveReview(tour.slug, {
        rating,
        recommend,
        body,
        authorName: profile?.full_name,
      });
      // null means the moderation SQL has not been run yet: the review is live
      setDone(status ?? 'approved');
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
            <h2 id="rvTitle">{existing ? t('trip.rvUpdateTitle') : t('trip.rateTrip')}</h2>
            <p className="bm-sub">{view.full_title || view.title}</p>
          </div>
          <button type="button" className="bm-close" aria-label={t('trip.close')} onClick={onClose}>×</button>
        </div>

        <div className="bm-body">
          {done === 'approved' ? (
            <div className="rv-done">
              <p><strong>{t('trip.rvThanksLive')}</strong></p>
              <p className="field-hint">{t('trip.rvThanksLiveHint')}</p>
              <button type="button" className="book-btn" onClick={onClose}>{t('trip.close')}</button>
            </div>
          ) : done ? (
            <div className="rv-done">
              <p><strong>{t('reviews.thanksPending')}</strong></p>
              <p className="field-hint">{t('reviews.thanksPendingHint')}</p>
              <button type="button" className="book-btn" onClick={onClose}>{t('trip.close')}</button>
            </div>
          ) : (
            <>
              {existing?.status === 'pending' && (
                <p className="rv-state rv-state-pending" role="status">
                  {t('reviews.pendingNote')}
                </p>
              )}
              {existing?.status === 'rejected' && (
                <p className="rv-state rv-state-rejected" role="status">
                  {t('reviews.rejectedNote')}
                </p>
              )}
              {existing?.status === 'approved' && (
                <p className="rv-state" role="status">
                  {t('reviews.editRecheck')}
                </p>
              )}
              <div className="rv-stars" role="radiogroup" aria-label={t('trip.rvYourRating')}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={rating === n}
                    aria-label={t(n === 1 ? 'trip.rvStarOne' : 'trip.rvStarMany', { n })}
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
                <span className="rv-word">{WORD_KEYS[shown] ? t(WORD_KEYS[shown]) : ''}</span>
              </div>

              <div className="field">
                <span className="field-label">{t('trip.rvRecommendQ')}</span>
                <div className="rv-rec">
                  <button
                    type="button"
                    className={`chip small${recommend ? ' active' : ''}`}
                    onClick={() => setRecommend(true)}
                  >
                    {t('trip.rvYes')}
                  </button>
                  <button
                    type="button"
                    className={`chip small${!recommend ? ' active' : ''}`}
                    onClick={() => setRecommend(false)}
                  >
                    {t('trip.rvNo')}
                  </button>
                </div>
              </div>

              <div className="field">
                <span className="field-label">{t('trip.rvTellQ')}</span>
                <textarea
                  className="rv-text"
                  rows={4}
                  maxLength={1200}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder={t('trip.rvPlaceholder')}
                />
                <span className="field-hint">{body.length}/1200 · {t('trip.rvPostingAs', { name: profile?.full_name || t('trip.rvYourAccount') })}</span>
              </div>

              {failed && <p className="form-note error">{failed}</p>}

              <button
                type="button"
                className="book-btn"
                disabled={!rating || saving}
                onClick={submit}
              >
                {saving ? t('trip.rvSaving') : existing ? t('trip.rvUpdate') : t('trip.rvPost')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
