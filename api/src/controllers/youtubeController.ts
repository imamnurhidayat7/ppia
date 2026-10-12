import { Request, Response } from 'express';
import { promises as fs } from 'fs';
import path from 'path';

export interface YouTubeFeedVideo {
  id: string;
  title: string;
  url: string;
  thumbnail: string;
  publishedAt: string;
  description: string;
  views: number | null;
}

// Channel "PPI Auckland" (handle @ppiauckland2025). Overridable without a
// code edit via YOUTUBE_CHANNEL_ID so a channel move is config, not a deploy.
const DEFAULT_CHANNEL_ID = 'UClqaisFHzSUSF8wqNw1LxRQ';

// The channel uploads rarely, so thirty minutes keeps the page fresh without
// hitting YouTube on every visit.
const FEED_TTL_MS = 30 * 60 * 1000;

let cache: { expiresAt: number; payload: YouTubeFeedPayload } | null = null;

// Last-good payload kept on disk (api/storage is gitignored runtime data).
// The in-memory cache dies on every restart/deploy — without this, one flaky
// YouTube response right after a boot is enough to 502 the /videos page.
const DISK_CACHE_PATH = path.join(__dirname, '..', '..', 'storage', 'youtube-feed.cache.json');

function isFeedPayload(value: unknown): value is YouTubeFeedPayload {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as { videos?: unknown }).videos)
  );
}

// Last-resort payload bundled with the deploy: if YouTube is unreachable AND
// both caches are empty (first boot on ephemeral storage), the page still
// renders the last-known-good feed instead of 502ing. Regenerate it whenever
// the channel publishes something worth snapshotting — hit a healthy
// /api/youtube/feed once and save `data` over src/data/youtube-feed.fallback.json
// (the build script copies it into dist; the loader below tolerates absence).
function loadStaticFallback(): YouTubeFeedPayload | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const data: unknown = require('../data/youtube-feed.fallback.json');
    return isFeedPayload(data) ? data : null;
  } catch {
    return null;
  }
}

const STATIC_FALLBACK = loadStaticFallback();

