import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SITE } from "@/lib/constants";
import { fetchArticleBySlug, toAbsoluteMediaUrl, toMetaDescription } from "@/lib/server-api";
import ArticleDetail from "./_components/article-detail";

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await fetchArticleBySlug(slug);

  if (!article) {
    return {
      title: "Article not found",
      description: "This article is no longer available on the PPIA Auckland website.",
      robots: { index: false, follow: true },
    };
  }

  const canonical = `/activities/news-articles/${slug}`;
  const title = article.metaTitle?.trim() || article.title;
  const description =
    article.metaDescription?.trim() ||
    toMetaDescription(
      article.excerpt || article.content,
      `${article.title} — news and stories from PPIA Auckland.`
    );
  const image = toAbsoluteMediaUrl(article.imageUrl);

  return {
    title,
    description,
    authors: article.User?.name ? [{ name: article.User.name }] : undefined,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: `${SITE.url}${canonical}`,
      type: "article",
      publishedTime: article.createdAt,
      modifiedTime: article.updatedAt,
      ...(article.User?.name ? { authors: [article.User.name] } : {}),
      ...(article.tags?.length ? { tags: article.tags.map((tag) => tag.name) } : {}),
      ...(image ? { images: [{ url: image, alt: article.title }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default async function ArticleDetailPage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = await fetchArticleBySlug(slug);

  if (!article) notFound();

  return <ArticleDetail article={article} />;
}
