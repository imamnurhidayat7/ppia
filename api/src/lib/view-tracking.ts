/**
 * View tracking helper.
 *
 * Articles and research papers were inflating their view counts because the
 * public `GET /slug/:slug` handler incremented on every request — including
 * Next.js ISR revalidations, CDN cache refreshes, and bot crawls.
 *
 * This module provides:
 *  - `isBotRequest()`  → filters crawlers/social previewers.
 *  - `shouldCountView()` → per-IP dedup with a 5-minute cooldown so refreshing
 *    the same page does not keep bumping the counter.
 */

const BOT_PATTERNS = [
  /bot/i,
  /crawler/i,
  /spider/i,
  /facebookexternalhit/i,
  /twitterbot/i,
  /linkedinbot/i,
  /whatsapp/i,
  /telegrambot/i,
  /slackbot/i,
  /discordbot/i,
  /applebot/i,
  /bingbot/i,
  /googlebot/i,
  /yandexbot/i,
  /baiduspider/i,
  /sogou/i,
  /exabot/i,
  /facebot/i,
  /pinterest/i,
  /skypeuripreviewer/i,
  /preview/i,
  /capture/i,
  /feedfetcher/i,
  /mediapartners/i,
  /ai-spider/i,
  /gptbot/i,
  /chatgpt/i,
  /claudebot/i,
  /perplexitybot/i,
  /amazonbot/i,
];

/**
 * Returns true if the User-Agent looks like a bot/crawler/previewer.
 */
export function isBotRequest(userAgent: string | undefined): boolean {
  if (!userAgent) return true; // no UA at all → probably a script
  return BOT_PATTERNS.some((re) => re.test(userAgent));
}

/* ── In-memory dedup store ────────────────────────────────────────────
 * Key format: `${resourceType}:${resourceId}:${clientIp}`
 * Value: timestamp of last counted view.
 *
 * A Map is fine here — the API runs as a single process and a 5-minute
 * window is short enough that memory growth is negligible (an entry is
 * just ~80 bytes). The periodic sweep below prevents unbounded growth.
 */
const VIEW_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
const recentViews = new Map<string, number>();

// Sweep expired entries every 10 minutes to avoid memory bloat.
setInterval(() => {
  const now = Date.now();
  for (const [key, ts] of recentViews) {
    if (now - ts > VIEW_COOLDOWN_MS) {
      recentViews.delete(key);
    }
  }
}, 10 * 60 * 1000).unref();

/**
 * Returns true if this view should be counted (i.e. the same IP has not
 * viewed the same resource within the cooldown window).
 */
export function shouldCountView(
  resourceType: 'article' | 'research',
  resourceId: string,
  clientIp: string,
): boolean {
  const key = `${resourceType}:${resourceId}:${clientIp}`;
  const now = Date.now();
  const lastSeen = recentViews.get(key);

  if (lastSeen && now - lastSeen < VIEW_COOLDOWN_MS) {
    return false; // already counted within the cooldown
  }

  recentViews.set(key, now);
  return true;
}
