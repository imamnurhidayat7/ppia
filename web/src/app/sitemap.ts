import { MetadataRoute } from "next";
import { SITE } from "@/lib/constants";
import {
  fetchArticlesForSitemap,
  fetchEventsForSitemap,
  fetchResearchForSitemap,
} from "@/lib/server-api";

const staticRoutes = [
  "",
  "/about/ambition-action",
  "/about/cabinet",
  "/about/ad-art",
  "/about/historical-archive",
  "/activities/events",
  "/activities/news-articles",
  "/activities/research-corner",
  "/opportunities/wiki-ppia",
  "/opportunities/scholarship",
  "/opportunities/career-info",
  "/opportunities/partnership",
  "/contact",
  "/legal/privacy-policy",
  "/legal/terms-of-service",
  "/register",
  "/login",
  "/pemira",
];

function lastModified(value?: string | null): Date {
  const parsed = value ? new Date(value) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : new Date();
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: `${SITE.url}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "daily" : "weekly",
    priority: route === "" ? 1 : 0.8,
  }));

  // A sitemap without the detail URLs is still a valid, useful sitemap. Losing
  // the API — at build time or on a revalidation — must not take the route (or
  // the production build) down with it, so failures degrade to static routes.
  try {
    const [articles, events, researches] = await Promise.all([
      fetchArticlesForSitemap(),
      fetchEventsForSitemap(),
      fetchResearchForSitemap(),
    ]);

    for (const article of articles) {
      if (!article.slug) continue;
      entries.push({
        url: `${SITE.url}/activities/news-articles/${article.slug}`,
        lastModified: lastModified(article.updatedAt || article.createdAt),
        changeFrequency: "monthly",
        priority: 0.7,
      });
    }

    for (const event of events) {
      if (!event.slug) continue;
      entries.push({
        url: `${SITE.url}/activities/events/${event.slug}`,
        lastModified: lastModified(event.updatedAt || event.createdAt),
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }

    for (const research of researches) {
      if (!research.slug) continue;
      entries.push({
        url: `${SITE.url}/activities/research-corner/${research.slug}`,
        lastModified: lastModified(research.updatedAt || research.createdAt),
        changeFrequency: "monthly",
        priority: 0.7,
      });
    }
  } catch {
    return entries;
  }

  return entries;
}
