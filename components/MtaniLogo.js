// MTANI logo (final, 2026-11-14): the jumping-rider mark with the mountain peak and ®,
// beside a condensed MTANI wordmark. The mark is a transparent PNG
// (public/assets/mtani-mark.png) used as an SVG mask, so it is painted in
// currentColor and follows the theme like the old vector did. `tagline` adds GEORGIA.
import { useId } from 'react';


// each logo needs its own mask id: a mask inside a hidden logo (the header shows
// only one of its two) cannot be borrowed by the visible one
function Mark({ x = 0, y = 2, size = 84 }) {
  const MASK_ID = `mtani-mark-${useId().replace(/:/g, '')}`;
  return (
    <>
      <defs>
        <mask id={MASK_ID} maskUnits="userSpaceOnUse" x={x} y={y} width={size} height={size}>
          <image href="/assets/mtani-mark.png" x={x} y={y} width={size} height={size} />
        </mask>
      </defs>
      <rect x={x} y={y} width={size} height={size} fill="currentColor" mask={`url(#${MASK_ID})`} />
    </>
  );
}

// The wordmark is the owner's own lettering, cut out of their picture
// (public/assets/mtani-word.png, 1376x450) and painted in currentColor like the
// rider. In the 170-wide word, the t is centred at 64 and the i at 163, so the
// rider sits halfway (115), caught mid-jump from the t to the i.
const W = 170;
const WORD_H = 170 * 450 / 1376;   // 55.6
const WORD_Y = 52;
const RIDER_X = 115;   // centre of the rider
const RIDER = 72;      // rider box size
const RIDER_Y = 1;     // tilted, its feet dip into the gap above the letters
const TILT = 24;       // degrees, leaning forward toward the i

function Word() {
  const MASK_ID = `mtani-word-${useId().replace(/:/g, '')}`;
  return (
    <>
      <defs>
        <mask id={MASK_ID} maskUnits="userSpaceOnUse" x="0" y={WORD_Y} width={W} height={WORD_H}>
          <image href="/assets/mtani-word.png" x="0" y={WORD_Y} width={W} height={WORD_H} />
        </mask>
      </defs>
      <rect x="0" y={WORD_Y} width={W} height={WORD_H} fill="currentColor" mask={`url(#${MASK_ID})`} />
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
    <svg className={className} viewBox={tagline ? `0 0 ${W} 130` : `0 0 ${W} 110`} role="img" aria-label={title} xmlns="http://www.w3.org/2000/svg">
      <Word />
      {/* the rider, mid-jump between the t and the i; on load it hops in from the t */}
      <g transform={`rotate(${TILT} ${RIDER_X} ${RIDER_Y + RIDER / 2})`}>
        <g className="mtani-rider">
          <Mark x={RIDER_X - RIDER / 2} y={RIDER_Y} size={RIDER} />
        </g>
      </g>
      {tagline && (
        <text x={W / 2} y="127" textAnchor="middle" fill="currentColor" fontFamily="Helvetica, Arial, sans-serif"
          fontSize="13" fontWeight="600" letterSpacing="10">GEORGIA</text>
      )}
    </svg>
  );
}
