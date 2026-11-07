// MTANI logo (3A "Snow line"): a sharp M of two peaks, the taller left summit
// cut by a snow line (a real hole via evenodd), beside a condensed wordmark.
// Everything uses currentColor so it follows the theme; `tagline` adds GEORGIA.
const MARK = 'M2 76L26 4l14 40 14-28 24 60H64L54 46l-8 18H34l-8-24-10 36zM19 30l4-4 3 3 3-3 4 4v3.6l-4-4-3 3-3-3-4 4z';

export default function MtaniLogo({ tagline = false, className = '', title = 'MTANI' }) {
  return (
    <svg className={className} viewBox={tagline ? '0 2 254 100' : '0 2 254 76'} role="img" aria-label={title} xmlns="http://www.w3.org/2000/svg">
      <path d={MARK} fill="currentColor" fillRule="evenodd" />
      <g fill="none" stroke="currentColor" strokeWidth="5" strokeLinejoin="miter" strokeMiterlimit="10" transform="translate(100 38.5) scale(1.25)">
        <path d="M2.5 30V2l8.5 15 8.5-15v28" />
        <path d="M32 2.5h18M41 2.5V30" />
        <path d="M60 30l9-28 9 28M64.5 21h9" />
        <path d="M90.5 30V2l13 28V2" />
        <path d="M118.5 2v28" />
      </g>
      {tagline && (
        <text x="127" y="98" textAnchor="middle" fill="currentColor" fontFamily="Helvetica, Arial, sans-serif"
          fontSize="13" fontWeight="600" letterSpacing="10">GEORGIA</text>
      )}
    </svg>
  );
}
