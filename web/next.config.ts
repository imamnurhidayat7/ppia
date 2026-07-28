import type { NextConfig } from "next";
import withBundleAnalyzer from '@next/bundle-analyzer';

const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

/**
 * Hosts the image optimiser is allowed to fetch uploads from.
 *
 * Uploaded files are served by the API, whose origin differs per environment.
 * This used to be hard-coded to `http://localhost:4000`, which meant every
 * uploaded image would 400 through `next/image` on a real deployment.
 *
 * The dev origins stay in the list so a local build keeps working regardless of
 * how NEXT_PUBLIC_API_URL is set.
 */
function apiImagePatterns() {
  const patterns = [
    { protocol: 'http' as const, hostname: 'localhost', port: '4000', pathname: '/uploads/**' },
    { protocol: 'http' as const, hostname: 'localhost', port: '5000', pathname: '/uploads/**' },
  ];

  const raw = process.env.NEXT_PUBLIC_API_URL;
  if (!raw) return patterns;

  try {
    const url = new URL(raw);
    const alreadyListed = patterns.some(
      (pattern) =>
        pattern.hostname === url.hostname && pattern.port === (url.port || '')
    );
    if (alreadyListed) return patterns;

    return [
      ...patterns,
      {
        protocol: url.protocol.replace(':', '') as 'http' | 'https',
        hostname: url.hostname,
        // An empty string means "the default port for this protocol".
        port: url.port,
        pathname: '/uploads/**',
      },
    ];
  } catch {
    // A malformed URL should not stop the build; uploads simply will not be
    // optimised until it is corrected.
    return patterns;
  }
}

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  reactStrictMode: true,
  reactCompiler: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      ...apiImagePatterns(),
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "plus.unsplash.com" },
      { protocol: "https", hostname: "picsum.photos" },
    ],
    dangerouslyAllowLocalIP: true,
  },
  experimental: {
    optimizePackageImports: ['lucide-react', '@heroicons/react', 'framer-motion'],
    scrollRestoration: true,
  },
};

export default bundleAnalyzer(nextConfig);
