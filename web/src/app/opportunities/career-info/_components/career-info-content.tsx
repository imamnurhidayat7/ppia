"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import PageHeader from "@/components/PageHeader";
import { Briefcase, ExternalLink, Clock, ChevronRight, BookOpen, Users, Star } from "lucide-react";
import api from "@/lib/api";

 type ResourceTab = "Jobs" | "CV & Interview" | "NZ Work Culture";
 interface CareerContent { header: { label: string; title: string; titleAccent: string; description: string; breadcrumbs: { label: string }[] }; platforms?: any[]; cvTips?: any[]; workCultureTips?: any[]; stats?: { value: string; label: string }[]; }

export default function CareerInfoPage() {
  const [activeTab, setActiveTab] = useState<ResourceTab>("Jobs");
  const [content, setContent] = useState<CareerContent | null>(null);
  useEffect(() => { api.getPageBySlug("opportunities/career-info").then((res) => { const value = res?.page?.content as CareerContent | undefined; if (value?.header) setContent(value); }).catch(() => undefined); }, []);
  if (!content) return null;
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

      {/* Stats */}
      <section className="py-14 bg-[#0D1B33] relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, #3B82F6, transparent 50%),
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
                  className="font-black text-white text-3xl md:text-4xl leading-tight"
                  style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
                >
                  {s.value}
                </p>
                <p className="text-[#64748B] text-xs mt-2 leading-snug">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Tabs */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-2 bg-[#F1F5F9] rounded-xl p-1 w-fit mb-12 overflow-x-auto">
            {(["Jobs", "CV & Interview", "NZ Work Culture"] as ResourceTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="px-5 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200"
                style={activeTab === tab ? { background: "#1A2B4A", color: "white" } : { color: "#64748B" }}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === "Jobs" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
              <div className="mb-8">
                <h2
                  className="font-black text-[#1A2B4A] text-3xl md:text-4xl mb-3"
                  style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
                >
                  Find Jobs in <span className="gradient-text">New Zealand</span>
                </h2>
                <p className="text-[#64748B] max-w-2xl">
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
                    className="group flex flex-col gap-4 bg-white border-2 border-[#E2E8F0] hover:border-transparent hover:shadow-2xl rounded-2xl p-6 transition-all duration-300"
                  >
                    <div className="flex items-start justify-between">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: `${p.color}15` }}
                      >
                        <Briefcase size={20} style={{ color: p.color }} />
                      </div>
                      <ExternalLink size={16} className="text-[#CBD5E1] group-hover:text-[#64748B] transition-colors mt-1" />
                    </div>
                    <div>
                      <h3
                        className="font-bold text-[#1A2B4A] text-base mb-1 group-hover:text-[#E8231A] transition-colors"
                        style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
                      >
                        {p.name}
                      </h3>
                      <p className="text-[#64748B] text-xs leading-relaxed mb-2">{p.desc}</p>
                      <p className="text-[#94A3B8] text-xs font-mono">{p.url}</p>
                    </div>
                  </motion.a>
                ))}
              </div>
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.5 }}
                className="mt-10 rounded-2xl border-2 border-[#E8231A]/20 bg-[#FFF0EF] p-6 flex items-start gap-4"
              >
                <Clock size={20} className="text-[#E8231A] mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-[#1A2B4A] text-sm mb-1">Student Work Rights Reminder</p>
                  <p className="text-[#64748B] text-sm">
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
                  className="font-black text-[#1A2B4A] text-3xl md:text-4xl mb-3"
                  style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
                >
                  CV & Interview <span className="gradient-text">Tips</span>
                </h2>
                <p className="text-[#64748B] max-w-2xl">
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
                    className="flex gap-5 bg-white border-2 border-[#E2E8F0] hover:shadow-xl hover:border-transparent rounded-2xl p-6 transition-all duration-300"
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: `${tip.color}15` }}
                    >
                      <tip.icon size={20} style={{ color: tip.color }} />
                    </div>
                    <div>
                      <h3
                        className="font-bold text-[#1A2B4A] text-base mb-2"
                        style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
                      >
                        {tip.title}
                      </h3>
                      <p className="text-[#64748B] text-sm leading-relaxed">{tip.desc}</p>
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
                  className="font-black text-[#1A2B4A] text-3xl md:text-4xl mb-3"
                  style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
                >
                  Understanding <span className="gradient-text">NZ Work Culture</span>
                </h2>
                <p className="text-[#64748B] max-w-2xl">
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
                    className="rounded-2xl p-6 border-2 hover:shadow-xl transition-all duration-300"
                    style={
                      tip.highlight
                        ? { background: `${tip.color}06`, borderColor: `${tip.color}30` }
                        : { borderColor: "#E2E8F0" }
                    }
                  >
                    {tip.highlight && (
                      <span
                        className="inline-block text-xs font-bold px-2 py-0.5 rounded-full mb-3"
                        style={{ background: `${tip.color}20`, color: tip.color }}
                      >
                        Important
                      </span>
                    )}
                    <h3
                      className="font-bold text-[#1A2B4A] text-base mb-2"
                      style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
                    >
                      {tip.title}
                    </h3>
                    <p className="text-[#64748B] text-sm leading-relaxed">{tip.desc}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
            className="bg-[#1A2B4A] rounded-3xl p-10 md:p-14 flex flex-col md:flex-row items-center justify-between gap-8"
          >
            <div>
              <p className="text-[#E8231A] font-semibold text-sm tracking-widest uppercase mb-3">Connect</p>
              <h3
                className="font-black text-white text-2xl md:text-3xl"
                style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
              >
                Need Career Advice?
              </h3>
              <p className="text-[#94A3B8] mt-2">
                Ask in the PPIA community — many members have navigated the NZ job market and are happy to help.
              </p>
            </div>
            <a
              href="#membership"
              className="shrink-0 flex items-center gap-2 bg-[#E8231A] hover:bg-[#C41E16] text-white font-semibold px-8 py-4 rounded-xl transition-all duration-200 shadow-lg shadow-red-900/30 whitespace-nowrap hover:gap-3"
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
