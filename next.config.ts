import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
    // Raise the limit for requests passing through Next.js middleware (proxy.ts
    // applies to all /api/* routes, so without this large image FormData uploads
    // are truncated at the default 10 MB).
    proxyClientMaxBodySize: 50 * 1024 * 1024, // 50 MB in bytes
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.recraft.ai',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com', // Google OAuth avatars
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
};

export default nextConfig;
