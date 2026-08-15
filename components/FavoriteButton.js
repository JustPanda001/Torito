'use client';

import { useFavorites } from '@/lib/favorites';
import { useT } from '@/lib/i18n';

export default function FavoriteButton({ slug, className = '' }) {
  const { isFavorite, toggle } = useFavorites();
  const { t } = useT();
  const saved = isFavorite(slug);

  return (
    <button
      type="button"
      className={`fav-btn${saved ? ' is-saved' : ''} ${className}`.trim()}
      aria-pressed={saved}
      title={saved ? t('fav.remove') : t('fav.add')}
      aria-label={saved ? t('fav.remove') : t('fav.add')}
      onClick={(e) => {
        // the whole tour card is clickable, so keep this click to itself
        e.preventDefault();
        e.stopPropagation();
        toggle(slug);
      }}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8">
        <path d="M12 20s-7-4.6-7-9.4A4 4 0 0 1 12 8a4 4 0 0 1 7-2.6c0 4.8-7 9.4-7 9.4z" />
      </svg>
    </button>
  );
}
