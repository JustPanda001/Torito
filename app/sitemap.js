import { TOURS } from '@/lib/tours-data';
import { SITE_URL, STATIC_PATHS } from '@/lib/seo';

export const revalidate = 3600;

// Published trip slugs from Supabase (anon key); null when unreachable.
async function publishedSlugs() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    const res = await fetch(`${url}/rest/v1/tours?select=slug&published=eq.true`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const rows = await res.json();
    return Array.isArray(rows) ? rows.map((r) => r.slug).filter(Boolean) : null;
  } catch {
    return null;
  }
}

export default async function sitemap() {
  const now = new Date();
  const slugs = (await publishedSlugs()) ?? TOURS.map((t) => t.slug);
  const pages = STATIC_PATHS.map((p) => ({
    url: p === '/' ? SITE_URL : `${SITE_URL}${p}`,
    lastModified: now,
    changeFrequency: p === '/' || p === '/activities' ? 'weekly' : 'monthly',
    priority: p === '/' ? 1 : p === '/activities' ? 0.9 : 0.5,
  }));
  const trips = [...new Set(slugs)].map((s) => ({
    url: `${SITE_URL}/activities/${s}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));
  return [...pages, ...trips];
}
