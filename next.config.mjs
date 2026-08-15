/** @type {import('next').NextConfig} */
const nextConfig = {
  // The trip photos are plain files in /public and are already sized for the
  // layout, so the image optimiser is not doing anything useful here.
  images: { unoptimized: true },
};

export default nextConfig;