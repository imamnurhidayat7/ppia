"use client";
import { toPlainText } from "@/lib/sanitize-html";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import api from "@/lib/api";
import { ResearchStatsSkeleton, ResearchPapersSkeleton } from "@/components/skeletons/public-skeletons";
import { FileText, ExternalLink, BookOpen, Users, Lightbulb, Globe, FlaskConical, TrendingUp, Search, Eye, Download, ArrowRight } from "lucide-react";

interface Research {
  id: string;
  slug?: string;
  title: string;
  titleIndonesian?: string;
  abstract?: string;
  abstractIndonesian?: string;
  researchType?: string;
  authors?: string;
  publicationDate?: string;
  venue?: string;
  venueDate?: string;
  published?: string;
  doi?: string;
  pdfUrl?: string;
  viewCount?: number;
  downloadCount?: number;
  color: string;
  category: string;
  tags?: { id: string; name: string; slug: string; color: string }[];
  division?: { name: string; color?: string };
  mainAuthor?: { name: string };
  createdAt: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function researchHref(p: Research): string {
  return `/activities/research-corner/${p.slug || slugify(p.title)}`;
}

interface Tag {
  id: string;
  name: string;
  slug: string;
  color?: string;
  _count?: { researches: number };
}

// Fallback static data
// Color palette used when a research/division has no explicit color.
const RESEARCH_COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#E8231A", "#06B6D4"];

// Human-readable labels for the ResearchType enum.
const RESEARCH_TYPE_LABELS: Record<string, string> = {
  ACADEMIC_PAPER: "Academic Paper",
  THESIS: "Thesis",
  DISSERTATION: "Dissertation",
  RESEARCH_PROJECT: "Research Project",
  PUBLICATION: "Publication",
  CONFERENCE_PAPER: "Conference Paper",
  JOURNAL_ARTICLE: "Journal Article",
};

// Normalize a raw research record from the API into the shape this page expects.
// The Prisma relation is `Division` (capital) and the DB has no `color`/`category`
// columns, so those are derived here to keep the UI consistent.
function normalizeResearch(raw: Record<string, unknown>): Research {
  // The API returns the division under either `Division` (Prisma) or `division`.
  const division =
    (raw.division as Research["division"]) ||
    (raw.Division as Research["division"]) ||
    undefined;

  const researchType = (raw.researchType as string) || "RESEARCH_PROJECT";
  const divisionColor = division?.color;
  const color =
    divisionColor ||
    RESEARCH_COLORS[
      String(raw.id || raw.title || "")
        .split("")
        .reduce((acc, c) => acc + c.charCodeAt(0), 0) % RESEARCH_COLORS.length
    ];

  return {
    id: raw.id as string,
    slug: raw.slug as string | undefined,
    title: raw.title as string,
    titleIndonesian: raw.titleIndonesian as string | undefined,
    abstract: raw.abstract as string | undefined,
    abstractIndonesian: raw.abstractIndonesian as string | undefined,
    researchType,
    authors: raw.authors as string | undefined,
    publicationDate: raw.publicationDate as string | undefined,
    venue: raw.venue as string | undefined,
    venueDate: raw.venueDate as string | undefined,
    published: raw.published as string | undefined,
    doi: raw.doi as string | undefined,
    pdfUrl: raw.pdfUrl as string | undefined,
    viewCount: raw.viewCount as number | undefined,
    downloadCount: raw.downloadCount as number | undefined,
    color,
    category: division?.name || RESEARCH_TYPE_LABELS[researchType] || "Research",
    tags: raw.tags as Research["tags"],
    division,
    mainAuthor: (raw.mainAuthor as Research["mainAuthor"]) || undefined,
    createdAt: raw.createdAt as string,
  };
}

const ICON_MAP: Record<string, typeof FlaskConical> = {
  FlaskConical,
  TrendingUp,
  Globe,
  Lightbulb,
  BookOpen,
  Users,
};

const topics = [
  { icon: FlaskConical, label: "Science & Technology", color: "#3B82F6", count: 0 },
  { icon: TrendingUp, label: "Economics & Business", color: "#F59E0B", count: 0 },
  { icon: Globe, label: "Social & Culture", color: "#10B981", count: 0 },
  { icon: Lightbulb, label: "Education & Policy", color: "#8B5CF6", count: 0 },
  { icon: BookOpen, label: "Arts & Humanities", color: "#E8231A", count: 0 },
  { icon: Users, label: "Public Health", color: "#06B6D4", count: 0 },
];

export default function ResearchCornerPage() {
  const [papers, setPapers] = useState<Research[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // CMS-managed header content (falls back to defaults if fetch fails)
  const [headerData, setHeaderData] = useState({
    label: "Activities",
    title: "Research",
    titleAccent: "Corner",
    description: "A space for PPIA Auckland members to share academic research, insights, and intellectual contributions with the community.",
    breadcrumbs: [{ label: "Activities" }, { label: "Research Corner" }],
  });
  const [cmsTopics, setCmsTopics] = useState<typeof topics | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [researchRes, tagsRes] = await Promise.all([
          api.getResearch({ limit: 50 }),
          api.getTags(),
        ]);
        // The API returns { researches: [...] } or a bare array.
        const list = (researchRes.researches && Array.isArray(researchRes.researches)
          ? researchRes.researches
          : Array.isArray(researchRes)
            ? researchRes
            : []) as Record<string, unknown>[];
        setPapers(list.map(normalizeResearch));
        if (tagsRes.tags && Array.isArray(tagsRes.tags)) {
          setTags(tagsRes.tags.filter((t: Tag) => (t._count?.researches || 0) > 0));
        }
      } catch (err) {
        console.error("Failed to fetch research:", err);
        setPapers([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    // Fetch CMS-managed header content
    api.getPageBySlug('activities/research-corner')
      .then((res) => {
        const header = res?.page?.content?.header;
        const c = res?.page?.content as Record<string, any> | undefined;
        if (header) {
          setHeaderData({
            label: header.label ?? "Activities",
            title: header.title ?? "Research",
            titleAccent: header.titleAccent ?? "Corner",
            description: header.description ?? headerData.description,
            breadcrumbs: header.breadcrumbs ?? [{ label: "Activities" }, { label: "Research Corner" }],
          });
        }
        if (c && Array.isArray(c.topics)) {
          setCmsTopics(
            c.topics.map((t: any) => ({
              icon: ICON_MAP[t.icon] ?? FlaskConical,
              label: t.label ?? '',
              color: t.color ?? '#3B82F6',
              count: 0,
            }))
          );
        }
      })
      .catch(() => { /* keep defaults */ });
  }, []);

  const filteredPapers = papers.filter((paper) => {
    const matchesSearch = !searchQuery ||
      paper.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      paper.abstract?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      paper.mainAuthor?.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = !selectedTag || paper.tags?.some(t => t.id === selectedTag);
    return matchesSearch && matchesTag;
  });

  const totalViews = papers.reduce((sum, p) => sum + (p.viewCount || 0), 0);
  const totalDownloads = papers.reduce((sum, p) => sum + (p.downloadCount || 0), 0);
  const activeTopics = cmsTopics ?? topics;

  return (
    <>
      <PageHeader
        label={headerData.label}
        title={headerData.title}
        titleAccent={headerData.titleAccent}
        description={headerData.description}
        breadcrumbs={headerData.breadcrumbs}
      />

      {/* Stats */}
      <section className="py-16 bg-[#0D1B33] relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, #3B82F6, transparent 50%),
              radial-gradient(circle at 80% 50%, #8B5CF6, transparent 50%)`,
          }}
        />
        <div className="relative z-10 max-w-7xl mx-auto px-6">
          {loading ? (
            <ResearchStatsSkeleton />
          ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { value: String(papers.length), label: "Published Papers" },
              { value: String(tags.length || topics.length), label: "Research Areas" },
              { value: String(totalViews), label: "Total Views" },
              { value: String(totalDownloads), label: "Downloads" },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="text-center"
              >
                <p
                  className="font-black text-white text-4xl md:text-5xl"
                  style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
                >
                  {s.value}
                </p>
                <p className="text-[#64748B] text-sm mt-1">{s.label}</p>
              </motion.div>
            ))}
          </div>
          )}
        </div>
      </section>

      {/* Search and Filter */}
      {!loading && papers.length > 0 && (
        <section className="py-8 bg-[#F8FAFC] border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search research by title, author, or keywords..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#3B82F6] outline-none"
                />
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedTag(null)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      !selectedTag ? 'bg-[#3B82F6] text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }`}
                  >
                    All
                  </button>
                  {tags.slice(0, 6).map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => setSelectedTag(selectedTag === tag.id ? null : tag.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${
                        selectedTag === tag.id ? 'bg-[#3B82F6] text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${selectedTag === tag.id ? 'bg-white' : ''}`} style={{ backgroundColor: tag.color }} />
                      {tag.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Featured papers */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6 }}
            className="mb-12"
          >
            <span className="text-[#E8231A] font-semibold text-sm tracking-widest uppercase">Featured</span>
            <h2
              className="font-black text-[#1A2B4A] text-4xl md:text-5xl mt-3"
              style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
            >
              Latest <span className="gradient-text">Publications</span>
            </h2>
          </motion.div>

          <div className="space-y-6">
            {loading ? (
              <ResearchPapersSkeleton />
            ) : filteredPapers.length === 0 ? (
              <div className="text-center py-16">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-[#1A2B4A] mb-2">
                  {papers.length === 0 ? "No Research Published Yet" : "No Research Found"}
                </h3>
                <p className="text-[#64748B]">
                  {papers.length === 0
                    ? "Research from PPIA Auckland members will appear here once published."
                    : "Try adjusting your search or filter criteria."}
                </p>
              </div>
            ) : (
            filteredPapers.map((paper, i) => (
              <Link key={paper.id} href={researchHref(paper)}>
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.1 }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="group rounded-3xl border-2 border-[#E2E8F0] hover:border-[#3B82F6]/30 hover:shadow-2xl transition-all duration-300 overflow-hidden cursor-pointer"
                >
                  <div className="h-1.5" style={{ background: paper.color }} />
                  <div className="p-8 md:p-10">
                    <div className="flex flex-col md:flex-row md:items-start gap-6">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3 mb-4">
                          <span
                            className="px-3 py-1 rounded-full text-xs font-semibold"
                            style={{ background: `${paper.color}15`, color: paper.color }}
                          >
                            {paper.division?.name || paper.category}
                          </span>
                          <span className="text-[#94A3B8] text-xs">
                            {paper.venue} {paper.venueDate && `· ${paper.venueDate}`}
                          </span>
                        </div>

                        <h3
                          className="font-black text-[#1A2B4A] text-xl md:text-2xl leading-tight mb-1 group-hover:text-[#3B82F6] transition-colors"
                          style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
                        >
                          {paper.title}
                        </h3>
                        {paper.titleIndonesian && (
                          <p className="text-[#64748B] text-sm mb-4 italic">{paper.titleIndonesian}</p>
                        )}

                        <div className="flex items-center gap-3 mb-5">
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                            style={{ background: paper.color }}
                          >
                            {(paper.authors || paper.mainAuthor?.name || 'A').charAt(0)}
                          </div>
                          <div>
                            <p className="text-[#1A2B4A] font-semibold text-sm">{paper.authors || paper.mainAuthor?.name || 'Anonymous'}</p>
                            {paper.division && (
                              <p className="text-[#94A3B8] text-xs">{paper.division.name}</p>
                            )}
                          </div>
                        </div>

                        <p
                          className="text-[#64748B] text-sm leading-relaxed mb-5 border-l-4 pl-4 line-clamp-3"
                          style={{ borderColor: paper.color }}
                        >
                          {toPlainText(paper.abstract)}
                        </p>

                        {paper.tags && paper.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-6">
                            {paper.tags.map((tag) => (
                              <span
                                key={tag.id}
                                className="px-3 py-1 rounded-lg text-xs font-medium bg-[#F1F5F9] text-[#64748B]"
                              >
                                {tag.name}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Stats */}
                        <div className="flex items-center gap-4 mb-6 text-xs text-[#64748B]">
                          {paper.viewCount !== undefined && paper.viewCount > 0 && (
                            <span className="flex items-center gap-1">
                              <Eye size={14} /> {paper.viewCount} views
                            </span>
                          )}
                          {paper.downloadCount !== undefined && paper.downloadCount > 0 && (
                            <span className="flex items-center gap-1">
                              <Download size={14} /> {paper.downloadCount} downloads
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          {typeof paper.pdfUrl === 'string' && paper.pdfUrl.length > 0 && (
                            <a
                              href={paper.pdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:gap-3"
                              style={{ background: `${paper.color}15`, color: paper.color }}
                            >
                              <FileText size={14} />
                              Read Full Paper
                              <ExternalLink size={13} />
                            </a>
                          )}
                          {typeof paper.doi === 'string' && paper.doi.length > 0 && (
                            <a
                              href={`https://doi.org/${paper.doi}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all duration-200"
                            >
                              <ExternalLink size={14} />
                              DOI: {paper.doi}
                            </a>
                          )}
                          <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#3B82F6] ml-auto group-hover:gap-2 transition-all">
                            View Details <ArrowRight size={14} />
                          </span>
                        </div>
                      </div>

                      <div
                        className="hidden md:flex w-32 h-32 rounded-2xl items-center justify-center shrink-0 opacity-15 group-hover:opacity-25 transition-opacity"
                        style={{ background: paper.color }}
                      >
                        <FlaskConical size={48} className="text-white" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              </Link>
            )))}
          </div>
        </div>
      </section>

      {/* Research areas */}
      <section className="py-20 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6 }}
            className="mb-12"
          >
            <span className="text-[#E8231A] font-semibold text-sm tracking-widest uppercase">Topics</span>
            <h2
              className="font-black text-[#1A2B4A] text-4xl md:text-5xl mt-3"
              style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
            >
              Research <span className="gradient-text">Areas</span>
            </h2>
            <p className="text-[#64748B] text-lg mt-4 max-w-2xl">
              We welcome research from all disciplines. Submit your work to inspire fellow Indonesian students.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {activeTopics.map((t, i) => (
              <motion.div
                key={t.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{ duration: 0.4, delay: i * 0.07 }}
                className="group relative bg-white rounded-2xl border-2 border-[#E2E8F0] hover:border-transparent hover:shadow-xl p-6 transition-all duration-300 overflow-hidden"
              >
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-[0.04] transition-opacity"
                  style={{ background: t.color }}
                />
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: `${t.color}18` }}
                >
                  <t.icon size={20} style={{ color: t.color }} />
                </div>
                <p
                  className="font-bold text-[#1A2B4A] text-sm mb-1"
                  style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
                >
                  {t.label}
                </p>
                <p className="text-[#94A3B8] text-xs">
                  {t.count > 0 ? `${t.count} paper${t.count > 1 ? "s" : ""}` : "Open for submissions"}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Submit CTA */}
      <section className="py-20 bg-[#0D1B33] relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 30% 50%, #E8231A, transparent 50%),
              radial-gradient(circle at 70% 50%, #3B82F6, transparent 50%)`,
          }}
        />
        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-[#E8231A] font-semibold text-sm tracking-widest uppercase">Contribute</span>
            <h2
              className="font-black text-white text-3xl md:text-4xl mt-4 mb-4"
              style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
            >
              Share Your Research with the Community
            </h2>
            <p className="text-[#94A3B8] leading-relaxed mb-8">
              Published or presented research? We&apos;d love to feature your work — inspiring future Indonesian researchers in Auckland and beyond.
            </p>
            <a
              href="mailto:ppiauckland@gmail.com"
              className="inline-flex items-center gap-2 bg-[#E8231A] hover:bg-[#C41E16] text-white font-semibold px-8 py-4 rounded-xl transition-colors duration-200 shadow-lg shadow-red-900/30"
            >
              Submit Your Research
            </a>
          </motion.div>
        </div>
      </section>
    </>
  );
}
