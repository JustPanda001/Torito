import './globals.css';
import OfflineBanner from '@/components/OfflineBanner';

export const metadata = {
  title: 'Torito — Tours, Hikes, Ski & Camping',
  description: 'Tours, hikes, ski instructors and camping across Georgia.',
  icons: { icon: '/assets/torito-logo.png' },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="js">
      {/*
        Browser extensions (ColorZilla, Grammarly and friends) add attributes to
        <body> before React hydrates, which React then reports as a mismatch.
        Nothing we render differs between server and client, so silence it here
        rather than chasing an error the page cannot cause.
      */}
      <body suppressHydrationWarning>
        {children}
        <OfflineBanner />
      </body>
    </html>
  );
}
