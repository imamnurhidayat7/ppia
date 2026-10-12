'use client';

/**
 * Stale-while-revalidate for public CMS reads (menus, site config).
 *
 * The API sleeps on cold starts, so a reload can take ~a minute before fresh
 * data arrives — without this, every reload flashes the hardcoded fallback
 * brand and nav first ("wrong logo, wrong menu until login", which is really
 * "until the API wakes up"). The last good payload paints instantly from
 * localStorage while a background revalidate refreshes it. First-time
 * visitors have no cache and still see the fallback until the fetch lands;
 * keeping the API warm (a ping to /health every few minutes) covers them.
 */

const PREFIX = 'ppia-public:';

/** Last good payload, or null on first visit / corrupted entry. */
export function readPublicCache<T>(key: string): T | null {
  try {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(`${PREFIX}${key}`);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null && 'data' in parsed) {
      return (parsed as { data: T }).data;
    }
    return null;
  } catch {
    return null;
  }
}

/** Best-effort persist (private mode / quota errors must never break render). */
export function writePublicCache(key: string, data: unknown): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`${PREFIX}${key}`, JSON.stringify({ data, savedAt: Date.now() }));
  } catch {
    // Non-fatal: the live response still applies for this session.
  }
}

/** Retry a fetcher once after a short pause (rides out cold starts). */
export async function fetchWithRetry<T>(
  fetcher: () => Promise<T>,
  attempts = 2,
  delayMs = 1500
): Promise<T> {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fetcher();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  throw lastError;
}
