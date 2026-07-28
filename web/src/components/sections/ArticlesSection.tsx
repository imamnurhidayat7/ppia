"use client";
import { toPlainText } from "@/lib/sanitize-html";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Clock } from "lucide-react";
import api from "@/lib/api";
import { getImageUrl } from "@/lib/utils";
import { useLanguage } from "@/lib/language-context";
import { useLandingColors } from "@/lib/hooks/use-landing-colors";
import { useLandingSection } from "@/lib/hooks/use-landing-section";
import { pickText } from "@/lib/utils";
import type { LandingSection } from "@/lib/api-types";
import SectionHeading from "./SectionHeading";

interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt?: string;
  category?: string;
  createdAt: string;
  readTime?: number;
  imageUrl?: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const categoryColors: Record<string, { from: string; to: string; text: string }> = {
  News: { from: "#1A2B4A", to: "#E8231A", text: "#E8231A" },
  Articles: { from: "#1A2B4A", to: "#8B5CF6", text: "#8B5CF6" },
  default: { from: "#1A2B4A", to: "#3B82F6", text: "#3B82F6" },
};

function getCategoryStyle(category?: string) {
  const c = categoryColors[category || ""] || categoryColors.default;
  return {
    gradientFrom: c.from,
    gradientTo: c.to,
    categoryColor: c.text,
  };
}

/** Map the raw API article list to the display shape used by the grid. */
function mapArticles(items: unknown): Article[] {
  const list = Array.isArray(items) ? items : [];
  return list.slice(0, 3).map((raw) => {
    const a = raw as Record<string, unknown>;
    return {
      id: a.id as string,
      slug: (a.slug as string) || slugify(a.title as string),
      title: a.title as string,
      excerpt: a.excerpt as string | undefined,
      category:
        (a.category as string) ||
        ((a.division as { name?: string })?.name) ||
        "Articles",
      createdAt: a.createdAt as string,
      readTime: a.readTime as number | undefined,
      imageUrl: a.imageUrl as string | undefined,
    };
  });
}

interface ArticlesSectionProps {
  /**
   * Articles resolved on the server. When provided, the section renders them
   * immediately (no client fetch, no loading skeleton). When omitted, it falls
   * back to fetching on the client so the component still works standalone.
   */
  initialArticles?: unknown[];
  /** Server-resolved CMS heading config for this section. */
  initialSection?: LandingSection | null;
}

