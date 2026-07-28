import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SITE } from "@/lib/constants";
import { fetchResearchBySlug, toAbsoluteMediaUrl, toMetaDescription } from "@/lib/server-api";
import ResearchDetail from "./_components/research-detail";

interface ResearchPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ResearchPageProps): Promise<Metadata> {
  const { slug } = await params;
  const research = await fetchResearchBySlug(slug);

  if (!research) {
    return {
      title: "Research not found",
      description: "This publication is no longer available in the PPIA Auckland Research Corner.",
      robots: { index: false, follow: true },
    };
  }

  const canonical = `/activities/research-corner/${slug}`;
  const title = research.metaTitle?.trim() || research.title;
  const description =
    research.metaDescription?.trim() ||
    toMetaDescription(
      research.abstract || research.abstractIndonesian,
      `${research.title} — a publication in the PPIA Auckland Research Corner.`
    );
  const image = toAbsoluteMediaUrl(research.imageUrl);
  const authorName = research.authors || research.mainAuthor?.name;

  return {
    title,
    description,
    keywords: research.keywords
      ? research.keywords.split(",").map((keyword) => keyword.trim()).filter(Boolean)
      : undefined,
    authors: authorName ? [{ name: authorName }] : undefined,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: `${SITE.url}${canonical}`,
      type: "article",
      publishedTime: research.publicationDate || research.createdAt,
      modifiedTime: research.updatedAt,
      ...(authorName ? { authors: [authorName] } : {}),
      ...(image ? { images: [{ url: image, alt: research.title }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default async function ResearchDetailPage({ params }: ResearchPageProps) {
  const { slug } = await params;
  const research = await fetchResearchBySlug(slug);

  if (!research) notFound();

  return <ResearchDetail research={research} />;
}
