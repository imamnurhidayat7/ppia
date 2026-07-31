"use client";
import { toPlainText } from "@/lib/sanitize-html";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import PageHeader from "@/components/PageHeader";
import WaveTransition from "@/components/sections/WaveTransition";
import { Calendar, User, ArrowRight, BookOpen, Newspaper } from "lucide-react";
import api from "@/lib/api";
import { getImageUrl } from "@/lib/utils";
import { ArticlesListSkeleton } from "@/components/skeletons/public-skeletons";

/**
 * Seam colours for the waterline transitions — they match the ends of the
 * `.sea-deep` / `.sea-shore` gradients in globals.css.
 */
const DEEP_SEA = "#0B1C2E";
const SHORE = "#FFFFFF";

type Tab = "All" | "News" | "Articles";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

interface Post {
  id: string;
  slug: string;
  type: "News" | "Articles";
  title: string;
  excerpt: string;
  author: string;
  authorName?: string;
  date: string;
  readTime: string;
  color: string;
  featured?: boolean;
  createdAt: string;
  imageUrl?: string;
}

const typeColors: Record<string, string> = {
  News: "#E8231A",
  Articles: "#8B5CF6",
};

interface ApiArticle {
  id: string;
  slug?: string;
  title: string;
  excerpt?: string;
  content?: unknown;
  imageUrl?: string;
  createdAt: string;
  author?: { name?: string; username?: string };
  division?: { name?: string };
  isFeatured?: boolean;
  /** Schema value: "Article" or "News". Drives the public tab the post is
      grouped under. Optional because some older API responses omit it. */
  category?: string;
}

function mapApiArticleToPost(apiArticle: ApiArticle): Post {
  const createdAt = new Date(apiArticle.createdAt);
  const authorName = apiArticle.author?.name || apiArticle.author?.username || "PPI Auckland";

  let readTime = "3 min read";
  const apiArticleAny = apiArticle as ApiArticle & { readingTime?: number };
  if (apiArticleAny.readingTime) {
    const minutes = Math.max(1, Math.ceil(apiArticleAny.readingTime / 60));
    readTime = `${minutes} min read`;
  } else if (apiArticle.content) {
    const contentStr = JSON.stringify(apiArticle.content);
    const wordCount = contentStr.split(/\s+/).length;
    const minutes = Math.max(1, Math.ceil(wordCount / 200));
    readTime = `${minutes} min read`;
  }

  // Use the API's `category` field as the source of truth. The schema stores
  // singular values ("Article" / "News") but the public tab shows the plural
  // form ("Articles") for the article bucket, so we normalise here. Falling
  // back to "News" when the field is missing is the same default the API uses
  // when a post is created without a category, so the UI matches what the
  // admin actually intended.
  let type: "News" | "Articles" = "News";
  if (apiArticle.category) {
    const cat = apiArticle.category.toLowerCase();
    if (cat === "article" || cat === "articles") {
      type = "Articles";
    } else if (cat === "news") {
      type = "News";
    }
  }

  return {
    id: apiArticle.id,
    slug: apiArticle.slug || slugify(apiArticle.title),
    type,
    title: apiArticle.title,
    excerpt: apiArticle.excerpt || "",
    author: authorName,
    authorName,
    // Printed as chart data, so the same en-NZ format as the homepage log lines.
    date: createdAt.toLocaleDateString("en-NZ", { day: "2-digit", month: "short", year: "numeric" }),
    readTime,
    color: typeColors[type],
    featured: apiArticle.isFeatured || false,
    createdAt: apiArticle.createdAt,
    imageUrl: apiArticle.imageUrl,
  };
}

