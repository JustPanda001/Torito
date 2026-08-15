import './globals.css';
import OfflineBanner from '@/components/OfflineBanner';
import AccountPrompt from '@/components/AccountPrompt';
import { LanguageProvider } from '@/lib/i18n';
import { FavoritesProvider } from '@/lib/favorites';

export const metadata = {
  title: 'Torito — Tours, Hikes, Ski & Camping',
  description: 'Tours, hikes, ski instructors and camping across Georgia.',
  icons: { icon: '/assets/torito-logo.png' },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

// Runs before the first paint, so a dark-theme visitor never sees a white
// flash. It cannot be a component: React renders too late for that.
const THEME_SCRIPT = `
(function(){
  try {
    var saved = localStorage.getItem('theme');
    var dark = saved ? saved === 'dark'
      : window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (dark) document.documentElement.dataset.theme = 'dark';
  } catch (e) {}
})();`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="js" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
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
            {children}
            <AccountPrompt />
            <OfflineBanner />
          </FavoritesProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
