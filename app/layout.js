import './globals.css';
import './styles/header.css';
import './styles/chat.css';
import './styles/catalog.css';
import './styles/footer.css';
import './styles/reviews.css';
import './styles/booking.css';
import './styles/trip.css';
import './styles/contrast.css';
import './styles/layout.css';
import './styles/admin.css';
import OfflineBanner from '@/components/OfflineBanner';
import AccountPrompt from '@/components/AccountPrompt';
import ChatWidget from '@/components/ChatWidget';
import { LanguageProvider } from '@/lib/i18n';
import { FavoritesProvider } from '@/lib/favorites';
import { RatingsProvider } from '@/lib/ratings';
import { SITE_URL, SITE_NAME, SITE_TITLE, SITE_DESCRIPTION, OG_IMAGE, ORGANIZATION_JSON_LD } from '@/lib/seo';

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_TITLE, template: '%s · MTANI' },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: { canonical: '/' },
  icons: {
    icon: [
      { url: '/assets/mtani-favicon.png?v=3', sizes: '64x64', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: '/',
    locale: 'en_US',
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: 'MTANI — ski, hikes, camping and climbs in Georgia' }],
  },
  twitter: { card: 'summary_large_image', title: SITE_TITLE, description: SITE_DESCRIPTION, images: [OG_IMAGE] },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  // lets the phone chat sheet pad itself clear of the iPhone home bar
  viewportFit: 'cover',
};

// Runs before the first paint, so a dark-theme visitor never sees a white
// flash. It cannot be a component: React renders too late for that.
// First-time visitors always start in light mode, whatever their device uses;
// dark is only applied once they have picked it with the toggle.
const THEME_SCRIPT = `
(function(){
  try {
    if (localStorage.getItem('theme') === 'dark') document.documentElement.dataset.theme = 'dark';
  } catch (e) {}
})();`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="js" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION_JSON_LD) }} />
      </head>
      {/*
        Browser extensions (ColorZilla, Grammarly and friends) add attributes to
        <body> before React hydrates, which React then reports as a mismatch.
        Nothing we render differs between server and client, so silence it here
        rather than chasing an error the page cannot cause.
      */}
      <body suppressHydrationWarning>
        <LanguageProvider>
          <FavoritesProvider>
            <RatingsProvider>
              {children}
              <ChatWidget />
              <AccountPrompt />
              <OfflineBanner />
            </RatingsProvider>
          </FavoritesProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
