"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import PageHeader from "@/components/PageHeader";
import WaveTransition from "@/components/sections/WaveTransition";
import { PublicPageSkeleton } from "@/components/skeletons/public-skeletons";
import { ExternalLink, ChevronRight, Star, CheckCircle, Globe, BookOpen, DollarSign } from "lucide-react";
import api from "@/lib/api";

const ICON_MAP = { Star, BookOpen, Globe, DollarSign } as const;
type TipIconName = keyof typeof ICON_MAP;
const resolveTipIcon = (icon: unknown) =>
  typeof icon === "string" ? (ICON_MAP[icon as TipIconName] ?? Star) : (icon as typeof Star) ?? Star;
import { toScholarshipContent, type ScholarshipContent } from "@/lib/scholarship-content";

type ScholarshipFilter = "All" | "Indonesian Gov" | "NZ Gov" | "University";

interface Scholarship {
  id: number;
  name: string;
  provider: string;
  type: ScholarshipFilter;
  color: string;
  level: string[];
  coverage: string[];
  amount: string;
  deadline: string;
  url: string;
  desc: string;
  featured?: boolean;
}

interface ScholarshipHeader {
  label: string;
  title: string;
  titleAccent: string;
  description: string;
  breadcrumbs: { label: string }[];
}
const applicationTips = [
  {
    icon: "Star" as const,
    color: "#E8231A",
    title: "Start early",
    desc: "LPDP and Manaaki applications open months before deadlines. Begin your preparation at least 6 months in advance.",
  },
  {
    icon: "BookOpen" as const,
    color: "#3B82F6",
    title: "Secure your offer first",
    desc: "Most scholarships require a confirmed university offer. Apply for university admission before or alongside your scholarship.",
  },
  {
    icon: "Globe" as const,
    color: "#10B981",
    title: "Check eligibility carefully",
    desc: "Each scholarship has specific GPA, age, and study level requirements. Read the fine print before applying.",
  },
  {
    icon: "DollarSign" as const,
    color: "#F59E0B",
    title: "Combine scholarships",
    desc: "University merit scholarships can sometimes be combined with government funding. Always ask your university's scholarship office.",
  },
];

/** Waterline seam colours — the ends of the sea-deep / sea-shore gradients. */
const DEEP = "#0B1C2E";
const SHORE = "#FFFFFF";
const SHORE_DEEP = "#EDF5FB";

const CARD =
  "chart-paper rounded-[5px] border border-[#DCE7F1] transition-all duration-300 hover:border-[#C3D2E0] hover:shadow-[0_28px_70px_-30px_rgba(7,19,33,0.42)]";

/**
 * Split a deadline into board parts — a large day plate over a month/year
 * caption, the way a departures board is set.
 *
 * Deadlines are CMS text and are frequently prose ("Multiple rounds per year"),
 * so anything that is not a real date falls back to the text unchanged. Uses
 * `Intl…formatToParts` rather than splitting a formatted string, because the
 * separator between day, month and year is locale data and not guaranteed to
 * be a plain space.
 */
const DEADLINE_PARTS: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric" };

