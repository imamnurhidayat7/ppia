"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import PageHeader from "@/components/PageHeader";
import WaveTransition from "@/components/sections/WaveTransition";
import { PublicPageSkeleton } from "@/components/skeletons/public-skeletons";
import { Briefcase, ExternalLink, Clock, ChevronRight, BookOpen, Users, Star } from "lucide-react";
import api from "@/lib/api";

 type ResourceTab = "Jobs" | "CV & Interview" | "NZ Work Culture";
 interface CareerContent { header: { label: string; title: string; titleAccent: string; description: string; breadcrumbs: { label: string }[] }; platforms?: any[]; cvTips?: any[]; workCultureTips?: any[]; stats?: { value: string; label: string }[]; }

/**
 * Seam colours, matching the ends of the `.sea-deep` / `.sea-shore` gradients
 * in globals.css so no hairline of the wrong colour shows at a waterline.
 */
const DEEP = "#0B1C2E";
const SHORE = "#FFFFFF";

/** Chart-paper card material, shared by every card on this route. */
const CARD =
  "chart-paper rounded-[5px] border border-[#DCE7F1] transition-all duration-300 hover:border-[#C3D2E0] hover:shadow-[0_28px_70px_-30px_rgba(7,19,33,0.42)]";

export default function CareerInfoPage() {
  const [activeTab, setActiveTab] = useState<ResourceTab>("Jobs");
  const [content, setContent] = useState<CareerContent | null>(null);
  useEffect(() => { api.getPageBySlug("opportunities/career-info").then((res) => { const value = res?.page?.content as CareerContent | undefined; if (value?.header) setContent(value); }).catch(() => undefined); }, []);
  if (!content) return <PublicPageSkeleton />;
  // Every list is CMS-managed and may be empty on a freshly created page, so
  // default to [] instead of letting `.map` throw on undefined.
  const activePlatforms = content.platforms ?? [];
  const activeCvTips = content.cvTips ?? [];
  const activeWorkCultureTips = content.workCultureTips ?? [];
  const activeStats = content.stats ?? [];

  return (
    <>
      <PageHeader
        label={content.header.label}
        title={content.header.title}
        titleAccent={content.header.titleAccent}
        description={content.header.description}
        breadcrumbs={content.header.breadcrumbs}
      />

      {/* Stats — instrument readings, still below the waterline. */}
      <section className="sea-deep relative overflow-hidden py-14">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div
            className="sea-chart-light absolute inset-0 opacity-[0.05]"
            style={{
              maskImage: "radial-gradient(ellipse 78% 68% at 50% 50%, transparent 20%, black 85%)",
              WebkitMaskImage: "radial-gradient(ellipse 78% 68% at 50% 50%, transparent 20%, black 85%)",
            }}
          />
          <div
            className="absolute -left-24 top-0 h-[320px] w-[320px] rounded-full opacity-[0.14]"
            style={{ background: "radial-gradient(circle, #3B82F6, transparent 70%)" }}
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
                  className="font-black text-white text-3xl md:text-4xl leading-tight"
                  style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
                >
                  {s.value}
                </p>
                <span aria-hidden="true" className="rope-rule mx-auto mt-3 block w-8 opacity-70" />
                <p className="data-type mt-2 text-[12px] uppercase leading-snug ink-muted">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <WaveTransition from={DEEP} to={SHORE} />

      {/* Tabs — above the waterline, on chart paper. */}
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
          {/* A row of filed tabs rather than a pill switcher. */}
          <div className="chart-paper flex gap-1 rounded-[5px] border border-[#DCE7F1] p-1 w-fit mb-12 overflow-x-auto">
            {(["Jobs", "CV & Interview", "NZ Work Culture"] as ResourceTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="data-type rounded-[3px] px-4 py-2.5 text-[12px] font-bold uppercase whitespace-nowrap transition-all duration-200"
                style={activeTab === tab ? { background: "#0B1C2E", color: "white" } : { color: "#5A6B80" }}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === "Jobs" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
              <div className="mb-8">
                <h2
                  className="font-black text-[#0F1B33] text-3xl md:text-4xl mb-3"
                  style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
                >
                  Find Jobs in <span className="gradient-text">New Zealand</span>
                </h2>
                <p className="ink-body max-w-2xl">
                  The best platforms for Indonesian students to find part-time, casual, and graduate roles.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {activePlatforms.map((p, i) => (
                  <motion.a
                    key={p.name}
                    href={`https://${p.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.07 }}
                    className={`group flex flex-col gap-4 p-6 ${CARD}`}
                  >
                    <div className="flex items-start justify-between">
                      <span
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white"
                        style={{ boxShadow: `inset 0 0 0 1px ${p.color}33, 0 0 0 4px ${p.color}0F` }}
                      >
                        <Briefcase size={20} style={{ color: p.color }} />
                      </span>
                      <ExternalLink size={16} className="text-[#C3D2E0] group-hover:text-[#334155] transition-colors mt-1" />
                    </div>
                    <div>
                      <h3
                        className="font-bold text-[#0F1B33] text-base mb-1 group-hover:text-[#C41E16] transition-colors"
                        style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
                      >
                        {p.name}
                      </h3>
                      <p className="ink-body text-xs leading-relaxed mb-2">{p.desc}</p>
                      <p className="data-type text-[12px] uppercase ink-muted">{p.url}</p>
                    </div>
                  </motion.a>
                ))}
              </div>
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.5 }}
                className="chart-paper mt-10 flex items-start gap-4 rounded-[5px] border border-[#E8231A]/25 p-6"
              >
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white"
                  style={{ boxShadow: "inset 0 0 0 1px #E8231A33, 0 0 0 4px #E8231A0F" }}
                >
                  <Clock size={18} className="accent-label" />
                </span>
                <div>
                  <p className="data-type mb-1 text-[12px] font-bold uppercase accent-label">Student Work Rights Reminder</p>
                  <p className="ink-body text-sm">
                    On a student visa you can work up to <strong>20 hours/week</strong> during semester and <strong>full-time</strong> during scheduled holidays. Always confirm your specific visa conditions.
                  </p>
                </div>
              </motion.div>
            </motion.div>
          )}

          {activeTab === "CV & Interview" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
              <div className="mb-8">
                <h2
                  className="font-black text-[#0F1B33] text-3xl md:text-4xl mb-3"
                  style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
                >
                  CV & Interview <span className="gradient-text">Tips</span>
                </h2>
                <p className="ink-body max-w-2xl">
                  Stand out from the crowd with a polished NZ-style CV and confident interview skills.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {activeCvTips.map((tip, i) => (
                  <motion.div
                    key={tip.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.08 }}
                    className={`flex gap-5 p-6 ${CARD}`}
                  >
                    <span
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white"
                      style={{ boxShadow: `inset 0 0 0 1px ${tip.color}33, 0 0 0 4px ${tip.color}0F` }}
                    >
                      <tip.icon size={20} style={{ color: tip.color }} />
                    </span>
                    <div>
                      <p className="data-type mb-2 text-[12px] uppercase ink-muted">{String(i + 1).padStart(2, "0")}</p>
                      <h3
                        className="font-bold text-[#0F1B33] text-base mb-2"
                        style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
                      >
                        {tip.title}
                      </h3>
                      <p className="ink-body text-sm leading-relaxed">{tip.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === "NZ Work Culture" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
              <div className="mb-8">
                <h2
                  className="font-black text-[#0F1B33] text-3xl md:text-4xl mb-3"
                  style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
                >
                  Understanding <span className="gradient-text">NZ Work Culture</span>
                </h2>
                <p className="ink-body max-w-2xl">
                  New Zealand has a unique work culture. Here&apos;s what to expect and how to thrive.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {activeWorkCultureTips.map((tip, i) => (
                  <motion.div
                    key={tip.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.08 }}
                    className={`p-6 ${CARD}`}
                    style={tip.highlight ? { borderColor: `${tip.color}40` } : undefined}
                  >
                    {tip.highlight && (
                      <span
                        className="data-type mb-3 inline-block rounded-[3px] px-2 py-0.5 text-[12px] font-bold uppercase"
                        style={{ background: `${tip.color}1F`, color: tip.color }}
                      >
                        Important
                      </span>
                    )}
                    <h3
                      className="font-bold text-[#0F1B33] text-base mb-2"
                      style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
                    >
                      {tip.title}
                    </h3>
                    <span aria-hidden="true" className="rope-rule mb-3 block w-10 opacity-70" />
                    <p className="ink-body text-sm leading-relaxed">{tip.desc}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* CTA — a panel of open water set into the shore. */}
      <section className="sea-shore relative overflow-hidden py-20">
        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
            className="sea-deep relative overflow-hidden rounded-[5px] border border-white/10 p-10 md:p-14 flex flex-col md:flex-row items-center justify-between gap-8"
          >
            <div
              aria-hidden="true"
              className="sea-chart-light pointer-events-none absolute inset-0 opacity-[0.05]"
              style={{
                maskImage: "radial-gradient(ellipse 70% 70% at 30% 50%, transparent 20%, black 85%)",
                WebkitMaskImage: "radial-gradient(ellipse 70% 70% at 30% 50%, transparent 20%, black 85%)",
              }}
            />
            <div className="relative z-10">
              <p className="data-type mb-3 text-[12px] font-bold uppercase accent-label">Connect</p>
              <h3
                className="font-black text-white text-2xl md:text-3xl"
                style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
              >
                Need Career Advice?
              </h3>
              <p className="text-white/75 mt-2">
                Ask in the PPIA community — many members have navigated the NZ job market and are happy to help.
              </p>
            </div>
            <a
              href="#membership"
              className="relative z-10 shrink-0 flex items-center gap-2 bg-[#E8231A] hover:bg-[#C41E16] text-white font-semibold px-8 py-4 rounded-[4px] transition-all duration-200 shadow-lg shadow-red-900/30 whitespace-nowrap hover:gap-3"
            >
              Join the Community
              <ChevronRight size={16} />
            </a>
          </motion.div>
        </div>
      </section>
    </>
  );
}
