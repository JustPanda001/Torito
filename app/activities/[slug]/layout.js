// Server-side check that the trip exists, so an unknown slug gets a real 404
// instead of a 200 page that says "not found" after loading.
//
// Rules (they mirror the catalogue in app/activities/page.js, which shows
// published database rows plus only the `demo` placeholders, or the whole
// static list when the database has nothing published):
//  - a published database row exists        -> show it
//  - no row, static demo trip               -> show it
//  - no row, static non-demo trip           -> 404 only if the database has
//                                              published trips (otherwise the
//                                              static catalogue is in use)
//  - database unreachable / not configured  -> show the page; the client page
//                                              falls back to the static list
//                                              and reports unknown slugs itself
// The request runs as the anon user, so only published rows can come back.

import { notFound } from 'next/navigation';
import { TOURS } from '@/lib/tours-data';
import { SITE_NAME, OG_IMAGE } from '@/lib/seo';

// array of rows, or null when the database could not be reached
async function rest(query) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    const res = await fetch(`${url}/rest/v1/tours?${query}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// Title, description and first photo of the trip for search results and link
// previews. English only (trip translations happen in the browser). Falls back
// to the static list, then to the site defaults.
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const rows = await rest(
    `select=title,subtitle,summary,cover_image,gallery&published=eq.true&slug=eq.${encodeURIComponent(slug)}&limit=1`,
  );
  const trip = (rows && rows[0]) || TOURS.find((t) => t.slug === slug);
  if (!trip) return {};
  const title = trip.title + (trip.subtitle ? ` — ${trip.subtitle}` : '');
  const text = (trip.summary || '').replace(/\s+/g, ' ').trim();
  const description = text.length > 160 ? `${text.slice(0, 157).trimEnd()}...` : text || undefined;
  const photo = (trip.gallery && trip.gallery[0]) || trip.cover_image;
  const image = photo ? encodeURI(photo) : OG_IMAGE; // relative paths resolve against metadataBase
  const path = `/activities/${slug}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type: 'website', siteName: SITE_NAME, title: `${title} · ${SITE_NAME}`, description, url: path, images: [image] },
    twitter: { card: 'summary_large_image', title: `${title} · ${SITE_NAME}`, description, images: [image] },
  };
}

export default async function TripLayout({ children, params }) {
  const { slug } = await params;
  const rows = await rest(`select=slug&published=eq.true&slug=eq.${encodeURIComponent(slug)}&limit=1`);
  if (rows === null || rows.length) return children;

  const local = TOURS.find((t) => t.slug === slug);
  if (!local) notFound();
  if (local.demo) return children;

  const any = await rest('select=slug&published=eq.true&limit=1');
  if (any && any.length) notFound();
  return children;
}
