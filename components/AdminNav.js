'use client';

// A sticky row of section buttons for the admin page. A click scrolls to that
// section; the section being looked at is lit up as the page scrolls.
//
// It reads the sections off the page rather than keeping its own list: which
// sections the form shows depends on the category (a lesson hides the travel
// ones), and a hand-kept list would drift out of step with that.

import { useCallback, useEffect, useRef, useState } from 'react';

const label = (el) => el.querySelector('h2, h3')?.textContent?.trim() ?? '';

export default function AdminNav({ rootRef }) {
  const [items, setItems] = useState([]);
  const [active, setActive] = useState(null);
  const bar = useRef(null);

  // the big blocks (Add a tour, Existing tours) and every form section in them
  const scan = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    const found = [];
    root.querySelectorAll('.detail-block, .admin-section').forEach((el, i) => {
      const text = label(el);
      if (!text) return;
      if (!el.id) el.id = `admin-sec-${i}`;
      found.push({ id: el.id, text, top: el.classList.contains('detail-block') });
    });
    setItems((prev) => (
      prev.length === found.length && prev.every((p, i) => p.id === found[i].id && p.text === found[i].text)
        ? prev : found
    ));
  }, [rootRef]);

  // rescan when the form changes shape (category switched, tour opened)
  useEffect(() => {
    scan();
    const root = rootRef.current;
    if (!root) return undefined;
    let frame = 0;
    const obs = new MutationObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(scan);
    });
    obs.observe(root, { childList: true, subtree: true, characterData: true });
    return () => { obs.disconnect(); cancelAnimationFrame(frame); };
  }, [rootRef, scan]);

  // How far down the page a section should land. On a wide screen the bar is
  // a column at the side, so only the site header covers the page; on a phone
  // it is a row under the header and covers the page too. Measured where the
  // bar sits once stuck, not where it is now — before the first scroll it is
  // still further down.
  const landing = () => {
    const el = bar.current;
    if (!el) return 0;
    const style = getComputedStyle(el);
    const stuckTop = parseFloat(style.top) || 0;
    return style.flexDirection === 'column' ? stuckTop : stuckTop + el.offsetHeight + 12;
  };

  // the active section: the last one whose top has passed the landing line
  useEffect(() => {
    const onScroll = () => {
      const line = landing() + 24;
      let current = items[0]?.id ?? null;
      for (const item of items) {
        const el = document.getElementById(item.id);
        if (el && el.getBoundingClientRect().top <= line) current = item.id;
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [items]);

  // keep the lit button visible in the bar when the row scrolls sideways
  useEffect(() => {
    bar.current?.querySelector('.on')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [active]);

  function go(id) {
    const el = document.getElementById(id);
    if (!el) return;
    const offset = landing();
    setActive(id);
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - offset, behavior: 'smooth' });
  }

  if (items.length < 2) return null;

  return (
    <nav className="admin-nav" ref={bar} aria-label="Jump to a section">
      {items.map((item) => (
        <button
          type="button"
          key={item.id}
          className={`admin-nav-btn${item.top ? ' top' : ''}${active === item.id ? ' on' : ''}`}
          onClick={() => go(item.id)}
        >
          {item.text}
        </button>
      ))}
    </nav>
  );
}
