import type { Metadata } from "next";
import { fetchYouTubeFeed } from "@/lib/server-api";
import VideosContent from "./_components/videos-content";

/**
 * Rebuild at most every thirty minutes (ISR) — the same rhythm as the
 * API-side feed cache, so a new upload appears here within the hour without
 * hitting YouTube on every visit.
 */
export const revalidate = 1800;

export const metadata: Metadata = {
  title: "Videos",
  description:
    "Watch the latest videos from PPI Auckland — podcast episodes, graduation films, webinars and event highlights, synced directly from our YouTube channel.",
  alternates: { canonical: "/activities/videos" },
  openGraph: {
    title: "Videos | PPIA Auckland",
    description:
      "The latest uploads from the PPI Auckland YouTube channel — stories from the Indonesian student community in Auckland.",
    url: "https://ppiauckland.org/activities/videos",
    type: "website",
  },
};

export default async function VideosPage() {
  // Server-rendered so the HTML ships with the feed already in it (SEO) and
  // the response is cached — no client request per visit.
  const feed = await fetchYouTubeFeed();

  return <VideosContent initialFeed={feed} />;
}
