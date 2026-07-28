import type { Metadata } from "next";
import ArticlesList from "./_components/articles-list";

export const metadata: Metadata = {
  title: "News & Articles",
  description:
    "News, announcements and student stories from PPIA Auckland — event recaps, life in Aotearoa New Zealand, study tips and updates from the Indonesian student community in Auckland.",
  alternates: { canonical: "/activities/news-articles" },
  openGraph: {
    title: "News & Articles | PPIA Auckland",
    description:
      "News, announcements and student stories from the Indonesian student community in Auckland.",
    url: "https://ppiauckland.org/activities/news-articles",
    type: "website",
  },
};

export default function NewsArticlesPage() {
  return <ArticlesList />;
}
