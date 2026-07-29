"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PageHeader from "@/components/PageHeader";
import { PublicPageSkeleton } from "@/components/skeletons/public-skeletons";
import WaveTransition from "@/components/sections/WaveTransition";
import { Download, BookOpen, Calendar, Archive, FileText, Filter, ArrowRight } from "lucide-react";
import api from "@/lib/api";

/** Seam colours, matching the ends of the .sea-deep / .sea-shore gradients. */
const DEEP = "#0B1C2E";
const SHORE = "#FFFFFF";

interface HistoricalDocument {
  icon: "BookOpen" | "Archive" | "Calendar" | "Download" | "FileText";
  label: string;
  title: string;
  sub: string;
  color: string;
  href: string;
  target?: string;
}

interface HistoricalContent {
  header: { label: string; title: string; titleAccent: string; description: string; breadcrumbs: { label: string }[] };
  timelineSection: { label: string; title: string; titleAccent: string; description?: string };
  cta: { title: string; description: string; buttonText?: string; buttonHref?: string };
  documents: HistoricalDocument[];
  milestones: { year: string; title: string; desc: string; color: string }[];
}

const ICON_MAP: Record<string, React.ElementType> = {
  BookOpen, Archive, Calendar, Download, FileText,
};

function resolveIcon(icon: HistoricalDocument["icon"]): React.ElementType {
  return ICON_MAP[icon] ?? BookOpen;
}

const ALL_YEARS = "All";