async function readDiskCache(): Promise<YouTubeFeedPayload | null> {
  try {
    const raw = await fs.readFile(DISK_CACHE_PATH, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    return isFeedPayload(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function writeDiskCache(payload: YouTubeFeedPayload): Promise<void> {
  try {
    await fs.mkdir(path.dirname(DISK_CACHE_PATH), { recursive: true });
    await fs.writeFile(DISK_CACHE_PATH, JSON.stringify(payload), 'utf8');
  } catch (error) {
    // Best-effort only: a failed write must never break the live response.
    console.error('Could not persist YouTube feed cache:', error);
  }
}

function configuredChannelId(): string {
  return (process.env.YOUTUBE_CHANNEL_ID || '').trim() || DEFAULT_CHANNEL_ID;
}

/** RSS carries XML entities (`&amp;`) and occasionally CDATA — undo both. */
function cleanText(value: string): string {
  const withoutCdata = value.replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1');
  return withoutCdata
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function firstGroup(source: string, pattern: RegExp): string | null {
  const match = source.match(pattern);
  return match && match[1] ? match[1] : null;
}

/**
 * YouTube's feed endpoint occasionally answers 500/429 to server-side
 * clients (bot mitigation), then recovers on the next attempt — so a
 * non-browser User-Agent plus a single attempt is the worst combination.
 * Send browser-like headers and retry transient failures with backoff.
 */
const FEED_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  Accept: 'application/atom+xml, application/xml;q=0.9, */*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

const FEED_ATTEMPTS = 4;
const FEED_RETRY_BASE_MS = 1000;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchFeedXml(url: string): Promise<string> {
  // Note: every failure is retried, including 404. On most APIs a 404 is
  // final and retrying it would be wrong — but this RSS endpoint is flaky
  // and answers 404/500 for a perfectly valid channel, minutes after
  // answering 200 for the same URL. Four attempts over ~7s absorb those
  // windows without hammering a client that is already throttling us.
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= FEED_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: FEED_HEADERS,
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) {
        throw new Error(`YouTube RSS answered ${response.status}`);
      }
      const xml = await response.text();
      // A throttled client can come back 200 with an error page — never
      // parse or cache that as a feed.
      if (!xml.includes('<feed') || !xml.includes('<entry>')) {
        throw new Error('YouTube RSS returned an unexpected document');
      }
      return xml;
    } catch (error) {
      lastError = error;
      if (attempt === FEED_ATTEMPTS) break;
      await sleep(FEED_RETRY_BASE_MS * 2 ** (attempt - 1));
    }
  }
  throw lastError;
}

/** Shape of the public feed payload served to the /videos page. */
export interface YouTubeFeedPayload {
  channelId: string;
  channelTitle: string;
  channelUrl: string;
  videos: YouTubeFeedVideo[];
}

/** Pure RSS → payload parser, exported for reuse and one-off maintenance. */
export function parseFeedXml(xml: string, channelId: string): YouTubeFeedPayload {
  const channelTitle =
    cleanText(firstGroup(xml, /<feed[\s\S]*?<title>([\s\S]*?)<\/title>/) || '') || 'PPI Auckland';

  const videos: YouTubeFeedVideo[] = [];
  for (const entry of xml.match(/<entry>[\s\S]*?<\/entry>/g) || []) {
    const id = firstGroup(entry, /<yt:videoId>([^<]+)<\/yt:videoId>/);
    if (!id) continue;
    const title = cleanText(firstGroup(entry, /<title>([\s\S]*?)<\/title>/) || id);
    const publishedAt = firstGroup(entry, /<published>([^<]+)<\/published>/) || '';
    const url =
      firstGroup(entry, /<link[^>]*rel="alternate"[^>]*href="([^"]+)"/) ||
      `https://www.youtube.com/watch?v=${id}`;
    const thumbnail =
      firstGroup(entry, /<media:thumbnail[^>]*url="([^"]+)"/) ||
      `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
    const description = cleanText(
      firstGroup(entry, /<media:description>([\s\S]*?)<\/media:description>/) || ''
    );
    const viewsRaw = firstGroup(entry, /<media:statistics[^>]*views="([^"]+)"/);
    const views = viewsRaw !== null ? Number(viewsRaw) : null;

    videos.push({
      id,
      title,
      url,
      thumbnail,
      publishedAt,
      description,
      views: views !== null && Number.isFinite(views) ? views : null,
    });
  }

  return {
    channelId,
    channelTitle,
    channelUrl: `https://www.youtube.com/channel/${channelId}`,
    videos,
  };
}

/**
 * Official YouTube Data API v3 source. Unlike the RSS endpoint this works
 * from any IP (datacenters included) because the key identifies the caller
 * instead of bot-mitigation guessing. Costs ~3 quota units per refresh —
 * noise against the 10k daily free quota. Used first when YOUTUBE_API_KEY
 * is set; the RSS endpoint stays as the keyless backup.
 */
function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) {
    throw new Error(`YouTube Data API answered ${response.status}`);
  }
  return (await response.json()) as unknown;
}

