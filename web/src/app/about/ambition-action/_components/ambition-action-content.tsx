"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import PageHeader from "@/components/PageHeader";
import { PublicPageSkeleton } from "@/components/skeletons/public-skeletons";
import WaveTransition from "@/components/sections/WaveTransition";
import { Target, Heart, Lightbulb, Users } from "lucide-react";
import api from "@/lib/api";

/** Seam colours, matching the ends of the .sea-deep / .sea-shore gradients. */
const DEEP = "#0B1C2E";
const SHORE = "#FFFFFF";
const SHORE_DEEP = "#EDF5FB";

// Map string icon names (stored in CMS) to lucide-react components.
const ICON_MAP: Record<string, typeof Target> = {
  Lightbulb,
  Target,
  Heart,
  Users,
};

interface AmbitionContent {
  header: { label: string; title: string; titleAccent: string; description: string; breadcrumbs: { label: string }[] };
  sectionLabel: string; sectionTitle: string; sectionTitleAccent: string; sectionIntro: string;
  pillars: { icon: string; title: string; color: string; desc: string }[];
  ambitionLabel: string; ambitionQuote: string; ambitionQuoteAccent: string;
  ctaTitle: string; ctaDescription: string; ctaButtonText: string; ctaButtonUrl: string;
}

export default function AmbitionActionPage() {
  const [data, setData] = useState<AmbitionContent | null>(null);
  useEffect(() => {
    api.getPageBySlug("about/ambition-action").then((res) => {
      const value = res?.page?.content as AmbitionContent | undefined;
      if (value?.header && Array.isArray(value.pillars)) setData(value);
    }).catch(() => undefined);
  }, []);
  if (!data) return <PublicPageSkeleton />;

  const pillars = data.pillars.map((p) => ({ ...p, icon: ICON_MAP[p.icon] ?? Lightbulb }));

  const accent = data.ambitionQuoteAccent;
  const quoteText = data.ambitionQuote;
  let quoteMain = quoteText;
  let quoteAccent = '';
  if (accent && quoteText.includes(accent)) {
    const idx = quoteText.lastIndexOf(accent);
    quoteMain = quoteText.slice(0, idx);
    quoteAccent = accent;
  }

  return (
    <>
      <PageHeader
        label={data.header.label}
        title={data.header.title}
        titleAccent={data.header.titleAccent}
        description={data.header.description}
        breadcrumbs={data.header.breadcrumbs}
      />

      <WaveTransition from={DEEP} to={SHORE} mirror />

      {/* Triás Harmonía */}
      <section className="sea-shore relative overflow-hidden py-24">
        {/* Shore-side depth: the navigation-chart grid carried down from the
            masthead, fading out behind the pillars. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div
            className="sea-chart absolute inset-0 opacity-[0.05]"
            style={{
              maskImage: "radial-gradient(ellipse 75% 65% at 50% 45%, transparent 20%, black 85%)",
              WebkitMaskImage: "radial-gradient(ellipse 75% 65% at 50% 45%, transparent 20%, black 85%)",
            }}
          />
          <div
            className="absolute -top-24 left-1/2 h-[420px] w-[820px] -translate-x-1/2 opacity-[0.05]"
            style={{ background: "radial-gradient(ellipse at center, #E8231A 0%, transparent 70%)" }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mb-20"
          >
            <span className="data-type accent-label font-semibold text-[12px] tracking-widest uppercase">{data.sectionLabel}</span>
            <h2
              className="font-black text-[#0F1B33] text-4xl md:text-5xl mt-3 leading-tight"
              style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
            >
              {data.sectionTitle} <span className="gradient-text">{data.sectionTitleAccent}</span>
            </h2>
            <p className="ink-body text-lg mt-5 leading-relaxed">
              {data.sectionIntro}
            </p>
            {/* Rope hairline rather than a solid rule, matching the landing page. */}
            <span aria-hidden="true" className="rope-rule mt-8 block w-40 opacity-70" />
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {pillars.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="chart-paper group relative overflow-hidden rounded-[5px] border border-[#DCE7F1] p-8 transition-all duration-300 hover:-translate-y-1 hover:border-[#C3D2E0] hover:shadow-[0_28px_70px_-30px_rgba(7,19,33,0.42)]"
              >
                {/* Corner fold, so each pillar is a sheet of chart paper. */}
                <span
                  aria-hidden="true"
                  className="absolute right-0 top-0 h-9 w-9"
                  style={{
                    background: `linear-gradient(225deg, #EDF5FB 0 50%, ${p.color}22 50%)`,
                    clipPath: "polygon(100% 0, 0 0, 100% 100%)",
                  }}
                />
                <div className="mb-6 flex items-center gap-3">
                  {/* Porthole rather than a rounded square, matching the
                      waypoint buoys on the homepage. */}
                  <span
                    aria-hidden="true"
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white"
                    style={{ boxShadow: `inset 0 0 0 1px ${p.color}33, 0 0 0 5px ${p.color}14` }}
                  >
                    <p.icon size={24} style={{ color: p.color }} />
                  </span>
                  <span className="data-type text-[12px] font-bold uppercase" style={{ color: p.color }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3
                  className="font-bold text-[#0F1B33] text-2xl mb-3"
                  style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
                >
                  {p.title}
                </h3>
                <p className="ink-body leading-relaxed">{p.desc}</p>
                {/* Underline that runs out as the eye leaves the sheet. */}
                <span
                  aria-hidden="true"
                  className="mt-6 block h-px w-full origin-left scale-x-[0.18] transition-transform duration-500 group-hover:scale-x-100"
                  style={{ background: `linear-gradient(90deg, ${p.color}, transparent)` }}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <WaveTransition from={SHORE_DEEP} to={DEEP} />

      {/* Ambition Statement, below the waterline. */}
      <section className="sea-deep py-24 relative overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div
            className="sea-chart-light absolute inset-0 opacity-[0.05]"
            style={{
              maskImage: "radial-gradient(ellipse 70% 65% at 50% 50%, transparent 25%, black 85%)",
              WebkitMaskImage: "radial-gradient(ellipse 70% 65% at 50% 50%, transparent 25%, black 85%)",
            }}
          />
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `radial-gradient(circle at 20% 50%, #E8231A, transparent 50%),
                radial-gradient(circle at 80% 50%, #1A2B4A, transparent 50%)`,
            }}
          />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7 }}
          >
            <span className="data-type accent-label font-bold text-[12px] tracking-widest uppercase">{data.ambitionLabel}</span>
            <blockquote
              className="font-black text-white text-2xl md:text-4xl mt-6 leading-snug"
              style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
            >
              &ldquo;{quoteMain}{" "}
              {quoteAccent && <span className="gradient-text">{quoteAccent}</span>}&rdquo;
            </blockquote>
            <span aria-hidden="true" className="rope-rule mx-auto mt-10 block w-32 opacity-60" />
          </motion.div>
        </div>
      </section>

      <WaveTransition from={DEEP} to={SHORE} mirror />

      {/* CTA */}
      <section className="sea-shore relative overflow-hidden py-24">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div
            className="sea-chart absolute inset-0 opacity-[0.04]"
            style={{
              maskImage: "radial-gradient(ellipse 70% 60% at 50% 50%, transparent 25%, black 85%)",
              WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 50%, transparent 25%, black 85%)",
            }}
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
            className="sea-deep relative overflow-hidden rounded-[5px] border border-[#0B1C2E] p-12 md:p-16 flex flex-col md:flex-row items-center justify-between gap-8 shadow-[0_34px_80px_-38px_rgba(7,19,33,0.55)]"
          >
            <div
              aria-hidden="true"
              className="sea-chart-light pointer-events-none absolute inset-0 opacity-[0.05]"
              style={{
                maskImage: "radial-gradient(ellipse 70% 70% at 30% 50%, transparent 20%, black 85%)",
                WebkitMaskImage: "radial-gradient(ellipse 70% 70% at 30% 50%, transparent 20%, black 85%)",
              }}
            />
            <div className="relative flex items-center gap-5">
              <span
                aria-hidden="true"
                className="w-16 h-16 rounded-full bg-[#E8231A] flex items-center justify-center shrink-0"
                style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.28), 0 0 0 6px rgba(232,35,26,0.16)" }}
              >
                <Users size={26} className="text-white" />
              </span>
              <div>
                <h3
                  className="font-black text-white text-2xl md:text-3xl"
                  style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
                >
                  {data.ctaTitle}
                </h3>
                <p className="text-[#94A3B8] mt-1">{data.ctaDescription}</p>
              </div>
            </div>
            <a
              href={data.ctaButtonUrl}
              className="relative shrink-0 bg-[#E8231A] hover:bg-[#C41E16] text-white font-semibold px-8 py-4 rounded-full transition-colors duration-200 shadow-[0_14px_40px_-14px_rgba(232,35,26,0.8)] whitespace-nowrap"
            >
              {data.ctaButtonText}
            </a>
          </motion.div>
        </div>
      </section>
    </>
  );
}
