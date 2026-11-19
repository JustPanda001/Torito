/** @type {import('next').NextConfig} */
const nextConfig = {
  // The trip photos are plain files in /public and are already sized for the
  // layout, so the image optimiser is not doing anything useful here.
  images: { unoptimized: true },
  // The catalogue moved from /tours to /activities; old links and shared
  // trip URLs keep working.
  async redirects() {
    return [
      { source: '/tours', destination: '/activities', permanent: true },
      { source: '/tours/:slug', destination: '/activities/:slug', permanent: true },
    ];
  },
  // Security headers on every page (SEC-05). The Content-Security-Policy is in
  // report-only mode first: browsers only warn about what it would block, so
  // nothing breaks while we watch it; switch the name to
  // "Content-Security-Policy" once the console shows no warnings.
  async headers() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://accounts.google.com https://strava-embeds.com",
      "style-src 'self' 'unsafe-inline' https://accounts.google.com",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.open-meteo.com https://archive-api.open-meteo.com https://photon.komoot.io https://accounts.google.com https://api.pwnedpasswords.com",
      "frame-src https://accounts.google.com https://www.strava.com https://strava-embeds.com https://www.openstreetmap.org",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ');
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        // nobody may show the site inside their own page (stops click tricks on /admin)
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
        { key: 'Content-Security-Policy-Report-Only', value: csp },
      ],
    }];
  },
};

export default nextConfig;