async function fetchViaDataApi(channelId: string, apiKey: string): Promise<YouTubeFeedPayload> {
  // A channel's uploads live in the "UU…" playlist derived from its id —
  // overridable for the day YouTube changes that convention.
  const playlistId =
    (process.env.YOUTUBE_UPLOADS_PLAYLIST_ID || '').trim() || `UU${channelId.slice(2)}`;
  const key = `key=${encodeURIComponent(apiKey)}`;

  const itemsJson = await fetchJson(
    `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${encodeURIComponent(playlistId)}&maxResults=15&${key}`
  );
  const rawItems = asRecord(itemsJson)?.items;
  const items = Array.isArray(rawItems) ? rawItems : [];
  if (items.length === 0) {
    throw new Error('YouTube Data API returned no uploads');
  }

  const parsed = items
    .map((entry) => {
      const item = asRecord(entry);
      const snippet = asRecord(item?.snippet);
      const details = asRecord(item?.contentDetails);
      const id =
        asString(details?.videoId) || asString(asRecord(snippet?.resourceId)?.videoId);
      if (!id) return null;
      const thumbnails = asRecord(snippet?.thumbnails);
      const thumbnail =
        asString(asRecord(thumbnails?.maxres)?.url) ||
        asString(asRecord(thumbnails?.high)?.url) ||
        asString(asRecord(thumbnails?.medium)?.url) ||
        asString(asRecord(thumbnails?.default)?.url) ||
        `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
      return {
        id,
        title: asString(snippet?.title) || id,
        url: `https://www.youtube.com/watch?v=${id}`,
        thumbnail,
        publishedAt:
          asString(details?.videoPublishedAt) || asString(snippet?.publishedAt),
        description: asString(snippet?.description),
      };
    })
    .filter((video): video is Omit<YouTubeFeedVideo, 'views'> => video !== null);

  if (parsed.length === 0) {
    throw new Error('YouTube Data API returned no parseable uploads');
  }

  // View counts are enrichment, not load-bearing: one batched call, and if it
  // fails the feed still ships with views: null.
  const views = new Map<string, number>();
  try {
    const ids = [...new Set(parsed.map((video) => video.id))].join(',');
    const statsJson = await fetchJson(
      `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${encodeURIComponent(ids)}&${key}`
    );
    const statsItems = asRecord(statsJson)?.items;
    if (Array.isArray(statsItems)) {
      for (const entry of statsItems) {
        const video = asRecord(entry);
        const id = asString(video?.id);
        const count = Number(asRecord(video?.statistics)?.viewCount);
        if (id && Number.isFinite(count)) views.set(id, count);
      }
    }
  } catch (error) {
    console.error('YouTube Data API statistics lookup failed (continuing without views):', error);
  }

  const videos: YouTubeFeedVideo[] = parsed.map((video) => ({
    ...video,
    views: views.get(video.id) ?? null,
  }));
  const channelTitle = asString(
    asRecord(asRecord(items[0])?.snippet)?.channelTitle
  );

  return {
    channelId,
    channelTitle: channelTitle || 'PPI Auckland',
    channelUrl: `https://www.youtube.com/channel/${channelId}`,
    videos,
  };
}

/**
 * Public feed of the PPI Auckland YouTube channel.
 *
 * Source chain, first success wins: Data API (only when YOUTUBE_API_KEY is
 * set — reliable from any IP) → channel RSS (keyless backup, flaky from
 * datacenters) → in-memory cache → disk cache → repo-bundled snapshot.
 * Only when every layer is empty does the route 502.
 */
export const getYouTubeFeed = async (_req: Request, res: Response): Promise<void> => {
  const channelId = configuredChannelId();
  try {
    const now = Date.now();
    if (cache && cache.expiresAt > now) {
      res.json({ success: true, data: cache.payload, cached: true });
      return;
    }

    const failures: unknown[] = [];
    let payload: YouTubeFeedPayload | null = null;

    const apiKey = (process.env.YOUTUBE_API_KEY || '').trim();
    if (apiKey) {
      try {
        payload = await fetchViaDataApi(channelId, apiKey);
      } catch (error) {
        failures.push(error);
      }
    }

    if (!payload) {
      try {
        const xml = await fetchFeedXml(
          `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`
        );
        payload = parseFeedXml(xml, channelId);
      } catch (error) {
        failures.push(error);
      }
    }

    if (!payload) throw failures[failures.length - 1];

    cache = { expiresAt: now + FEED_TTL_MS, payload };
    await writeDiskCache(payload);
    res.json({ success: true, data: payload });
  } catch (error) {
    console.error(`Error fetching YouTube feed (channel ${channelId}):`, error);
    // Degrade gracefully, newest first: in-memory cache (even expired), then
    // the last-good payload on disk (survives restarts), then the snapshot
    // bundled with the deploy — only then 502.
    if (cache) {
      res.json({ success: true, data: cache.payload, cached: true, stale: true });
      return;
    }
    const diskPayload = await readDiskCache();
    if (diskPayload) {
      res.json({ success: true, data: diskPayload, cached: true, stale: true });
      return;
    }
    if (STATIC_FALLBACK) {
      res.json({ success: true, data: STATIC_FALLBACK, cached: true, stale: true, static: true });
      return;
    }
    res.status(502).json({
      success: false,
      error: {
        code: 'YOUTUBE_UNAVAILABLE',
        message: 'Could not load the YouTube feed right now.',
      },
    });
  }
};
