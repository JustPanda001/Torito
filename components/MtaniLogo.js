// MTANI logo (final, 2026-11-14): the jumping-rider mark with the mountain peak and ®,
// beside a condensed MTANI wordmark. The mark is a transparent PNG
// (public/assets/mtani-mark.png) used as an SVG mask, so it is painted in
// currentColor and follows the theme like the old vector did. `tagline` adds GEORGIA.
import { useId } from 'react';

// each logo needs its own mask id: a mask inside a hidden logo (the header shows
// only one of its two) cannot be borrowed by the visible one
function Mark() {
  const MASK_ID = `mtani-mark-${useId().replace(/:/g, '')}`;
  return (
    <>
      <defs>
        <mask id={MASK_ID} maskUnits="userSpaceOnUse" x="0" y="2" width="84" height="84">
          <image href="/assets/mtani-mark.png" x="0" y="2" width="84" height="84" />
        </mask>
      </defs>
      <rect x="0" y="2" width="84" height="84" fill="currentColor" mask={`url(#${MASK_ID})`} />
    </>
  );
}

export default function MtaniLogo({ tagline = false, mark = false, className = '', title = 'MTANI' }) {
  // mark: the rider alone, no wordmark (the header on phones)
  if (mark) {
    return (
      <svg className={className} viewBox="0 2 84 84" role="img" aria-label={title} xmlns="http://www.w3.org/2000/svg">
        <Mark />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox={tagline ? '0 2 240 108' : '0 2 240 84'} role="img" aria-label={title} xmlns="http://www.w3.org/2000/svg">
      <Mark />
      <g fill="none" stroke="currentColor" strokeWidth="5" strokeLinejoin="miter" strokeMiterlimit="10" transform="translate(84 47) scale(1.25)">
        <path d="M8 30V2l11 20 11-20v28" />
        <path d="M40 2.5h18M49 2.5V30" />
        <path d="M66 30l9-28 9 28M70.5 21h9" />
        <path d="M94.5 30V2l13 28V2" />
        <path d="M120.5 2v28" />
      </g>
      {tagline && (
        <text x="164" y="106" textAnchor="middle" fill="currentColor" fontFamily="Helvetica, Arial, sans-serif"
          fontSize="13" fontWeight="600" letterSpacing="10">GEORGIA</text>
      )}
    </svg>
  );
}
