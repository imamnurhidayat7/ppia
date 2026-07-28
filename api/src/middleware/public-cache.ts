import { NextFunction, Request, Response } from 'express';

const CACHE_CONTROL = 'public, max-age=60, stale-while-revalidate=300';

/**
 * Explicit allowlist of anonymous GET resources that contain public content.
 * Admin/member endpoints are intentionally absent so authenticated responses
 * can never become shared-cache entries.
 */
const PUBLIC_GET_PATHS = [
  /^\/api\/(?:articles|events|research|pages)(?:\/(?!admin(?:\/|$)).*)?$/,
  /^\/api\/landing-sections(?:\/key\/[^/]+)?\/?$/,
  /^\/api\/(?:divisions|tags|faq)(?:\/[^/]+)?\/?$/,
  /^\/api\/(?:menus|config)(?:\/[^/]+)?\/?$/,
  /^\/api\/settings\/?$/,
  /^\/api\/search\/?$/,
  /^\/api\/comments\/(?:article|research)\/[^/]+\/?$/,
  /^\/api\/event-documentation\/public\/[^/]+\/?$/,
  /^\/api\/users\/username\/[^/]+\/?$/,
  /^\/api\/members\/stats\/?$/,
  /^\/api\/analytics\/(?:articles|research)\/?$/,
];

export const publicReadCache = (req: Request, res: Response, next: NextFunction): void => {
  if (
    req.method === 'GET' &&
    !req.headers.authorization &&
    PUBLIC_GET_PATHS.some((pattern) => pattern.test(req.path))
  ) {
    res.setHeader('Cache-Control', CACHE_CONTROL);
  }

  next();
};
