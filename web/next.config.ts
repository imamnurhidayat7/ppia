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
  /**
   * Build output directory, overridable per invocation.
   *
   * A production build shares `.next` with a running dev server and leaves it
   * holding build-time artifacts, after which the dev server only serves
   * `/_not-found` — every route answers 404 until `.next` is deleted. Setting
   * `NEXT_DIST_DIR=.next-build` lets a verification build run alongside `next
   * dev` without touching the dev cache.
   */
  distDir: process.env.NEXT_DIST_DIR || '.next',
  /**
   * Pin the workspace root to this app.
   *
   * There are three lockfiles in play (the home directory, the repo root, and
   * `web/`), so Turbopack was inferring `~` as the root and warning about it on
   * every start. Naming the root removes the guess — and the warning.
   */
  turbopack: {
    root: __dirname,
  },
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
      // Supabase Storage public objects (any project ref under supabase.co).
      { protocol: "https", hostname: "**.supabase.co", pathname: "/storage/v1/object/public/**" },
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
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|jpeg|png|webp|avif|gif|ico|woff2|woff|ttf|eot)',
        locale: false,
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};

export default bundleAnalyzer(nextConfig);
