import { Metadata } from "next";
import { notFound } from "next/navigation";
import api from "@/lib/api";
import type { Page } from "@/lib/api-types";
import { PageBlockRenderer } from "@/components/blocks/PageBlockRenderer";
import { getTemplate, type PageTemplate } from "@/lib/page-templates";
import { sanitizeHtml, safeJsonLd } from "@/lib/sanitize-html";

interface Props {
  params: Promise<{ slug: string[] }>;
}

async function getPage(slugSegments: string[]): Promise<Page | null> {
  const slug = slugSegments.join("/");
  try {
    const data = await api.getPageBySlug(slug);
    return data.page;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPage(slug);

  if (!page) {
    return {
      title: "Page Not Found",
      description: "The page you're looking for doesn't exist.",
    };
  }

  return {
    title: page.metaTitle || page.title,
    description: page.metaDescription || page.excerpt || "",
    openGraph: {
      title: page.metaTitle || page.title,
      description: page.metaDescription || page.excerpt || "",
      images: page.featuredImage ? [page.featuredImage] : [],
      type: "article",
    },
  };
}

export default async function DynamicPage({ params }: Props) {
  const { slug } = await params;

  // Don't intercept internal Next.js routes
  if (slug[0] === 'dashboard' || slug[0] === 'api' || slug[0] === '_next') {
    notFound();
  }

  const page = await getPage(slug);

  if (!page) {
    notFound();
  }

  // Generate JSON-LD structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: page.title,
    description: page.excerpt || page.metaDescription || "",
    url: `https://ppiauckland.org/${page.slug}`,
    ...(page.featuredImage && { image: page.featuredImage }),
    datePublished: page.createdAt,
    dateModified: page.updatedAt,
    author: {
      "@type": "Organization",
      name: page.author?.name || "PPIA Auckland",
    },
  };

  const templateId = (page.template as PageTemplate) || "default";
  const templateConfig = getTemplate(templateId);
  const isLanding = templateId === "landing";
  const containerClass = isLanding ? "max-w-7xl" : "max-w-4xl";

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />

      {/* Page Header with featured image */}
      {page.featuredImage && (
        <div
          className="w-full h-[300px] bg-cover bg-center"
          style={{ backgroundImage: `url(${page.featuredImage})` }}
        />
      )}

      {/* Page Content */}
      <article className={`${containerClass} mx-auto px-6 py-12`}>
        {/* Title */}
        <h1 className="text-4xl font-bold text-[#1A2B4A] dark:text-slate-100 mb-4">{page.title}</h1>

        {/* Excerpt */}
        {page.excerpt && (
          <p className="text-xl text-[#64748B] dark:text-slate-400 mb-8 leading-relaxed">
            {page.excerpt}
          </p>
        )}

        {/* Page Type Badge */}
        {page.pageType && page.pageType !== "standard" && (
          <span className="inline-block px-3 py-1 bg-[#E8231A]/10 text-[#E8231A] text-sm font-medium rounded-full mb-6">
            {page.pageType}
          </span>
        )}

        {/* Template Badge */}
        {templateId !== "default" && (
          <span className="inline-block px-3 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full mb-6 ml-2">
            {templateConfig.label}
          </span>
        )}

        {/* Blocks */}
        {page.blocks && page.blocks.length > 0 && (
          <div className={isLanding ? "mt-8 space-y-16" : "mt-8"}>
            {page.blocks.map((block) => (
              <PageBlockRenderer key={block.id} block={block} />
            ))}
          </div>
        )}

        {/* Fallback: Legacy raw content */}
        {/* Page Content (fallback when no blocks) */}
        {(!page.blocks || page.blocks.length === 0) && !!page.content && (
          (() => {
            // Normalize content: treat empty objects/strings as no content
            const isEmptyContent =
              (typeof page.content === "string" && page.content.trim() === "") ||
              (typeof page.content === "object" &&
                page.content !== null &&
                Object.keys(page.content as object).length === 0);
            if (isEmptyContent) return null;
            return (
              <div
                className="prose prose-slate max-w-none"
                dangerouslySetInnerHTML={{
                  __html: sanitizeHtml(
                    typeof page.content === "string"
                      ? page.content
                      : JSON.stringify(page.content, null, 2)
                  ),
                }}
              />
            );
          })()
        )}

        {/* Fallback: Empty state */}
        {(!page.blocks || page.blocks.length === 0) &&
          (!page.content ||
            (typeof page.content === "string" && page.content.trim() === "") ||
            (typeof page.content === "object" &&
              page.content !== null &&
              Object.keys(page.content as object).length === 0)) && (
            <p className="text-[#64748B] text-center py-12">
              This page has no content yet.
            </p>
          )}
      </article>
    </>
  );
}

