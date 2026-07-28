import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/**
 * Origin of the API, taken from configuration rather than hard-coded.
 *
 * The policy previously listed `http://localhost:4000` and `http://localhost:5000`
 * unconditionally, which both shipped dev hosts to production and would have
 * blocked a deployed API on any other origin.
 */
const API_ORIGIN = (() => {
  const raw = process.env.NEXT_PUBLIC_API_URL;
  if (!raw) return '';
  try {
    return new URL(raw).origin;
  } catch {
    return '';
  }
})();

/**
 * Content-Security-Policy for the app.
 *
 * Two entries are load-bearing and cannot simply be tightened:
 *
 *   script-src 'unsafe-inline' — Next.js inlines hydration and route payload
 *     scripts, and layout.tsx inlines the theme bootstrap that has to run before
 *     first paint to avoid a flash of the wrong theme. Removing this requires
 *     threading a per-request nonce through every inline script.
 *   style-src 'unsafe-inline' — Next injects inline styles, and components set
 *     style attributes for CMS-driven colours.
 *
 * 'unsafe-eval', by contrast, is only needed by the dev-mode React refresh
 * runtime, so it is dropped in production.
 */
const buildCsp = (): string => {
  const scriptSrc = [
    "'self'",
    "'unsafe-inline'",
    ...(IS_PRODUCTION ? [] : ["'unsafe-eval'"]),
    'https://www.googletagmanager.com',
    'https://www.google.com',
    'https://www.gstatic.com',
  ];

  const imgSrc = [
    "'self'",
    'data:',
    'blob:',
    'https://images.unsplash.com',
    'https://plus.unsplash.com',
    'https://picsum.photos',
    API_ORIGIN,
  ].filter(Boolean);

  const connectSrc = [
    "'self'",
    'https://www.google-analytics.com',
    'https://analytics.google.com',
    API_ORIGIN,
    // The dev server keeps an HMR websocket open.
    ...(IS_PRODUCTION ? [] : ['ws:', 'wss:']),
  ].filter(Boolean);

  return [
    "default-src 'self'",
    `script-src ${scriptSrc.join(' ')}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://www.google.com",
    `img-src ${imgSrc.join(' ')}`,
    "font-src 'self' https://fonts.gstatic.com",
    `connect-src ${connectSrc.join(' ')}`,
    "frame-src 'self' https://www.google.com https://www.youtube.com https://www.youtube-nocookie.com",
    "frame-ancestors 'self'",
    "media-src 'self' https://images.unsplash.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    // Silently rewrite any stray http:// subresource once the site is on TLS.
    ...(IS_PRODUCTION ? ['upgrade-insecure-requests'] : []),
  ].join('; ');
};

const CSP = buildCsp();

let maintenanceCache: { enabled: boolean; expiresAt: number } | null = null;

async function maintenanceEnabled(): Promise<boolean> {
  if (!API_ORIGIN) return false;
  const now = Date.now();
  if (maintenanceCache && maintenanceCache.expiresAt > now) {
    return maintenanceCache.enabled;
  }

  try {
    const response = await fetch(`${API_ORIGIN}/api/settings`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!response.ok) return false;
    const data = (await response.json()) as { settings?: { maintenanceMode?: string } };
    const enabled = data.settings?.maintenanceMode === 'true';
    maintenanceCache = { enabled, expiresAt: now + 30_000 };
    return enabled;
  } catch {
    // Fail open when the settings service is unavailable; the application has
    // its own error boundaries and should not be replaced by a false outage.
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Pages loaded inside the preview iframe — skip X-Frame-Options so the
  // dashboard can embed them. Only public-facing routes qualify.
  const isPreviewable =
    !pathname.startsWith('/dashboard') &&
    !pathname.startsWith('/login') &&
    !pathname.startsWith('/register') &&
    !pathname.startsWith('/api');

  // Forward the request with security headers applied to the response.
  //
  // No `request` option: it was only re-forwarding `request.headers` unchanged,
  // which is what `next()` already does. Passing it makes Next treat this as an
  // internal rewrite for no benefit.
  const maintenanceBypass =
    pathname === '/maintenance' ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/login');
  const showMaintenance = !maintenanceBypass && await maintenanceEnabled();
  const response = showMaintenance
    ? NextResponse.rewrite(new URL('/maintenance', request.url), { status: 503 })
    : NextResponse.next();

  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  // X-Frame-Options: only set DENY for dashboard/auth pages.
  // Public pages omit this header — CSP frame-ancestors 'self' handles it instead,
  // which allows the live preview iframe inside the admin dashboard.
  if (!isPreviewable) {
    response.headers.set('X-Frame-Options', 'DENY');
  } else {
    // Remove X-Frame-Options entirely for public pages;
    // frame-ancestors 'self' in CSP is the modern equivalent
    response.headers.delete('X-Frame-Options');
  }
  response.headers.set('X-XSS-Protection', '0');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  );
  response.headers.set('Content-Security-Policy', CSP);

  // HSTS only over TLS. Announcing it on plain http is ignored by browsers, and
  // `preload` is a one-way commitment for the whole domain — it belongs on the
  // real deployment, not on a developer's localhost.
  if (request.nextUrl.protocol === 'https:') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload'
    );
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|api).*)',
  ],
};
