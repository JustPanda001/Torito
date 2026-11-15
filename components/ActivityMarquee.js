'use client';

// The home page's "More adventures" row: every category, gliding right to
// left on its own, forever. The arrows nudge it one card either way and it
// carries on from there; hovering pauses it so a card is easy to click.
//
// Driven by requestAnimationFrame rather than a CSS animation so the arrows
// can move the same strip. The list is rendered twice; once the strip has
// travelled one full copy it jumps back by exactly that much, so the loop has
// no seam. The edges blur and fade (see .activity-marquee in globals.css).
//
// It moves even when the device asks for reduced motion: the owner wants the
// row always moving (2026-11-16). It is slow and steady, with no flashing.

import { useEffect, useRef } from 'react';
import Link from 'next/link';

const SPEED = 38;        // px per second
const NUDGE_MS = 650;    // how long an arrow nudge takes

const easeOut = (t) => 1 - (1 - t) ** 3;

export default function ActivityMarquee({ items, renderImage, label, prevLabel, nextLabel }) {
  const track = useRef(null);
  const state = useRef({ x: 0, paused: false, nudge: null });

  useEffect(() => {
    let raf;
    let last = performance.now();
    const loop = (now) => {
      const s = state.current;
      const dt = Math.min(64, now - last); // a background tab does not jump ahead
      last = now;
      const el = track.current;
      if (el) {
        // one copy plus its gap: where the second copy starts
        const second = el.children[items.length];
        const period = second ? second.offsetLeft - el.children[0].offsetLeft : 0;

        if (s.nudge) {
          const t = Math.min(1, (now - s.nudge.start) / NUDGE_MS);
          s.x = s.nudge.from + (s.nudge.to - s.nudge.from) * easeOut(t);
          if (t === 1) s.nudge = null;
        } else if (!s.paused) {
          s.x -= (SPEED * dt) / 1000;
        }

        if (period > 0) {
          // keep x inside one period; shift a running nudge by the same amount
          let wrap = 0;
          if (s.x <= -period) wrap = period;
          else if (s.x > 0) wrap = -period;
          if (wrap) {
            s.x += wrap;
            if (s.nudge) { s.nudge.from += wrap; s.nudge.to += wrap; }
          }
        }
        el.style.transform = `translate3d(${s.x}px,0,0)`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [items.length]);

  const nudge = (dir) => {
    const el = track.current;
    if (!el || el.children.length < 2) return;
    const step = el.children[1].offsetLeft - el.children[0].offsetLeft; // one card + gap
    const s = state.current;
    const base = s.nudge ? s.nudge.to : s.x;
    s.nudge = { from: s.x, to: base - dir * step, start: performance.now() };
  };

  const pause = (on) => { state.current.paused = on; };

  return (
    <div className="activity-marquee" role="region" aria-label={label}>
      <button type="button" className="marquee-arrow prev" aria-label={prevLabel} onClick={() => nudge(-1)}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
      </button>
      <div
        className="activity-window"
        onMouseEnter={() => pause(true)}
        onMouseLeave={() => pause(false)}
        onFocus={() => pause(true)}
        onBlur={() => pause(false)}
      >
        <div className="activity-track" ref={track}>
          {[0, 1].map((copy) => items.map(([src, text, href]) => (
            <Link
              className="activity-card"
              href={href}
              key={`${copy}-${href}`}
              aria-hidden={copy === 1 || undefined}
              tabIndex={copy === 1 ? -1 : undefined}
            >
              {renderImage(src)}<span>{text}</span>
            </Link>
          )))}
        </div>
        {/* soft blur over the cards as they leave and arrive */}
        <span className="marquee-blur left" aria-hidden="true" />
        <span className="marquee-blur right" aria-hidden="true" />
      </div>
      <button type="button" className="marquee-arrow next" aria-label={nextLabel} onClick={() => nudge(1)}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
      </button>
    </div>
  );
}
