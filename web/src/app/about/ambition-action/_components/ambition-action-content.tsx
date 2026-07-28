"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import PageHeader from "@/components/PageHeader";
import { Target, Heart, Lightbulb, Users } from "lucide-react";
import api from "@/lib/api";

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
  if (!data) return null;

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

      {/* Triás Harmonía */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mb-20"
          >
            <span className="text-[#E8231A] font-semibold text-sm tracking-widest uppercase">{data.sectionLabel}</span>
            <h2
              className="font-black text-[#1A2B4A] text-4xl md:text-5xl mt-3 leading-tight"
              style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
            >
              {data.sectionTitle} <span className="gradient-text">{data.sectionTitleAccent}</span>
            </h2>
            <p className="text-[#64748B] text-lg mt-5 leading-relaxed">
              {data.sectionIntro}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {pillars.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="group relative p-8 rounded-2xl border-2 border-[#F1F5F9] hover:border-transparent hover:shadow-2xl transition-all duration-300 overflow-hidden"
              >
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-[0.04] transition-opacity rounded-2xl"
                  style={{ background: p.color }}
                />
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
                  style={{ background: `${p.color}18` }}
                >
                  <p.icon size={26} style={{ color: p.color }} />
                </div>
                <h3
                  className="font-bold text-[#1A2B4A] text-2xl mb-3"
                  style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
                >
                  {p.title}
                </h3>
                <p className="text-[#64748B] leading-relaxed">{p.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Ambition Statement */}
      <section className="py-24 bg-[#0D1B33] relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, #E8231A, transparent 50%),
              radial-gradient(circle at 80% 50%, #1A2B4A, transparent 50%)`,
          }}
        />
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7 }}
          >
            <span className="text-[#E8231A] font-semibold text-sm tracking-widest uppercase">{data.ambitionLabel}</span>
            <blockquote
              className="font-black text-white text-2xl md:text-4xl mt-6 leading-snug"
              style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
            >
              &ldquo;{quoteMain}{" "}
              {quoteAccent && <span className="gradient-text">{quoteAccent}</span>}&rdquo;
            </blockquote>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
            className="bg-[#1A2B4A] rounded-3xl p-12 md:p-16 flex flex-col md:flex-row items-center justify-between gap-8"
          >
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-[#E8231A] flex items-center justify-center shrink-0 shadow-lg shadow-red-900/40">
                <Users size={28} className="text-white" />
              </div>
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
              className="shrink-0 bg-[#E8231A] hover:bg-[#C41E16] text-white font-semibold px-8 py-4 rounded-xl transition-colors duration-200 shadow-lg shadow-red-900/30 whitespace-nowrap"
            >
              {data.ctaButtonText}
            </a>
          </motion.div>
        </div>
      </section>
    </>
  );
}