function deadlineBoard(deadline: string): { day: string; month: string; year: string } | null {
  const parsed = new Date(deadline);
  if (Number.isNaN(parsed.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-NZ", DEADLINE_PARTS).formatToParts(parsed);
  const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  const day = pick("day");
  const month = pick("month");
  const year = pick("year");
  if (!day || !month || !year) return null;
  return { day, month, year };
}

// Countdown hook for deadline
function useCountdown(targetDate: string) {
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const target = new Date(targetDate).getTime();

    const interval = setInterval(() => {
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      setCountdown({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  return countdown;
}

// Countdown Display Component
function DeadlineCountdown({ deadline }: { deadline: string }) {
  const countdown = useCountdown(deadline);

  const isExpired = countdown.days === 0 && countdown.hours === 0 && countdown.minutes === 0 && countdown.seconds === 0;
  const isUrgent = countdown.days < 30;

  if (isExpired) {
    return <span className="text-gray-400">Check website</span>;
  }

  return (
    <div className="flex gap-2 text-xs">
      {countdown.days > 0 && (
        <span className={`font-bold ${isUrgent ? 'text-red-500' : 'text-gray-700'}`}>
          {countdown.days}d
        </span>
      )}
      <span className={isUrgent ? 'text-red-500' : 'text-gray-600'}>{countdown.hours}h</span>
      <span className={isUrgent ? 'text-red-500' : 'text-gray-600'}>{countdown.minutes}m</span>
      <span className="text-gray-400">{countdown.seconds}s</span>
    </div>
  );
}

export default function ScholarshipPage() {
  const [activeFilter, setActiveFilter] = useState<ScholarshipFilter>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [content, setContent] = useState<{ header: ScholarshipHeader } | null>(null);
  const [cmsScholarships, setCmsScholarships] = useState<ScholarshipContent[] | null>(null);
  const [cmsTips, setCmsTips] = useState<typeof applicationTips | null>(null);
  const [cmsStats, setCmsStats] = useState<{ value: string; label: string }[] | null>(null);

  useEffect(() => {
    api
      .getPageBySlug("opportunities/scholarship")
      .then((res) => {
        const c = res?.page?.content as Record<string, any> | undefined;
        if (c) {
          setContent({ header: c.header });
          setCmsScholarships(toScholarshipContent(c));
          if (Array.isArray(c.applicationTips)) {
            setCmsTips(c.applicationTips);
          }
          if (Array.isArray(c.stats)) {
            setCmsStats(c.stats);
          }
        }
      })
      .catch(() => {
        // Fall back to defaults
      });
  }, []);

  if (!content) return <PublicPageSkeleton />;

  const activeScholarships = cmsScholarships ?? [];
  const activeTips = cmsTips ?? applicationTips;
  // Summary numbers are CMS-managed; the literals below are only a fallback for
  // installations whose page content predates the `stats` field.
  const activeStats = cmsStats ?? [
    { value: "6+", label: "Listed scholarships" },
    { value: "3", label: "Scholarship types" },
    { value: "Full", label: "LPDP & Manaaki coverage" },
    { value: "Free", label: "To apply" },
  ];

  const filtered = activeScholarships.filter((s) => {
    const matchesFilter = activeFilter === "All" || s.type === activeFilter;
    const matchesSearch = !searchQuery ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.provider.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const filterColors: Record<ScholarshipFilter, string> = {
    All: "#1A2B4A",
    "Indonesian Gov": "#E8231A",
    "NZ Gov": "#10B981",
    University: "#3B82F6",
  };

  return (
    <>
      <PageHeader
        label={content.header.label}
        title={content.header.title}
        titleAccent={content.header.titleAccent}
        description={content.header.description}
        breadcrumbs={content.header.breadcrumbs}
      />

      {/* Stats — still below the waterline, read as bridge instruments. */}
      <section className="sea-deep relative overflow-hidden py-16">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div
            className="sea-chart-light absolute inset-0 opacity-[0.05]"
            style={{
              maskImage: "radial-gradient(ellipse 78% 68% at 50% 50%, transparent 20%, black 85%)",
              WebkitMaskImage: "radial-gradient(ellipse 78% 68% at 50% 50%, transparent 20%, black 85%)",
            }}
          />
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `radial-gradient(circle at 20% 50%, #E8231A, transparent 50%),
                radial-gradient(circle at 80% 50%, #10B981, transparent 50%)`,
            }}
          />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {activeStats.map((s, i) => (
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
                <span aria-hidden="true" className="rope-rule mx-auto mt-3 block w-8 opacity-70" />
                <p className="data-type mt-2 text-[12px] uppercase ink-muted">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <WaveTransition from={DEEP} to={SHORE} />

      {/* Scholarships listing */}
      <section className="sea-shore relative overflow-hidden py-16">
        <div
          aria-hidden="true"
          className="sea-chart pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            maskImage: "radial-gradient(ellipse 80% 70% at 50% 35%, transparent 25%, black 90%)",
            WebkitMaskImage: "radial-gradient(ellipse 80% 70% at 50% 35%, transparent 25%, black 90%)",
          }}
        />
        <div className="relative z-10 max-w-7xl mx-auto px-6">
          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row gap-4 mb-10">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search scholarships..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-[4px] border border-[#C3D2E0] bg-white/70 px-4 py-3 text-sm text-[#0F1B33] outline-none transition-colors placeholder:text-[#475569] focus:border-[#E8231A]"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {(["All", "Indonesian Gov", "NZ Gov", "University"] as ScholarshipFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className="data-type rounded-[3px] border px-4 py-2.5 text-[12px] font-bold uppercase transition-all duration-200"
                  style={
                    activeFilter === f
                      ? {
                          background: `${filterColors[f]}15`,
                          borderColor: `${filterColors[f]}40`,
                          color: filterColors[f],
                        }
                      : { borderColor: "#C3D2E0", color: "#5A6B80", background: "rgba(255,255,255,0.7)" }
                  }
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Results count */}
          <p className="data-type mb-6 text-[12px] uppercase ink-muted">{filtered.length} scholarship{filtered.length !== 1 ? 's' : ''} found</p>

          <div className="space-y-5">
            {filtered.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{ duration: 0.4, delay: i * 0.07 }}
                className={`group overflow-hidden ${CARD}`}
                style={s.featured ? { borderColor: `${s.color}45` } : undefined}
              >
                <div aria-hidden="true" className="h-[3px]" style={{ background: s.color }} />
                <div className="p-6 md:p-8">
                  <div className="flex flex-col md:flex-row md:items-start gap-6">
                    <div className="flex-1">
                      {/* Squared labels rather than pills: these are filing
                          marks on a chart, not tags in a feed. */}
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        {s.featured && (
                          <span
                            className="data-type flex items-center gap-1 rounded-[3px] px-2 py-0.5 text-[12px] font-bold uppercase"
                            style={{ background: `${s.color}20`, color: s.color }}
                          >
                            <Star size={11} aria-hidden="true" />
                            Recommended
                          </span>
                        )}
                        <span
                          className="data-type rounded-[3px] px-2 py-0.5 text-[12px] font-bold uppercase"
                          style={{ background: `${s.color}12`, color: s.color }}
                        >
                          {s.type}
                        </span>
                        {s.level.map((l) => (
                          <span
                            key={l}
                            className="data-type rounded-[3px] border border-[#DCE7F1] bg-white/70 px-2 py-0.5 text-[12px] font-bold uppercase ink-body"
                          >
                            {l}
                          </span>
                        ))}
                      </div>

                      <h3
                        className="font-black text-[#0F1B33] text-xl mb-1"
                        style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
                      >
                        {s.name}
                      </h3>
                      <p className="data-type mb-3 text-[12px] uppercase ink-muted">{s.provider}</p>
                      <p className="ink-body text-sm leading-relaxed mb-5">{s.desc}</p>

                      {/* Coverage */}
                      <div className="flex flex-wrap gap-x-4 gap-y-2 mb-5">
                        {s.coverage.map((c) => (
                          <span key={c} className="flex items-center gap-1.5 text-xs font-medium ink-body">
                            <CheckCircle size={12} style={{ color: s.color }} aria-hidden="true" />
                            {c}
                          </span>
                        ))}
                      </div>

                      <span aria-hidden="true" className="rope-rule mb-4 block opacity-70" />

                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="data-type text-[12px] uppercase ink-muted">Amount:</span>
                        <span className="data-type text-[12px] font-bold uppercase text-[#0F1B33]">{s.amount}</span>
                      </div>
                    </div>

                    {/* Deadline board + the way out. */}
                    <div className="flex shrink-0 flex-col gap-3 md:w-44">
                      <div className="rounded-[4px] border border-[#C3D2E0] bg-white/70 px-4 py-3 text-center">
                        <p className="data-type text-[12px] uppercase ink-muted">Deadline:</p>
                        {(() => {
                          const board = deadlineBoard(s.deadline);
                          if (!board) {
                            return (
                              <p className="data-type mt-2 text-[12px] font-bold uppercase leading-snug text-[#0F1B33]">
                                {s.deadline}
                              </p>
                            );
                          }
                          return (
                            <>
                              <p
                                className="data-type mt-1 text-4xl font-black leading-none"
                                style={{ color: s.color }}
                              >
                                {board.day}
                              </p>
                              <p className="data-type mt-1.5 text-[12px] font-bold uppercase ink-body">
                                {board.month} {board.year}
                              </p>
                            </>
                          );
                        })()}
                      </div>

                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 rounded-[4px] px-5 py-2.5 text-sm font-semibold transition-all duration-200 hover:gap-3"
                        style={{ background: `${s.color}15`, color: s.color }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        Apply / Learn More
                        <ExternalLink size={13} aria-hidden="true" />
                      </a>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Application tips */}
      <section className="sea-shore relative overflow-hidden py-20">
        <div
          aria-hidden="true"
          className="sea-chart pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            maskImage: "radial-gradient(ellipse 75% 65% at 50% 50%, transparent 20%, black 85%)",
            WebkitMaskImage: "radial-gradient(ellipse 75% 65% at 50% 50%, transparent 20%, black 85%)",
          }}
        />
        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6 }}
            className="mb-12"
          >
            <span className="data-type text-[12px] font-bold uppercase accent-label">Advice</span>
            <h2
              className="font-black text-[#0F1B33] text-4xl md:text-5xl mt-3"
              style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
            >
              Application <span className="gradient-text">Tips</span>
            </h2>
            <span aria-hidden="true" className="rope-rule mt-5 block w-24 opacity-70" />
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {activeTips.map((tip, i) => {
              const TipIcon = resolveTipIcon(tip.icon);
              return (
              <motion.div
                key={tip.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className={`p-6 ${CARD}`}
              >
                <span
                  className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-white"
                  style={{ boxShadow: `inset 0 0 0 1px ${tip.color}33, 0 0 0 4px ${tip.color}0F` }}
                >
                  <TipIcon size={20} style={{ color: tip.color }} />
                </span>
                <p className="data-type mb-2 text-[12px] uppercase ink-muted">{String(i + 1).padStart(2, "0")}</p>
                <h3
                  className="font-bold text-[#0F1B33] text-sm mb-2"
                  style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
                >
                  {tip.title}
                </h3>
                <p className="ink-body text-xs leading-relaxed">{tip.desc}</p>
              </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <WaveTransition from={SHORE_DEEP} to={DEEP} />

      {/* CTA — back below the waterline to close the page. */}
      <section className="sea-deep relative overflow-hidden py-16">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div
            className="sea-chart-light absolute inset-0 opacity-[0.05]"
            style={{
              maskImage: "radial-gradient(ellipse 75% 70% at 40% 50%, transparent 20%, black 85%)",
              WebkitMaskImage: "radial-gradient(ellipse 75% 70% at 40% 50%, transparent 20%, black 85%)",
            }}
          />
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `radial-gradient(circle at 30% 50%, #E8231A, transparent 50%)`,
            }}
          />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col md:flex-row items-center justify-between gap-8"
          >
            <div>
              <p className="data-type mb-3 text-[12px] font-bold uppercase accent-label">Community</p>
              <h3
                className="font-black text-white text-2xl md:text-3xl"
                style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
              >
                Connect with LPDP & Manaaki Awardees
              </h3>
              <p className="text-white/75 mt-2">
                PPIA connects you with scholarship recipients who can guide your application journey.
              </p>
            </div>
            <a
              href="#membership"
              className="shrink-0 flex items-center gap-2 bg-[#E8231A] hover:bg-[#C41E16] text-white font-semibold px-8 py-4 rounded-[4px] transition-all duration-200 shadow-lg shadow-red-900/30 whitespace-nowrap hover:gap-3"
            >
              Join PPIA Auckland
              <ChevronRight size={16} />
            </a>
          </motion.div>
        </div>
      </section>
    </>
  );
}
