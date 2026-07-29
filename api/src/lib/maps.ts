/**
 * Validation for a Google Maps embed URL.
 *
 * Admins paste the `src` from Maps' "Share > Embed a map" panel. That URL is
 * rendered in an <iframe> on the public event page, so it is worth restricting
 * to Google's own embed hosts rather than accepting any URL — otherwise the
 * field would let an admin (or anyone who compromises an admin account) embed
 * an arbitrary page inside the site.
 */
const ALLOWED_HOSTS = new Set(['www.google.com', 'google.com', 'maps.google.com']);

/**
 * Returns the URL when it is a valid Google Maps embed link, otherwise null.
 * `undefined`/empty input also returns null so callers can treat "no map" and
 * "invalid map" the same way — clear the field rather than store garbage.
 */
export function sanitizeMapEmbedUrl(input: unknown): string | null {
  if (typeof input !== 'string' || input.trim() === '') return null;
  const value = input.trim();

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  if (url.protocol !== 'https:') return null;
  if (!ALLOWED_HOSTS.has(url.hostname)) return null;
  // Maps' own embed links live under /maps/embed; anything else on
  // google.com is not the widget this field is for.
  if (!url.pathname.startsWith('/maps/embed')) return null;

  return value;
}