export default function NewsArticlesPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("All");

  // CMS-managed header content (falls back to defaults if fetch fails)
  const [headerData, setHeaderData] = useState({
    label: "Activities",
    title: "News &",
    titleAccent: "Articles",
    description: "Stories, insights, and community updates from the PPIA Auckland family.",
    breadcrumbs: [{ label: "Activities" }, { label: "News & Articles" }],
  });

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        setLoading(true);
        const response = await api.getArticles({ limit: 50 });
        if (response.articles && Array.isArray(response.articles)) {
          const mappedPosts = response.articles.map(mapApiArticleToPost);
          mappedPosts.sort((a: Post, b: Post) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setPosts(mappedPosts);
        } else if (Array.isArray(response)) {
          const mappedPosts = response.map(mapApiArticleToPost);
          mappedPosts.sort((a: Post, b: Post) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setPosts(mappedPosts);
        } else {
          setPosts([]);
        }
      } catch (err) {
        console.error("Failed to fetch articles:", err);
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();

    // Fetch CMS-managed header content
    api.getPageBySlug('activities/news-articles')
      .then((res) => {
        const header = res?.page?.content?.header;
        if (header) {
          setHeaderData({
            label: header.label ?? "Activities",
            title: header.title ?? "News &",
            titleAccent: header.titleAccent ?? "Articles",
            description: header.description ?? headerData.description,
            breadcrumbs: header.breadcrumbs ?? [{ label: "Activities" }, { label: "News & Articles" }],
          });
        }
      })
      .catch(() => { /* keep defaults */ });
  }, []);

  const filtered = activeTab === "All" ? posts : posts.filter((p) => p.type === activeTab);
  const featured = posts.find((p) => p.featured);
  const rest = filtered.filter((p) => !p.featured);
  const showFeatured = activeTab === "All" || activeTab === "News";

  if (loading) {
    return (
      <>
        <PageHeader
          label={headerData.label}
          title={headerData.title}
          titleAccent={headerData.titleAccent}
          description={headerData.description}
          breadcrumbs={headerData.breadcrumbs}
        />
        <ArticlesListSkeleton />
      </>
    );
  }

  return (
    <>
      <PageHeader
        label={headerData.label}
        title={headerData.title}
        titleAccent={headerData.titleAccent}
        description={headerData.description}
        breadcrumbs={headerData.breadcrumbs}
      />

      {/* Waterline between the deep-sea masthead and the shore below it. */}
      <WaveTransition from={DEEP_SEA} to={SHORE} />

      <section className="sea-shore relative overflow-hidden py-16">
        <div
          aria-hidden="true"
          className="sea-chart pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            maskImage: "radial-gradient(ellipse 80% 70% at 50% 30%, transparent 25%, black 90%)",
            WebkitMaskImage: "radial-gradient(ellipse 80% 70% at 50% 30%, transparent 25%, black 90%)",
          }}
        />
        <div className="relative max-w-7xl mx-auto px-6">
          {/*
            Tabs as a labelled board strip on chart paper: the filing axis is
            named, and the options are squared-off labels rather than pills
            floating in a grey trough.
          */}
          <div className="chart-paper mb-10 rounded-[5px] border border-[#DCE7F1]">
            <p className="data-type px-5 pb-3 pt-4 text-[12px] font-bold uppercase ink-muted">
              Collection
            </p>
            <div aria-hidden="true" className="rope-rule mx-5" />
            <div className="flex flex-wrap items-center gap-2 px-5 py-4">
              {(["All", "News", "Articles"] as Tab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  aria-pressed={activeTab === tab}
                  className={`data-type flex items-center gap-2 rounded-[3px] border px-3 py-1.5 text-[12px] font-bold uppercase transition-colors ${
                    activeTab === tab
                      ? "border-[#0F2438] bg-[#0F2438] text-white"
                      : "border-[#DCE7F1] text-[#5B6B7C] hover:border-[#9FB3C6] hover:text-[#0F1B33]"
                  }`}
                >
                  {tab === "News" ? (
                    <Newspaper size={11} aria-hidden="true" />
                  ) : tab === "Articles" ? (
                    <BookOpen size={11} aria-hidden="true" />
                  ) : null}
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Featured article */}
          {showFeatured && featured && (
            <Link href={`/activities/news-articles/${featured.slug}`}>
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{ duration: 0.6 }}
                className="sea-deep group relative mb-10 cursor-pointer overflow-hidden rounded-[5px] border border-white/10"
              >
                <div aria-hidden="true" className="pointer-events-none absolute inset-0">
                  <div
                    className="sea-chart-light absolute inset-0 opacity-[0.05]"
                    style={{
                      maskImage: "radial-gradient(ellipse 75% 70% at 40% 50%, transparent 20%, black 85%)",
                      WebkitMaskImage: "radial-gradient(ellipse 75% 70% at 40% 50%, transparent 20%, black 85%)",
                    }}
                  />
                  <div
                    className="absolute inset-0 opacity-20"
                    style={{
                      backgroundImage: `radial-gradient(circle at 20% 50%, ${featured.color}, transparent 50%)`,
                    }}
                  />
                </div>
                <div className="relative z-10 p-8 md:p-12 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div>
                    <div className="flex items-center gap-3 mb-5">
                      <span
                        className="data-type rounded-[3px] px-2.5 py-1 text-[12px] font-bold uppercase"
                        style={{ background: `${featured.color}30`, color: featured.color }}
                      >
                        Featured
                      </span>
                      <span className="data-type text-[12px] uppercase text-white/70">{featured.type}</span>
                    </div>
                    <h2
                      className="font-black text-white text-2xl md:text-3xl leading-tight mb-4"
                      style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
                    >
                      {featured.title}
                    </h2>
                    <p className="text-[#94A3B8] text-sm leading-relaxed mb-6">{featured.excerpt}</p>
                    <div className="data-type flex flex-wrap items-center gap-3 text-[12px] uppercase text-white/70">
                      <span className="flex items-center gap-1.5">
                        <User size={10} aria-hidden="true" />
                        {featured.author}
                      </span>
                      <span aria-hidden="true" className="h-1 w-1 rounded-full bg-white/25" />
                      <span className="flex items-center gap-1.5">
                        <Calendar size={10} aria-hidden="true" />
                        {featured.date}
                      </span>
                      <span aria-hidden="true" className="h-1 w-1 rounded-full bg-white/25" />
                      <span>{featured.readTime}</span>
                    </div>
                  </div>
                  <div className="hidden md:flex items-center justify-center">
                    <div
                      className="flex h-48 w-48 items-center justify-center rounded-[5px] opacity-20 transition-opacity group-hover:opacity-30"
                      style={{ background: featured.color }}
                      aria-hidden="true"
                    >
                      <BookOpen size={64} className="text-white" />
                    </div>
                  </div>
                </div>
              </motion.div>
            </Link>
          )}

          {/* Posts grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rest.map((post, i) => (
              <Link key={post.id} href={`/activities/news-articles/${post.slug}`}>
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.1 }}
                  transition={{ duration: 0.4, delay: i * 0.06 }}
                  className="chart-paper group flex h-full cursor-pointer flex-col overflow-hidden rounded-[5px] border border-[#DCE7F1] transition-all duration-300 hover:-translate-y-1 hover:border-[#C3D2E0] hover:shadow-[0_28px_70px_-30px_rgba(7,19,33,0.42)]"
                >
                  <div className="h-40 flex items-center justify-center relative overflow-hidden">
                    {post.imageUrl ? (
                      <Image
                        src={getImageUrl(post.imageUrl) || post.imageUrl}
                        alt={post.title}
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center"
                        style={{
                          background: `linear-gradient(135deg, ${post.color}25 0%, ${post.color}08 100%)`,
                        }}
                      >
                        <div
                          className="flex h-16 w-16 items-center justify-center rounded-[4px] opacity-30"
                          style={{ background: post.color }}
                          aria-hidden="true"
                        >
                          {post.type === "News" ? (
                            <Newspaper size={28} className="text-white" />
                          ) : (
                            <BookOpen size={28} className="text-white" />
                          )}
                        </div>
                      </div>
                    )}
                    <span
                      className="data-type absolute bottom-0 left-0 px-3 py-1.5 text-[12px] font-bold uppercase text-white"
                      style={{ background: `${post.color}E6` }}
                    >
                      {post.type}
                    </span>
                  </div>

                  <div className="p-5 flex flex-col flex-1">
                    {/* Log-entry meta line: date and reading time as data, split
                        by a rope hairline running to the card edge. */}
                    <div className="data-type mb-3 flex items-center gap-3 text-[12px] uppercase ink-muted">
                      <span className="flex items-center gap-1.5">
                        <Calendar size={10} aria-hidden="true" />
                        {post.date}
                      </span>
                      <span aria-hidden="true" className="rope-rule h-px flex-1 opacity-70" />
                      <span>{post.readTime}</span>
                    </div>
                    <h3
                      className="font-bold text-[#0F1B33] text-base leading-snug mb-2 group-hover:text-[#C41E16] transition-colors line-clamp-2"
                      style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
                    >
                      {post.title}
                    </h3>
                    <p className="ink-body text-sm leading-relaxed mb-4 flex-1 line-clamp-3">
                      {toPlainText(post.excerpt)}
                    </p>
                    <div className="mt-auto pt-4">
                      <div aria-hidden="true" className="rope-rule mb-3" />
                      <div className="flex items-center justify-between">
                        <span className="data-type flex items-center gap-1.5 text-[12px] uppercase ink-muted">
                          <User size={10} aria-hidden="true" />
                          {post.author}
                        </span>
                        <span className="flex items-center gap-1 text-sm font-semibold accent-label transition-all group-hover:gap-2">
                          Read <ArrowRight size={12} aria-hidden="true" />
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="chart-paper rounded-[5px] border border-[#DCE7F1] py-16 text-center">
              <Newspaper className="mx-auto mb-4 h-12 w-12 text-[#C3D2E0]" aria-hidden="true" />
              <p className="text-[#0F1B33] text-lg font-bold">No articles found</p>
              <p className="data-type mt-2 text-[12px] uppercase ink-muted">Try changing the filter</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
