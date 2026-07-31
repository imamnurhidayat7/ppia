/**
 * Read-only data access for server components, generateMetadata and the sitemap.
 *
 * `@/lib/api` cannot be used from the server: its constructor reads
 * `localStorage` for the auth token and its 401 interceptor navigates via
 * `window.location`, both of which only exist in the browser. Public content
 * also wants HTTP caching, which the axios client does not provide. So these
 * helpers use `fetch` directly with a revalidate window.
 *
 * Every function resolves to `null`/`[]` instead of throwing. Metadata
 * generation, page rendering and sitemap generation all run at request or build
 * time, where an unreachable API must degrade rather than break the route.
 */

import { toPlainText } from '@/lib/sanitize-html';
import type { LandingSection } from '@/lib/api-types';
import type { RegField } from '@/lib/event-registration';
import { API_ORIGIN as API_BASE } from '@/lib/api-base';

/** Public content changes rarely; five minutes keeps crawlers and readers current enough. */
const PUBLIC_REVALIDATE = 300;

export interface PublicAuthor {
  id?: string;
  name: string;
  avatar?: string;
}

export interface PublicTag {
  id: string;
  name: string;
  slug: string;
  color?: string;
}

export interface PublicEvent {
  id: string;
  title: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  startDate: string;
  endDate?: string | null;
  location?: string | null;
  locationMapUrl?: string | null;
  capacity?: number | null;
  isFree?: boolean;
  registrationDeadline?: string | null;
  registrationFields?: RegField[] | null;
  published?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PublicArticle {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content?: unknown;
  imageUrl?: string;
  category?: string;
  published?: boolean;
  readTime?: number;
  readingTime?: number;
  metaTitle?: string;
  metaDescription?: string;
  author?: PublicAuthor;
  User?: PublicAuthor;
  tags?: PublicTag[];
  createdAt: string;
  updatedAt: string;
}

export interface PublicResearch {
  id: string;
  slug: string;
  title: string;
  titleIndonesian?: string;
  abstract?: string;
  abstractIndonesian?: string;
  researchType?: string;
  researchStatus?: string;
  authors?: string;
  publicationDate?: string;
  venue?: string;
  venueDate?: string;
  doi?: string;
  pdfUrl?: string;
  url?: string;
  keywords?: string;
  citationFormat?: string;
  viewCount?: number;
  downloadCount?: number;
  imageUrl?: string;
  category?: string;
  color?: string;
  metaTitle?: string;
  metaDescription?: string;
  division?: { name: string };
  Division?: { name: string };
  mainAuthor?: PublicAuthor;
  tags?: PublicTag[];
  createdAt: string;
  updatedAt?: string;
}

async function getJson<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${API_BASE}/api${path}`, {
      next: { revalidate: PUBLIC_REVALIDATE },
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchEventBySlug(slug: string): Promise<PublicEvent | null> {
  const data = await getJson<{ event?: PublicEvent }>(`/events/slug/${encodeURIComponent(slug)}`);
  return data?.event ?? null;
}

export async function fetchArticleBySlug(slug: string): Promise<PublicArticle | null> {
  const data = await getJson<{ article?: PublicArticle }>(
    `/articles/slug/${encodeURIComponent(slug)}`
  );
  return data?.article ?? null;
}

export async function fetchResearchBySlug(slug: string): Promise<PublicResearch | null> {
  const data = await getJson<{ research?: PublicResearch }>(
    `/research/slug/${encodeURIComponent(slug)}`
  );
  if (!data?.research) return null;

  // Prisma returns the relation as `Division`; consumers read `division`.
  return { ...data.research, division: data.research.division || data.research.Division };
}

/** Upper bound on sitemap entries per collection — large enough for the whole archive. */
const SITEMAP_PAGE_SIZE = 500;

export async function fetchEventsForSitemap(): Promise<PublicEvent[]> {
  const data = await getJson<{ events?: PublicEvent[] }>(`/events?limit=${SITEMAP_PAGE_SIZE}`);
  return data?.events ?? [];
}

export async function fetchArticlesForSitemap(): Promise<PublicArticle[]> {
  const data = await getJson<{ articles?: PublicArticle[] }>(
    `/articles?limit=${SITEMAP_PAGE_SIZE}`
  );
  return data?.articles ?? [];
}

export async function fetchResearchForSitemap(): Promise<PublicResearch[]> {
  const data = await getJson<{ researches?: PublicResearch[] }>(
    `/research?limit=${SITEMAP_PAGE_SIZE}`
  );
  return data?.researches ?? [];
}

/**
 * Make an uploaded asset path usable in Open Graph tags.
 *
 * Crawlers do not resolve site-relative URLs in `og:image`, and uploads are
 * served by the API host rather than the web host, so both cases need the API
 * base prepended.
 */
export function toAbsoluteMediaUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
}

/**
 * Turn a rich-text body into a meta description.
 *
 * CMS long-form fields are stored as HTML, so the markup has to go before the
 * text can be used as a description. Search engines truncate around 160
 * characters, so cut on a word boundary just below that instead of letting the
 * engine cut mid-word.
 */
export function toMetaDescription(source: unknown, fallback: string): string {
  const text = toPlainText(source);
  if (!text) return fallback;
  if (text.length <= 160) return text;

  const clipped = text.slice(0, 160);
  const lastSpace = clipped.lastIndexOf(' ');
  return `${(lastSpace > 80 ? clipped.slice(0, lastSpace) : clipped).trimEnd()}…`;
}

// ── Home page list fetches ───────────────────────────────────────────────
//
// These power the public homepage sections. Rendering them on the server means
// the HTML ships with the content already in it (better LCP and SEO) and the
// response is HTTP-cached for PUBLIC_REVALIDATE seconds instead of triggering a
// separate client request per section on every visit.

/** Latest published events for the homepage carousel. */
export async function fetchHomeEvents(limit = 8): Promise<PublicEvent[]> {
  const data = await getJson<{ events?: PublicEvent[] }>(`/events?limit=${limit}`);
  return data?.events ?? [];
}

/**
 * Latest published articles for the homepage grid.
 *
 * Passes `sort=latest` so the response is the most recent posts by `createdAt`
 * regardless of whether they are featured. The default article list order
 * surfaces featured posts first, which is the right behaviour for editorial
 * indexes but wrong for a "what's new" tile at the top of the homepage.
 */
export async function fetchHomeArticles(limit = 3): Promise<PublicArticle[]> {
  const data = await getJson<{ articles?: PublicArticle[] }>(`/articles?limit=${limit}&sort=latest`);
  return data?.articles ?? [];
}

/**
 * CMS-managed configuration for a landing section (heading, badge, "view all"
 * label, etc.). Returns `null` when the section has not been customised, in
 * which case the component falls back to its built-in defaults.
 */
export async function fetchLandingSection(key: string): Promise<LandingSection | null> {
  const data = await getJson<{ success?: boolean; data?: LandingSection }>(
    `/landing-sections/key/${encodeURIComponent(key)}`
  );
  return data?.data ?? null;
}

/**
 * Fetch a CMS page by slug server-side with ISR caching, so public pages like
 * AD/ART render their content in the initial HTML instead of fetching it
 * client-side on mount.
 */
export async function fetchPageBySlug(slug: string): Promise<{ content?: unknown } | null> {
  return getJson<{ content?: unknown }>(`/pages/slug/${encodeURIComponent(slug)}`);
}
