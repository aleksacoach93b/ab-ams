import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Image configuration
  images: {
    domains: [
      'localhost',
      'vercel.app',
      '*.vercel.app',
      'blob.vercel-storage.com',
    ],
    // Use unoptimized for local dev, optimized for production
    unoptimized: process.env.NODE_ENV === 'development',
  },
  // External packages for server components
  serverExternalPackages: ['@prisma/client'],
  // Output configuration
  output: 'standalone',
};

export default nextConfig;