export default function ArticlesSection({
  initialArticles,
  initialSection,
}: ArticlesSectionProps = {}) {
  // Non-empty server data is authoritative; an empty array usually means the
  // API was unreachable during server rendering, so fall back to a client fetch
  // rather than showing an empty grid until the ISR cache expires.
  const hasInitial = Array.isArray(initialArticles) && initialArticles.length > 0;
  const [articles, setArticles] = useState<Article[]>(() =>
    hasInitial ? mapArticles(initialArticles) : []
  );
  const [loading, setLoading] = useState(!hasInitial);
  const { language } = useLanguage();
  const { colors } = useLandingColors();
  const { section } = useLandingSection("articles", initialSection);
  const isId = language === "id";

  const header = useMemo(() => {
    const cfg = (key: string) =>
      pickText(
        isId,
        section?.config?.[`${key}Id`] as string | undefined,
        section?.config?.[key] as string | undefined
      );

    return {
      badge: cfg("badge") || (isId ? "Artikel" : "Artikel"),
      title: pickText(isId, section?.titleId, section?.title) || (isId ? "Baca & Tumbuh" : "Read & Grow"),
      titleHighlight: section?.config?.titleHighlight || "Grow",
      viewAll: cfg("viewAll") || (isId ? "Semua artikel" : "All articles"),
      viewAllHref: section?.config?.viewAllHref || "/activities/news-articles",
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, language]);

  useEffect(() => {
    // Server already provided the articles — no client fetch needed.
    if (hasInitial) return;

    const fetchArticles = async () => {
      try {
        const response = await api.getArticles({ limit: 3 });
        const items = response.articles || response || [];
        setArticles(mapArticles(items));
      } catch (err) {
        console.error("Failed to fetch articles:", err);
        setArticles([]);
      } finally {
        setLoading(false);
      }
    };
    fetchArticles();
  }, [hasInitial]);

  return (
    <section id="articles" className="py-28 bg-[#F8FAFC]">
      <div className="max-w-7xl mx-auto px-6">
        <SectionHeading
          eyebrow={header.badge}
          title={header.title}
          highlight={header.titleHighlight}
          align="left"
          className="mb-14"
          action={
            <Link
              href={header.viewAllHref}
              className="group inline-flex items-center gap-2 rounded-full border border-[#E2E8F0] bg-white px-5 py-2.5 text-sm font-semibold transition-colors hover:border-current"
              style={{ color: colors.textAccent }}
            >
              {header.viewAll}
              <ArrowRight
                size={15}
                className="transition-transform duration-300 group-hover:translate-x-1"
              />
            </Link>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {loading
            ? [1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="overflow-hidden rounded-2xl border border-[#E7EDF4] bg-white"
                  aria-hidden="true"
                >
                  <div className="h-48 animate-pulse bg-slate-200" />
                  <div className="space-y-3 p-6">
                    <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
                    <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
                    <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
                    <div className="h-10 animate-pulse rounded bg-slate-100" />
                  </div>
                </div>
              ))
            : articles.map((article, i) => {
                const style = getCategoryStyle(article.category);
                return (
                  <Link
                    key={article.id}
                    href={`/activities/news-articles/${article.slug}`}
                  >
                    <motion.article
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: i * 0.1 }}
                      className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-[#E7EDF4] bg-white transition-all duration-300 hover:-translate-y-1 hover:border-transparent hover:shadow-[0_28px_70px_-28px_rgba(15,27,51,0.3)]"
                    >
                      <div
                        className="relative h-48 w-full overflow-hidden"
                        style={{
                          background: `linear-gradient(135deg, ${style.gradientFrom}, ${style.gradientTo})`,
                        }}
                      >
                        {article.imageUrl && (
                          <Image
                            src={getImageUrl(article.imageUrl) || article.imageUrl}
                            alt={article.title}
                            fill
                            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                            className="object-cover transition-transform duration-700 group-hover:scale-[1.06]"
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                        <span
                          className="absolute bottom-4 left-4 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white ring-1 ring-white/25 backdrop-blur-sm"
                          style={{ background: `${style.categoryColor}D9` }}
                        >
                          {article.category || "Article"}
                        </span>
                      </div>

                      <div className="flex flex-1 flex-col p-6">
                        <div className="mb-3 flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-wide text-[#94A3B8]">
                          <span>
                            {new Date(article.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                          <span aria-hidden="true" className="h-1 w-1 rounded-full bg-[#CBD5E1]" />
                          <span className="flex items-center gap-1">
                            <Clock size={11} />
                            {article.readTime ? `${Math.ceil(article.readTime / 60)} min` : "3 min"}
                          </span>
                        </div>

                        {/*
                          The hover colour comes from the theme accent. It used
                          to be `group-hover:!text-red-500` — an important flag
                          hard-coding a colour that ignored the site theme.
                        */}
                        <h3
                          className="mb-2 line-clamp-2 text-[17px] font-bold leading-snug text-[#0F1B33] transition-colors duration-200 group-hover:text-[var(--article-accent)]"
                          style={
                            {
                              fontFamily: "var(--font-poppins), Poppins, sans-serif",
                              "--article-accent": colors.textAccent,
                            } as React.CSSProperties
                          }
                        >
                          {article.title}
                        </h3>
                        <p className="line-clamp-2 flex-1 text-sm leading-relaxed text-[#64748B]">
                          {toPlainText(article.excerpt)}
                        </p>

                        <div
                          className="mt-5 flex items-center gap-1.5 text-sm font-semibold"
                          style={{ color: colors.textAccent }}
                        >
                          Read more
                          <ArrowRight
                            size={14}
                            className="transition-transform duration-300 group-hover:translate-x-1"
                          />
                        </div>
                      </div>
                    </motion.article>
                  </Link>
                );
              })}
        </div>
      </div>
    </section>
  );
}
