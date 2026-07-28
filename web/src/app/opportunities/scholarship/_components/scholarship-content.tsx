"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import PageHeader from "@/components/PageHeader";
import { ExternalLink, ChevronRight, Star, CheckCircle, Globe, BookOpen, DollarSign } from "lucide-react";
import api from "@/lib/api";
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
    icon: Star,
    color: "#E8231A",
    title: "Start early",
    desc: "LPDP and Manaaki applications open months before deadlines. Begin your preparation at least 6 months in advance.",
  },
  {
    icon: BookOpen,
    color: "#3B82F6",
    title: "Secure your offer first",
    desc: "Most scholarships require a confirmed university offer. Apply for university admission before or alongside your scholarship.",
  },
  {
    icon: Globe,
    color: "#10B981",
    title: "Check eligibility carefully",
    desc: "Each scholarship has specific GPA, age, and study level requirements. Read the fine print before applying.",
  },
  {
    icon: DollarSign,
    color: "#F59E0B",
    title: "Combine scholarships",
    desc: "University merit scholarships can sometimes be combined with government funding. Always ask your university's scholarship office.",
  },
];

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

  if (!content) return null;

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

      {/* Stats */}
      <section className="py-16 bg-[#0D1B33] relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, #E8231A, transparent 50%),
              radial-gradient(circle at 80% 50%, #10B981, transparent 50%)`,
          }}
        />
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
                <p className="text-[#64748B] text-sm mt-1">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Scholarships listing */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row gap-4 mb-10">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search scholarships..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-5 py-3 rounded-xl border-2 border-gray-200 focus:border-[#E8231A] focus:ring-2 focus:ring-[#E8231A]/10 outline-none transition-all"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {(["All", "Indonesian Gov", "NZ Gov", "University"] as ScholarshipFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium border-2 transition-all duration-200"
                  style={
                    activeFilter === f
                      ? {
                          background: `${filterColors[f]}15`,
                          borderColor: `${filterColors[f]}40`,
                          color: filterColors[f],
                        }
                      : { borderColor: "#E2E8F0", color: "#64748B", background: "transparent" }
                  }
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Results count */}
          <p className="text-sm text-gray-500 mb-6">{filtered.length} scholarship{filtered.length !== 1 ? 's' : ''} found</p>

          <div className="space-y-5">
            {filtered.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{ duration: 0.4, delay: i * 0.07 }}
                className={`group rounded-2xl border-2 transition-all duration-300 overflow-hidden ${
                  s.featured
                    ? "hover:shadow-2xl hover:border-transparent"
                    : "hover:shadow-xl hover:border-transparent"
                }`}
                style={{ borderColor: s.featured ? `${s.color}25` : "#E2E8F0" }}
              >
                <div className="h-1.5" style={{ background: s.color }} />
                <div className="p-6 md:p-8">
                  <div className="flex flex-col md:flex-row md:items-start gap-6">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3 mb-3">
                        {s.featured && (
                          <span
                            className="flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full"
                            style={{ background: `${s.color}20`, color: s.color }}
                          >
                            <Star size={11} />
                            Recommended
                          </span>
                        )}
                        <span
                          className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                          style={{ background: `${s.color}12`, color: s.color }}
                        >
                          {s.type}
                        </span>
                        {s.level.map((l) => (
                          <span
                            key={l}
                            className="text-xs px-2.5 py-0.5 rounded-full bg-[#F1F5F9] text-[#64748B] font-medium"
                          >
                            {l}
                          </span>
                        ))}
                      </div>

                      <h3
                        className="font-black text-[#1A2B4A] text-xl mb-1"
                        style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
                      >
                        {s.name}
                      </h3>
                      <p className="text-[#94A3B8] text-xs mb-3">{s.provider}</p>
                      <p className="text-[#64748B] text-sm leading-relaxed mb-5">{s.desc}</p>

                      {/* Coverage */}
                      <div className="flex flex-wrap gap-2 mb-5">
                        {s.coverage.map((c) => (
                          <span key={c} className="flex items-center gap-1.5 text-xs font-medium text-[#64748B]">
                            <CheckCircle size={12} style={{ color: s.color }} />
                            {c}
                          </span>
                        ))}
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-[#94A3B8]">
                        <span>
                          <span className="font-semibold text-[#1A2B4A]">Amount:</span> {s.amount}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="font-semibold text-[#1A2B4A]">Deadline:</span>
                          {s.deadline === "Multiple rounds per year" || s.deadline === "Check MFAT website annually" || s.deadline === "Annual applications" || s.deadline === "Ongoing" ? (
                            <span className="text-gray-500">{s.deadline}</span>
                          ) : (
                            <span className="text-gray-500">{s.deadline}</span>
                          )}
                        </span>
                      </div>
                    </div>

                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 self-start hover:gap-3"
                      style={{ background: `${s.color}15`, color: s.color }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      Apply / Learn More
                      <ExternalLink size={13} />
                    </a>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Application tips */}
      <section className="py-20 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6 }}
            className="mb-12"
          >
            <span className="text-[#E8231A] font-semibold text-sm tracking-widest uppercase">Advice</span>
            <h2
              className="font-black text-[#1A2B4A] text-4xl md:text-5xl mt-3"
              style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
            >
              Application <span className="gradient-text">Tips</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {activeTips.map((tip, i) => (
              <motion.div
                key={tip.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="bg-white rounded-2xl border-2 border-[#E2E8F0] hover:shadow-xl hover:border-transparent p-6 transition-all duration-300"
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: `${tip.color}15` }}
                >
                  <tip.icon size={20} style={{ color: tip.color }} />
                </div>
                <h3
                  className="font-bold text-[#1A2B4A] text-sm mb-2"
                  style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
                >
                  {tip.title}
                </h3>
                <p className="text-[#64748B] text-xs leading-relaxed">{tip.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-[#0D1B33] relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 30% 50%, #E8231A, transparent 50%)`,
          }}
        />
        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col md:flex-row items-center justify-between gap-8"
          >
            <div>
              <p className="text-[#E8231A] font-semibold text-sm tracking-widest uppercase mb-3">Community</p>
              <h3
                className="font-black text-white text-2xl md:text-3xl"
                style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
              >
                Connect with LPDP & Manaaki Awardees
              </h3>
              <p className="text-[#94A3B8] mt-2">
                PPIA connects you with scholarship recipients who can guide your application journey.
              </p>
            </div>
            <a
              href="#membership"
              className="shrink-0 flex items-center gap-2 bg-[#E8231A] hover:bg-[#C41E16] text-white font-semibold px-8 py-4 rounded-xl transition-all duration-200 shadow-lg shadow-red-900/30 whitespace-nowrap hover:gap-3"
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
