// The filter mark.
//
// A funnel, drawn symmetrically: the stock icon this replaces hung its stem
// off to one side and hung three loose bars beside it, which at 18px reads as
// a smudge rather than a shape. This is one closed outline — mouth, taper,
// stem — so it stays legible when it is small, which is the only size it is
// ever drawn at.

export default function FilterIcon({ size = 18 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 5.5h16l-6.2 7.4v5.4l-3.6 1.9v-7.3z" />
    </svg>
  );
}
