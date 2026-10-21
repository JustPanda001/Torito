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
};

export default nextConfig;
