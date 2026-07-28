"use client";
import { toPlainText } from "@/lib/sanitize-html";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import PageHeader from "@/components/PageHeader";
import { Calendar, User, ArrowRight, BookOpen, Newspaper } from "lucide-react";
import api from "@/lib/api";
import { getImageUrl } from "@/lib/utils";
import { ArticlesListSkeleton } from "@/components/skeletons/public-skeletons";

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

  let type: "News" | "Articles" = "News";
  if (apiArticle.division?.name) {
    const divName = apiArticle.division.name.toLowerCase();
    if (divName.includes("article") || divName.includes("research")) {
      type = "Articles";
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
    date: createdAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
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

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          {/* Tabs */}
          <div className="flex gap-2 mb-10 bg-[#F1F5F9] rounded-xl p-1 w-fit">
            {(["All", "News", "Articles"] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
                style={
                  activeTab === tab
                    ? { background: "#1A2B4A", color: "white" }
                    : { color: "#64748B" }
                }
              >
                {tab === "News" ? <Newspaper size={14} /> : tab === "Articles" ? <BookOpen size={14} /> : null}
                {tab}
              </button>
            ))}
          </div>

          {/* Featured article */}
          {showFeatured && featured && (
            <Link href={`/activities/news-articles/${featured.slug}`}>
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{ duration: 0.6 }}
                className="group relative rounded-3xl overflow-hidden mb-10 cursor-pointer"
                style={{ background: `linear-gradient(135deg, #0D1B33 0%, #1A2B4A 100%)` }}
              >
                <div
                  className="absolute inset-0 opacity-20 pointer-events-none"
                  style={{
                    backgroundImage: `radial-gradient(circle at 20% 50%, ${featured.color}, transparent 50%)`,
                  }}
                />
                <div className="relative z-10 p-8 md:p-12 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div>
                    <div className="flex items-center gap-3 mb-5">
                      <span
                        className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                        style={{ background: `${featured.color}30`, color: featured.color }}
                      >
                        Featured
                      </span>
                      <span className="text-[#64748B] text-xs uppercase tracking-wider">{featured.type}</span>
                    </div>
                    <h2
                      className="font-black text-white text-2xl md:text-3xl leading-tight mb-4"
                      style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
                    >
                      {featured.title}
                    </h2>
                    <p className="text-[#94A3B8] text-sm leading-relaxed mb-6">{featured.excerpt}</p>
                    <div className="flex items-center gap-4 text-xs text-[#64748B]">
                      <span className="flex items-center gap-1.5">
                        <User size={12} />
                        {featured.author}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Calendar size={12} />
                        {featured.date}
                      </span>
                      <span>{featured.readTime}</span>
                    </div>
                  </div>
                  <div className="hidden md:flex items-center justify-center">
                    <div
                      className="w-48 h-48 rounded-3xl flex items-center justify-center opacity-20 group-hover:opacity-30 transition-opacity"
                      style={{ background: featured.color }}
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
                  className="group bg-white rounded-2xl border border-[#E2E8F0] hover:shadow-2xl hover:border-transparent transition-all duration-300 overflow-hidden cursor-pointer flex flex-col h-full"
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
                          className="w-16 h-16 rounded-2xl flex items-center justify-center opacity-30"
                          style={{ background: post.color }}
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
                      className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm"
                      style={{ background: post.color, color: "white" }}
                    >
                      {post.type}
                    </span>
                  </div>

                  <div className="p-5 flex flex-col flex-1">
                    <h3
                      className="font-bold text-[#1A2B4A] text-base leading-snug mb-2 group-hover:text-[#E8231A] transition-colors line-clamp-2"
                      style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
                    >
                      {post.title}
                    </h3>
                    <p className="text-[#64748B] text-sm leading-relaxed mb-4 flex-1 line-clamp-3">
                      {toPlainText(post.excerpt)}
                    </p>
                    <div className="flex items-center justify-between text-xs text-[#94A3B8] border-t border-[#F1F5F9] pt-4 mt-auto">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <User size={11} />
                          {post.author}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar size={11} />
                          {post.date}
                        </span>
                      </div>
                      <span className="flex items-center gap-1 text-[#E8231A] font-medium group-hover:gap-2 transition-all">
                        Read <ArrowRight size={12} />
                      </span>
                    </div>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-12">
              <p className="text-[#64748B] text-lg">No articles found</p>
              <p className="text-[#94A3B8] text-sm mt-1">Try changing the filter</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
