'use client';

import { useState } from 'react';

export default function Gallery({ photos, alt }) {
  const [index, setIndex] = useState(0);
  const shots = photos?.length ? photos : ['/assets/hero.svg'];
  const goTo = (i) => setIndex((i + shots.length) % shots.length);   // wraps both ways

  return (
    <div className="gallery-wrap">
      <div
        className="gallery detail-gallery"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') goTo(index - 1);
          if (e.key === 'ArrowRight') goTo(index + 1);
        }}
      >
        <div className="gallery-track" style={{ transform: `translateX(-${index * 100}%)` }}>
          {shots.map((src, i) => (
            <img key={src + i} src={src} alt={`${alt} photo ${i + 1}`} loading={i ? 'lazy' : undefined} />
          ))}
        </div>
        <button type="button" className="gal-arrow prev" aria-label="Previous photo" onClick={() => goTo(index - 1)}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M15 5l-7 7 7 7" /></svg>
        </button>
        <button type="button" className="gal-arrow next" aria-label="Next photo" onClick={() => goTo(index + 1)}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>

      <div className="gallery-thumbs">
        {shots.map((src, i) => (
          <button
            type="button"
            key={src + i}
            className={`gal-thumb${i === index ? ' active' : ''}`}
            onClick={() => goTo(i)}
          >
            <img src={src} alt="" loading="lazy" />
          </button>
        ))}
      </div>
    </div>
  );
}
