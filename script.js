// The auth pages have no header, so everything here is guarded.

// ---- header turns solid once you scroll past the hero top ----
const header = document.getElementById('siteHeader');
// sub-pages have no hero behind the header, so it stays solid all the time
const alwaysSolid = document.body.classList.contains('subpage');
const onScroll = () => header && header.classList.toggle('solid', alwaysSolid || window.scrollY > 40);

if (header) {
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}

// ---- mega menu ----
const menuBtn = document.getElementById('menuBtn');
const megaMenu = document.getElementById('megaMenu');

function setMenu(open) {
  menuBtn.setAttribute('aria-expanded', String(open));
  megaMenu.hidden = !open;
  megaMenu.classList.toggle('opening', open);
  if (open) header.classList.add('solid');
  else onScroll();
}

if (menuBtn && megaMenu) {
  menuBtn.addEventListener('click', () => {
    setMenu(menuBtn.getAttribute('aria-expanded') !== 'true');
  });
  document.addEventListener('click', (e) => {
    if (!header.contains(e.target)) setMenu(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setMenu(false);
  });
}

// The hero slider is driven entirely by CSS (@keyframes slide) so it keeps
// running even where scripts are blocked.

// ---- galleries: arrows, plus optional thumbnail strip ----
document.querySelectorAll('.gallery').forEach((gallery) => {
  const track = gallery.querySelector('.gallery-track');
  const count = track.children.length;
  // the thumbnail strip, when there is one, sits beside .gallery in .gallery-wrap
  const thumbs = [...(gallery.closest('.gallery-wrap')?.querySelectorAll('.gal-thumb') || [])];
  let index = 0;

  const render = () => {
    track.style.transform = `translateX(-${index * 100}%)`;
    thumbs.forEach((t, i) => t.classList.toggle('active', i === index));
  };

  const goTo = (i) => {
    index = (i + count) % count; // wraps around both ways
    render();
  };

  gallery.querySelector('.prev').addEventListener('click', () => goTo(index - 1));
  gallery.querySelector('.next').addEventListener('click', () => goTo(index + 1));
  thumbs.forEach((thumb, i) => thumb.addEventListener('click', () => goTo(i)));

  // arrow keys while the gallery has focus
  gallery.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') goTo(index - 1);
    if (e.key === 'ArrowRight') goTo(index + 1);
  });
});

// ---- listing cards open the tour page (except real links/buttons inside) ----
document.querySelectorAll('.tour-card').forEach((card) => {
  const target = card.querySelector('.tour-photo')?.getAttribute('href');
  if (!target) return;
  card.style.cursor = 'pointer';
  card.addEventListener('click', (e) => {
    if (e.target.closest('a, button')) return;
    window.location.href = target;
  });
});

// ---- reveal sections as they scroll into view ----
// Positive bottom margin = the observer fires before the element reaches the
// viewport, so content is already on screen instead of appearing late.
const revealer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealer.unobserve(entry.target);
    }
  });
}, { threshold: 0, rootMargin: '0px 0px 220px 0px' });

document.querySelectorAll('.reveal').forEach((el) => revealer.observe(el));

// ---- placeholder until the AI assistant is wired up ----
document.getElementById('askAi')?.addEventListener('click', () => {
  alert('AI assistant coming soon.');
});
