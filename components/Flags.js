// Flag icons drawn as SVG.
//
// Not emoji: Windows has no glyphs for the regional-indicator flag sequences,
// so 🇬🇪 renders as the bare letters "GE" there. Inline SVG looks the same
// everywhere and scales cleanly.

// Georgia — the five-cross flag: one large red cross with a smaller Bolnisi
// cross in each quarter.
export function FlagGE({ size = 22 }) {
  const cross = (cx, cy) => (
    <>
      <rect x={cx - 2.1} y={cy - 0.62} width="4.2" height="1.24" rx=".2" />
      <rect x={cx - 0.62} y={cy - 2.1} width="1.24" height="4.2" rx=".2" />
    </>
  );

  return (
    <svg viewBox="0 0 30 20" width={size} height={size * 0.667} aria-hidden="true" className="flag">
      <rect width="30" height="20" fill="#fff" />
      <rect x="12.6" y="0" width="4.8" height="20" fill="#ff0000" />
      <rect x="0" y="7.6" width="30" height="4.8" fill="#ff0000" />
      <g fill="#ff0000">
        {cross(6.3, 3.8)}
        {cross(23.7, 3.8)}
        {cross(6.3, 16.2)}
        {cross(23.7, 16.2)}
      </g>
    </svg>
  );
}

// United States — 13 stripes and a starred canton. The stars are a simplified
// grid; at 22px a true 50-star field is indistinguishable mush.
export function FlagUS({ size = 22 }) {
  const stripe = 20 / 13;
  const stripes = [];
  for (let i = 0; i < 13; i += 2) {
    stripes.push(<rect key={i} x="0" y={i * stripe} width="30" height={stripe} fill="#b22234" />);
  }

  const stars = [];
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 5; col++) {
      stars.push(
        <circle
          key={`${row}-${col}`}
          cx={1.6 + col * 2.3}
          cy={1.5 + row * 2.4}
          r=".45"
          fill="#fff"
        />,
      );
    }
  }

  return (
    <svg viewBox="0 0 30 20" width={size} height={size * 0.667} aria-hidden="true" className="flag">
      <rect width="30" height="20" fill="#fff" />
      {stripes}
      <rect x="0" y="0" width="12" height={stripe * 7} fill="#3c3b6e" />
      {stars}
    </svg>
  );
}
