"use client";
import { toPlainText } from "@/lib/sanitize-html";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import WaveTransition from "@/components/sections/WaveTransition";
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

/**
 * Seam colours for the waterline transitions — they match the ends of the
 * `.sea-deep` / `.sea-shore` gradients in globals.css.
 */
const DEEP_SEA = "#0B1C2E";
const SHORE = "#FFFFFF";
const SHORE_DEEP = "#EDF5FB";

/** Dates in this page are printed as chart data, not prose. */
function formatChartDate(value?: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-NZ", { day: "2-digit", month: "short", year: "numeric" });
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
  const router = useRouter();
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
      <section className="sea-deep relative overflow-hidden py-16">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div
            className="sea-chart-light absolute inset-0 opacity-[0.05]"
            style={{
              maskImage: "radial-gradient(ellipse 80% 70% at 50% 50%, transparent 20%, black 85%)",
              WebkitMaskImage: "radial-gradient(ellipse 80% 70% at 50% 50%, transparent 20%, black 85%)",
            }}
          />
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `radial-gradient(circle at 20% 50%, #3B82F6, transparent 50%),
                radial-gradient(circle at 80% 50%, #8B5CF6, transparent 50%)`,
            }}
          />
        </div>
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
                  className="data-type font-black text-white text-4xl md:text-5xl"
                  style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
                >
                  {s.value}
                </p>
                <p className="data-type mt-2 text-[12px] uppercase text-white/70">{s.label}</p>
              </motion.div>
            ))}
          </div>
          )}
        </div>
      </section>

      {/* Waterline: below the stats band the page comes ashore. */}
      <WaveTransition from={DEEP_SEA} to={SHORE} />

      {/*
        Search, papers and topics all sit on one continuous shore surface. They
        used to be three separate light slabs, which restarted the gradient twice
        and read as seams that carry no meaning.
      */}
      <div className="sea-shore relative overflow-hidden">
        <div
          aria-hidden="true"
          className="sea-chart pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            maskImage: "radial-gradient(ellipse 85% 60% at 50% 25%, transparent 20%, black 90%)",
            WebkitMaskImage: "radial-gradient(ellipse 85% 60% at 50% 25%, transparent 20%, black 90%)",
          }}
        />

      {/* Search and Filter */}
      {!loading && papers.length > 0 && (
        <section className="relative py-10">
          <div className="max-w-7xl mx-auto px-6">
            {/*
              One ruled board instead of a floating search pill plus a row of
              tag pills: the query line on top, the tag axis below it, split by a
              rope hairline.
            */}
            <div className="chart-paper rounded-[5px] border border-[#DCE7F1]">
              <div className="flex items-center gap-3 px-5 py-4">
                <p className="data-type hidden w-24 shrink-0 text-[12px] font-bold uppercase ink-muted sm:block">
                  Search
                </p>
                <div className="relative w-full">
                  <Search
                    className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ink-muted"
                    aria-hidden="true"
                  />
                  <input
                    type="text"
                    placeholder="Search research by title, author, or keywords..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-[3px] border border-[#DCE7F1] bg-white/70 py-2.5 pl-10 pr-4 text-sm text-[#0F1B33] outline-none transition-colors placeholder:text-[#475569] focus:border-[#9FB3C6]"
                  />
                </div>
              </div>

              {tags.length > 0 && (
                <>
                  <div aria-hidden="true" className="rope-rule mx-5" />
                  <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                    <p className="data-type w-24 shrink-0 text-[12px] font-bold uppercase ink-muted">
                      Topic
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => setSelectedTag(null)}
                        aria-pressed={!selectedTag}
                        className={`data-type rounded-[3px] border px-3 py-1.5 text-[12px] font-bold uppercase transition-colors ${
                          !selectedTag
                            ? 'border-[#0F2438] bg-[#0F2438] text-white'
                            : 'border-[#DCE7F1] text-[#5B6B7C] hover:border-[#9FB3C6] hover:text-[#0F1B33]'
                        }`}
                      >
                        All
                      </button>
                      {tags.slice(0, 6).map((tag) => (
                        <button
                          key={tag.id}
                          onClick={() => setSelectedTag(selectedTag === tag.id ? null : tag.id)}
                          aria-pressed={selectedTag === tag.id}
                          className={`data-type flex items-center gap-1.5 rounded-[3px] border px-3 py-1.5 text-[12px] font-bold uppercase transition-colors ${
                            selectedTag === tag.id
                              ? 'border-[#0F2438] bg-[#0F2438] text-white'
                              : 'border-[#DCE7F1] text-[#5B6B7C] hover:border-[#9FB3C6] hover:text-[#0F1B33]'
                          }`}
                        >
                          <span
                            aria-hidden="true"
                            className={`h-1.5 w-1.5 ${selectedTag === tag.id ? 'bg-white' : ''}`}
                            style={{ backgroundColor: tag.color }}
                          />
                          {tag.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Featured papers */}
      <section className="relative py-20">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6 }}
            className="mb-12"
          >
            <span className="inline-flex items-center gap-2.5 accent-label">
              <span aria-hidden="true" className="h-px w-7 bg-[#E8231A]/50" />
              <span className="data-type text-[12px] font-bold uppercase">Featured</span>
            </span>
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
              <div className="chart-paper rounded-[5px] border border-[#DCE7F1] py-16 text-center">
                <FileText className="mx-auto mb-4 h-14 w-14 text-[#C3D2E0]" aria-hidden="true" />
                <h3 className="text-xl font-semibold text-[#0F1B33] mb-2">
                  {papers.length === 0 ? "No Research Published Yet" : "No Research Found"}
                </h3>
                <p className="data-type text-[12px] uppercase ink-muted">
                  {papers.length === 0
                    ? "Research from PPIA Auckland members will appear here once published."
                    : "Try adjusting your search or filter criteria."}
                </p>
              </div>
            ) : (
            filteredPapers.map((paper, i) => (
              <div
                key={paper.id}
                role="link"
                tabIndex={0}
                onClick={() => router.push(researchHref(paper))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    router.push(researchHref(paper));
                  }
                }}
                className="cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E8231A]/40 rounded-[8px]"
              >
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.1 }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="chart-paper group cursor-pointer overflow-hidden rounded-[5px] border border-[#DCE7F1] transition-all duration-300 hover:-translate-y-1 hover:border-[#C3D2E0] hover:shadow-[0_28px_70px_-30px_rgba(7,19,33,0.42)]"
                >
                  <div aria-hidden="true" className="h-1.5" style={{ background: paper.color }} />
                  <div className="p-8 md:p-10">
                    <div className="flex flex-col md:flex-row md:items-start gap-6">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3 mb-4">
                          <span
                            className="data-type rounded-[3px] px-2.5 py-1 text-[12px] font-bold uppercase"
                            style={{ background: `${paper.color}18`, color: paper.color }}
                          >
                            {paper.division?.name || paper.category}
                          </span>
                          <span className="data-type text-[12px] uppercase ink-muted">
                            {paper.venue}{" "}
                            {paper.venueDate && `· ${formatChartDate(paper.venueDate) ?? paper.venueDate}`}
                          </span>
                        </div>

                        <h3
                          className="font-black text-[#0F1B33] text-xl md:text-2xl leading-tight mb-1 group-hover:text-[#3B82F6] transition-colors"
                          style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
                        >
                          {paper.title}
                        </h3>
                        {paper.titleIndonesian && (
                          <p className="ink-body text-sm mb-4 italic">{paper.titleIndonesian}</p>
                        )}

                        <div className="flex items-center gap-3 mb-5">
                          <div
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[3px] text-sm font-bold text-white"
                            style={{ background: paper.color }}
                            aria-hidden="true"
                          >
                            {(paper.authors || paper.mainAuthor?.name || 'A').charAt(0)}
                          </div>
                          <div>
                            <p className="text-[#0F1B33] font-semibold text-sm">{paper.authors || paper.mainAuthor?.name || 'Anonymous'}</p>
                            {paper.division && (
                              <p className="data-type text-[12px] uppercase ink-muted">{paper.division.name}</p>
                            )}
                          </div>
                        </div>

                        <p
                          className="ink-body text-sm leading-relaxed mb-5 border-l-4 pl-4 line-clamp-3"
                          style={{ borderColor: paper.color }}
                        >
                          {toPlainText(paper.abstract)}
                        </p>

                        {paper.tags && paper.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-6">
                            {paper.tags.map((tag) => (
                              <span
                                key={tag.id}
                                className="data-type rounded-[3px] border border-[#DCE7F1] px-2.5 py-1 text-[12px] font-bold uppercase text-[#5B6B7C]"
                              >
                                {tag.name}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Stats — counts read as log data. */}
                        <div className="data-type mb-6 flex items-center gap-4 text-[12px] uppercase ink-muted">
                          {paper.viewCount !== undefined && paper.viewCount > 0 && (
                            <span className="flex items-center gap-1.5">
                              <Eye size={11} aria-hidden="true" /> {paper.viewCount} views
                            </span>
                          )}
                          {paper.downloadCount !== undefined && paper.downloadCount > 0 && (
                            <span className="flex items-center gap-1.5">
                              <Download size={11} aria-hidden="true" /> {paper.downloadCount} downloads
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
                              className="inline-flex items-center gap-2 rounded-[3px] px-5 py-2.5 text-sm font-semibold transition-all duration-200 hover:gap-3"
                              style={{ background: `${paper.color}18`, color: paper.color }}
                            >
                              <FileText size={14} aria-hidden="true" />
                              Read Full Paper
                              <ExternalLink size={13} aria-hidden="true" />
                            </a>
                          )}
                          {typeof paper.doi === 'string' && paper.doi.length > 0 && (
                            <a
                              href={`https://doi.org/${paper.doi}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="data-type inline-flex items-center gap-2 rounded-[3px] border border-[#DCE7F1] px-4 py-2.5 text-[12px] font-bold uppercase text-[#5B6B7C] transition-colors duration-200 hover:border-[#9FB3C6] hover:text-[#0F1B33]"
                            >
                              <ExternalLink size={12} aria-hidden="true" />
                              DOI: {paper.doi}
                            </a>
                          )}
                          <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#3B82F6] ml-auto group-hover:gap-2 transition-all">
                            View Details <ArrowRight size={14} />
                          </span>
                        </div>
                      </div>

                      <div
                        className="hidden h-32 w-32 shrink-0 items-center justify-center rounded-[4px] opacity-15 transition-opacity group-hover:opacity-25 md:flex"
                        style={{ background: paper.color }}
                        aria-hidden="true"
                      >
                        <FlaskConical size={48} className="text-white" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            )))}
          </div>
        </div>
      </section>

      {/* Research areas */}
      <section className="relative py-20">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6 }}
            className="mb-12"
          >
            <span className="inline-flex items-center gap-2.5 accent-label">
              <span aria-hidden="true" className="h-px w-7 bg-[#E8231A]/50" />
              <span className="data-type text-[12px] font-bold uppercase">Topics</span>
            </span>
            <h2
              className="font-black text-[#1A2B4A] text-4xl md:text-5xl mt-3"
              style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
            >
              Research <span className="gradient-text">Areas</span>
            </h2>
            <p className="ink-body text-lg mt-4 max-w-2xl">
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
                className="chart-paper group relative overflow-hidden rounded-[5px] border border-[#DCE7F1] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[#C3D2E0] hover:shadow-[0_28px_70px_-30px_rgba(7,19,33,0.42)]"
              >
                <div
                  aria-hidden="true"
                  className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-[0.04]"
                  style={{ background: t.color }}
                />
                <div
                  className="relative mb-4 flex h-11 w-11 items-center justify-center rounded-[3px]"
                  style={{ background: `${t.color}18` }}
                  aria-hidden="true"
                >
                  <t.icon size={20} style={{ color: t.color }} />
                </div>
                <p
                  className="relative font-bold text-[#0F1B33] text-sm mb-2"
                  style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
                >
                  {t.label}
                </p>
                <p className="data-type relative text-[12px] uppercase ink-muted">
                  {t.count > 0 ? `${t.count} paper${t.count > 1 ? "s" : ""}` : "Open for submissions"}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      </div>

      {/* Waterline back below the surface for the closing call to action. */}
      <WaveTransition from={SHORE_DEEP} to={DEEP_SEA} />

      {/* Submit CTA */}
      <section className="sea-deep relative overflow-hidden py-20">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div
            className="sea-chart-light absolute inset-0 opacity-[0.05]"
            style={{
              maskImage: "radial-gradient(ellipse 70% 65% at 50% 50%, transparent 20%, black 85%)",
              WebkitMaskImage: "radial-gradient(ellipse 70% 65% at 50% 50%, transparent 20%, black 85%)",
            }}
          />
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `radial-gradient(circle at 30% 50%, #E8231A, transparent 50%),
                radial-gradient(circle at 70% 50%, #3B82F6, transparent 50%)`,
            }}
          />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-2.5 accent-label">
              <span aria-hidden="true" className="h-px w-7 bg-[#E8231A]/50" />
              <span className="data-type text-[12px] font-bold uppercase">Contribute</span>
            </span>
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
              className="inline-flex items-center gap-2 rounded-[3px] bg-[#E8231A] px-8 py-4 font-semibold text-white shadow-lg shadow-red-900/30 transition-colors duration-200 hover:bg-[#C41E16]"
            >
              Submit Your Research
            </a>
          </motion.div>
        </div>
      </section>
    </>
  );
}