export default function HistoricalArchivePage() {
  const [selectedYear, setSelectedYear] = useState<string>(ALL_YEARS);
  const [content, setContent] = useState<HistoricalContent | null>(null);

  useEffect(() => {
    api.getPageBySlug("about/historical-archive")
      .then((res) => {
        const value = res?.page?.content as HistoricalContent | undefined;
        if (value?.header && Array.isArray(value.milestones) && Array.isArray(value.documents)) setContent(value);
      })
      .catch(() => undefined);
  }, []);

  const years = useMemo(() => {
    if (!content) return [ALL_YEARS];
    const uniqueYears = Array.from(new Set(content.milestones.map((m) => m.year)));
    return [ALL_YEARS, ...uniqueYears];
  }, [content]);

  if (!content) return <PublicPageSkeleton />;
  const { header, timelineSection, cta, documents, milestones } = content;
  const filteredMilestones = selectedYear === ALL_YEARS
    ? milestones
    : milestones.filter((m) => m.year === selectedYear);

  return (
    <>
      <PageHeader {...header} />

      {/* Documents — the filing drawer, still below the waterline. */}
      {documents.length > 0 && (
        <section className="sea-deep relative overflow-hidden py-20">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <div
              className="sea-chart-light absolute inset-0 opacity-[0.05]"
              style={{
                maskImage: "radial-gradient(ellipse 75% 70% at 50% 45%, transparent 20%, black 85%)",
                WebkitMaskImage: "radial-gradient(ellipse 75% 70% at 50% 45%, transparent 20%, black 85%)",
              }}
            />
          </div>
          <div className="relative max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {documents.map((doc, i) => {
                const Icon = resolveIcon(doc.icon);
                return (
                  <motion.a
                    key={doc.title}
                    href={doc.href}
                    target={doc.target}
                    rel={doc.target === "_blank" ? "noopener noreferrer" : undefined}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.1 }}
                    className="group flex items-center gap-4 border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 rounded-[5px] p-6 transition-all duration-200 cursor-pointer"
                  >
                    {/* Porthole marker rather than a tinted square. */}
                    <span
                      aria-hidden="true"
                      className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105"
                      style={{
                        background: `${doc.color}1F`,
                        boxShadow: `inset 0 0 0 1px ${doc.color}3D, 0 0 0 4px ${doc.color}12`,
                      }}
                    >
                      <Icon size={20} style={{ color: doc.color }} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="data-type ink-muted text-[12px] uppercase mb-1">{doc.label}</p>
                      <p className="text-white font-semibold text-sm leading-snug truncate">{doc.title}</p>
                      <p className="data-type ink-muted text-[12px] uppercase mt-1">{doc.sub}</p>
                    </div>
                    <Download size={16} className="ink-muted group-hover:text-white transition-colors shrink-0" />
                  </motion.a>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <WaveTransition from={DEEP} to={SHORE} mirror />

      {/*
        Timeline — the archive as a rope with dated markers threaded onto it,
        not a grid of identical cards. Each year is a buoy on the line and the
        entry beside it is its own sheet of chart paper, so a long entry can
        grow downwards where a grid row could not.
      */}
      <section className="sea-shore relative overflow-hidden py-24">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div
            className="sea-chart absolute inset-0 opacity-[0.05]"
            style={{
              maskImage: "radial-gradient(ellipse 70% 65% at 50% 45%, transparent 20%, black 85%)",
              WebkitMaskImage: "radial-gradient(ellipse 70% 65% at 50% 45%, transparent 20%, black 85%)",
            }}
          />
        </div>
        <div className="relative max-w-4xl mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.6 }} className="text-center mb-14">
            <span className="data-type accent-label font-bold text-[12px] tracking-widest uppercase">{timelineSection.label}</span>
            <h2 className="font-black text-[#0F1B33] text-4xl md:text-5xl mt-3" style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}>
              {timelineSection.title} <span className="gradient-text">{timelineSection.titleAccent}</span>
            </h2>
            {timelineSection.description && <p className="ink-body mt-4 max-w-2xl mx-auto">{timelineSection.description}</p>}
            <span aria-hidden="true" className="rope-rule mx-auto mt-8 block w-32 opacity-70" />
          </motion.div>

          {/* Year filter, set as chart data rather than as pills. */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-12">
            <Filter size={14} className="ink-muted mr-2" aria-hidden="true" />
            {years.map((year) => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                aria-pressed={selectedYear === year}
                className={`data-type rounded-[3px] px-3.5 py-2 text-[12px] font-bold uppercase transition-all ${
                  selectedYear === year
                    ? "bg-[#E8231A] text-white shadow-[0_10px_26px_-12px_rgba(232,35,26,0.85)]"
                    : "chart-paper border border-[#DCE7F1] ink-body hover:border-[#C3D2E0] hover:text-[#0F1B33]"
                }`}
              >
                {year}
              </button>
            ))}
          </div>

          {filteredMilestones.length === 0 ? (
            <p className="text-center text-sm ink-body py-8">No milestones for this year.</p>
          ) : (
            <div className="relative">
              {/* The rope every marker hangs from. */}
              <span
                aria-hidden="true"
                className="rope-line-v absolute left-[26px] top-4 bottom-8 w-[3px] rounded-full"
              />
              <AnimatePresence mode="wait">
                <motion.div key={selectedYear} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                  {filteredMilestones.map((m, i) => {
                    const color = m.color || "#E8231A";
                    return (
                      <motion.div
                        key={`${selectedYear}-${m.year}-${i}`}
                        initial={{ opacity: 0, x: -24 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: i * 0.08 }}
                        className="relative flex gap-6 pb-10 last:pb-0"
                      >
                        {/* Dated marker: a numbered buoy tied onto the rope. */}
                        <div className="relative z-10 flex w-14 shrink-0 flex-col items-center">
                          <span
                            aria-hidden="true"
                            className="flex h-14 w-14 items-center justify-center rounded-full bg-white"
                            style={{ boxShadow: `0 0 0 2px ${color}, 0 0 0 7px ${color}14` }}
                          >
                            <span className="data-type text-[12px] font-bold" style={{ color }}>
                              {m.year}
                            </span>
                          </span>
                          <span aria-hidden="true" className="data-type mt-2.5 text-[12px] uppercase ink-muted">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                        </div>

                        <div className={`min-w-0 flex-1 ${i % 2 === 1 ? "lg:translate-x-6" : ""}`}>
                          <div className="chart-paper relative overflow-hidden rounded-[5px] border border-[#DCE7F1] p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#C3D2E0] hover:shadow-[0_24px_58px_-28px_rgba(7,19,33,0.4)]">
                            {/* Corner fold, so the entry reads as a filed sheet. */}
                            <span
                              aria-hidden="true"
                              className="absolute right-0 top-0 h-8 w-8"
                              style={{
                                background: `linear-gradient(225deg, #EDF5FB 0 50%, ${color}22 50%)`,
                                clipPath: "polygon(100% 0, 0 0, 100% 100%)",
                              }}
                            />
                            <p className="data-type text-[12px] uppercase ink-muted">{m.year}</p>
                            <h3 className="font-bold text-[#0F1B33] text-xl mt-2 mb-2" style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}>
                              {m.title}
                            </h3>
                            <p className="ink-body leading-relaxed">{m.desc}</p>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </AnimatePresence>
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      {cta?.title && (
        <section className="sea-shore relative overflow-hidden py-20">
          {/* Rope hairline instead of a hard border: the shore surface carries
              on, the seam is just tied off. */}
          <span aria-hidden="true" className="rope-rule absolute inset-x-0 top-0 opacity-70" />
          <div className="relative max-w-3xl mx-auto px-6 text-center">
            <h2 className="font-black text-[#0F1B33] text-3xl md:text-4xl" style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}>
              {cta.title}
            </h2>
            <p className="ink-body mt-4 max-w-xl mx-auto">{cta.description}</p>
            {cta.buttonHref && cta.buttonText && (
              <a href={cta.buttonHref} className="group inline-flex items-center gap-2 mt-8 bg-[#E8231A] hover:bg-[#C41E16] text-white font-semibold px-6 py-3 rounded-full shadow-[0_14px_40px_-14px_rgba(232,35,26,0.8)] transition-colors">
                {cta.buttonText}
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </a>
            )}
          </div>
        </section>
      )}
    </>
  );
}
