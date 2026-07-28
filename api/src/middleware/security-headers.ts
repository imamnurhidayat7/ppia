/**
 * Response security headers for the API.
 *
 * Written by hand rather than adding `helmet`: the set of headers a JSON API
 * needs is short, and every value here is chosen for this service instead of
 * being a framework default that has to be overridden anyway.
 *
 * The Next.js app sets its own, richer policy in web/src/middleware.ts. That one
 * governs a document that loads scripts and styles; this one governs JSON and
 * static uploads, so it can be far stricter.
 */
import { Request, Response, NextFunction } from 'express';

/**
 * Content-Security-Policy for API responses.
 *
 * `default-src 'none'` is safe because nothing served from this origin is a
 * document that loads subresources — responses are JSON, or images and PDFs
 * under /uploads. If a stored file ever were interpreted as markup, this policy
 * plus `nosniff` means it can neither load nor execute anything.
 *
 * `frame-ancestors 'none'` is the modern replacement for X-Frame-Options and
 * applies to the upload paths too: no page anywhere may frame a response from
 * this origin.
 */
const API_CSP = [
  "default-src 'none'",
  "img-src 'self' data:",
  "media-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "sandbox",
].join('; ');

/** True when the original client request arrived over TLS. */
const isSecureRequest = (req: Request): boolean => {
  if (req.secure) return true;
  // Only meaningful when `trust proxy` is configured; Express normalises the
  // forwarded protocol into req.protocol in that case.
  return req.protocol === 'https';
};

export const securityHeaders = (req: Request, res: Response, next: NextFunction): void => {
  // Never let a browser guess a response's type. Combined with the upload
  // controller's magic-byte check, a file cannot be coaxed into executing.
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Legacy auditors still look for this; frame-ancestors above is what actually
  // enforces it in current browsers.
  res.setHeader('X-Frame-Options', 'DENY');

  // The XSS auditor was removed from browsers and its heuristics could be abused;
  // 0 explicitly disables the remnant rather than leaving it to a default.
  res.setHeader('X-XSS-Protection', '0');

  // Do not leak API paths (which contain record ids) to third-party origins.
  res.setHeader('Referrer-Policy', 'no-referrer');

  // No API response has any business asking for a device capability.
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()'
  );

  // The Next.js app runs on a different origin and must be able to load images
  // from /uploads, so resources stay readable cross-origin. CORS still decides
  // who may read JSON.
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

  res.setHeader('Content-Security-Policy', API_CSP);

  // Only advertise HSTS on connections that were actually secure. Sending it
  // over plain HTTP is ignored by browsers and would pin localhost to HTTPS if
  // it ever were honoured.
  if (isSecureRequest(req)) {
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');
  }

  next();
};

export default securityHeaders;
