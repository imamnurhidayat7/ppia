"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PageHeader from "@/components/PageHeader";
import { PublicPageSkeleton } from "@/components/skeletons/public-skeletons";
import { Download, BookOpen, Calendar, Archive, FileText, Filter, ArrowRight } from "lucide-react";
import api from "@/lib/api";

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

      {/* Documents */}
      {documents.length > 0 && (
        <section className="py-20 bg-[#0D1B33]">
          <div className="max-w-7xl mx-auto px-6">
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
                    className="group flex items-center gap-4 border border-white/10 bg-white/5 hover:bg-white/10 rounded-2xl p-6 transition-all duration-200 cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110" style={{ background: `${doc.color}20` }}>
                      <Icon size={20} style={{ color: doc.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[#64748B] text-xs uppercase tracking-widest mb-1">{doc.label}</p>
                      <p className="text-white font-semibold text-sm leading-snug truncate">{doc.title}</p>
                      <p className="text-[#64748B] text-xs mt-0.5">{doc.sub}</p>
                    </div>
                    <Download size={16} className="text-[#64748B] group-hover:text-white transition-colors shrink-0" />
                  </motion.a>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Timeline */}
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.6 }} className="text-center mb-16">
            <span className="text-[#E8231A] font-semibold text-sm tracking-widest uppercase">{timelineSection.label}</span>
            <h2 className="font-black text-[#1A2B4A] text-4xl md:text-5xl mt-3" style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}>
              {timelineSection.title} <span className="gradient-text">{timelineSection.titleAccent}</span>
            </h2>
            {timelineSection.description && <p className="text-[#64748B] mt-4 max-w-2xl mx-auto">{timelineSection.description}</p>}
          </motion.div>

          <div className="flex flex-wrap items-center justify-center gap-2 mb-12">
            <Filter size={16} className="text-gray-400 mr-2" />
            {years.map((year) => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  selectedYear === year
                    ? "bg-[#E8231A] text-white shadow-lg"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {year}
              </button>
            ))}
          </div>

          {filteredMilestones.length === 0 ? (
            <p className="text-center text-sm text-[#64748B] py-8">No milestones for this year.</p>
          ) : (
            <div className="relative">
              <div className="absolute left-[27px] top-0 bottom-0 w-px bg-[#E2E8F0]" />
              <AnimatePresence mode="wait">
                <motion.div key={selectedYear} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="space-y-10">
                  {filteredMilestones.map((m, i) => (
                    <motion.div
                      key={`${selectedYear}-${m.year}-${i}`}
                      initial={{ opacity: 0, x: -24 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: i * 0.08 }}
                      className="flex gap-6 relative"
                    >
                      <div className="w-14 h-14 rounded-2xl bg-[#E8231A] flex items-center justify-center shrink-0 shadow-lg shadow-red-900/20 z-10">
                        <span className="text-white font-black text-xs leading-tight text-center" style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}>
                          {m.year}
                        </span>
                      </div>
                      <div className="flex-1 pb-2">
                        <h3 className="font-bold text-[#1A2B4A] text-xl mb-2" style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}>
                          {m.title}
                        </h3>
                        <p className="text-[#64748B] leading-relaxed">{m.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              </AnimatePresence>
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      {cta?.title && (
        <section className="py-20 bg-[#F8FAFC] border-t border-[#E2E8F0]">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <h2 className="font-black text-[#1A2B4A] text-3xl md:text-4xl" style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}>
              {cta.title}
            </h2>
            <p className="text-[#64748B] mt-4 max-w-xl mx-auto">{cta.description}</p>
            {cta.buttonHref && cta.buttonText && (
              <a href={cta.buttonHref} className="group inline-flex items-center gap-2 mt-8 bg-[#E8231A] hover:bg-[#C41E16] text-white font-semibold px-6 py-3 rounded-xl transition-colors">
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
