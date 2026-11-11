// MTANI logo (V5 "zigzag + slope"): a sharp M of two peaks, the taller left summit
// split by a zigzag snow line, legs cut along one ski slope, beside a condensed wordmark.
// Everything uses currentColor so it follows the theme; `tagline` adds GEORGIA.
const MARK = 'M26 4L34.43 28.07 33 29.50 29 25.50 26 28.50 23 25.50 19 29.50 17.88 28.38ZM16.62 32.12L19 34.50 23 30.50 26 33.50 29 30.50 33 34.50 35.72 31.78 40 44 54 16 81.4 84.71 66.08 82.24 54 46 46 64 34 64 26 40 16.52 74.26 3.36 72.14Z';

export default function MtaniLogo({ tagline = false, mark = false, className = '', title = 'MTANI' }) {
  // mark: the M alone, no wordmark (the header)
  if (mark) {
    return (
      <svg className={className} viewBox="0 2 84 84" role="img" aria-label={title} xmlns="http://www.w3.org/2000/svg">
        <path d={MARK} fill="currentColor" fillRule="evenodd" />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox={tagline ? '0 2 200 108' : '0 2 200 84'} role="img" aria-label={title} xmlns="http://www.w3.org/2000/svg">
      <path d={MARK} fill="currentColor" fillRule="evenodd" />
      <g fill="none" stroke="currentColor" strokeWidth="5" strokeLinejoin="miter" strokeMiterlimit="10" transform="translate(44 47) scale(1.25)">
        <path d="M32 2.5h18M41 2.5V30" />
        <path d="M60 30l9-28 9 28M64.5 21h9" />
        <path d="M90.5 30V2l13 28V2" />
        <path d="M118.5 2v28" />
      </g>
      {tagline && (
        <text x="100" y="106" textAnchor="middle" fill="currentColor" fontFamily="Helvetica, Arial, sans-serif"
          fontSize="13" fontWeight="600" letterSpacing="10">GEORGIA</text>
      )}
    </svg>
  );
}
