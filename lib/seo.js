// Shared SEO constants and small helpers (server and client safe).
export const SITE_URL = 'https://www.mtani.ge';
export const SITE_NAME = 'MTANI';
export const SITE_TITLE = 'MTANI — Ski, Hikes, Camping & Climbs in Georgia';
export const SITE_DESCRIPTION =
  'Ski and snowboard instructors, snowmobiles and paragliding in Gudauri, plus hikes, camping and mountaineering across Georgia.';
export const OG_IMAGE = '/og-image.jpg';

// Pages that are public and worth indexing.
export const STATIC_PATHS = ['/', '/activities', '/about', '/contact', '/faq', '/privacy', '/terms'];

// Metadata for a simple static page. `title` gets the "· MTANI" template.
export function pageMetadata(title, description, path) {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title: `${title} · ${SITE_NAME}`, description, url: path, siteName: SITE_NAME, type: 'website', images: [OG_IMAGE] },
    twitter: { card: 'summary_large_image', title: `${title} · ${SITE_NAME}`, description, images: [OG_IMAGE] },
  };
}

export const NO_INDEX = { robots: { index: false, follow: false } };

export const ORGANIZATION_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'TravelAgency',
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/assets/mtani-logo.png`,
  image: `${SITE_URL}${OG_IMAGE}`,
  description: SITE_DESCRIPTION,
  areaServed: 'Georgia',
};
