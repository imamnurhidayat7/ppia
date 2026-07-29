"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import PageHeader from "@/components/PageHeader";
import WaveTransition from "@/components/sections/WaveTransition";
import { PublicPageSkeleton } from "@/components/skeletons/public-skeletons";
import { Users, Megaphone, Globe, ChevronRight, CheckCircle, Mail, ArrowRight, Sparkles, GraduationCap, Heart } from "lucide-react";
import api from "@/lib/api";

const ICON_MAP = { Users, Megaphone, Globe, GraduationCap, Heart } as const;

interface PartnershipContent {
  header: { label: string; title: string; titleAccent: string; description: string; breadcrumbs: { label: string }[] };
  benefits: { icon: string; color: string; title: string; desc: string }[];
  tiers: { name: string; color: string; price: string; ideal: string; perks: string[]; featured?: boolean }[];
  currentPartners: { name: string; type: string }[];
  benefitsSection: { label: string; title: string; titleAccent: string; description: string };
  tiersSection: { label: string; title: string; titleAccent: string; description: string };
  cta: {
    title: string;
    description: string;
    submitButton: string;
    form: { typeLabel: string; nameLabel: string; orgLabel: string; emailLabel: string; messageLabel: string };
  };
}

const RED = "#E8231A";

/**
 * Waterline seam colours — the ends of the `.sea-deep` / `.sea-shore`
 * gradients in globals.css, so a seam never shows a hairline of a colour that
 * belongs to neither neighbour.
 */
const DEEP = "#0B1C2E";
const SHORE = "#FFFFFF";

/** Shared chart-paper card material. */
const CARD =
  "chart-paper rounded-[5px] border border-[#DCE7F1] transition-all duration-300 hover:border-[#C3D2E0] hover:shadow-[0_28px_70px_-30px_rgba(7,19,33,0.42)]";

function BenefitCard({ benefit, index }: { benefit: { icon: string; color: string; title: string; desc: string }; index: number }) {
  const Icon = ICON_MAP[benefit.icon as keyof typeof ICON_MAP] ?? Users;
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      whileHover={{ y: -4 }}
      className={`group relative p-7 ${CARD}`}
    >
      <span aria-hidden="true" className="absolute top-0 left-7 right-7 h-[3px]" style={{ background: benefit.color }} />
      <span
        className="mb-5 mt-1 flex h-12 w-12 items-center justify-center rounded-full bg-white"
        style={{ boxShadow: `inset 0 0 0 1px ${benefit.color}33, 0 0 0 4px ${benefit.color}0F` }}
      >
        <Icon size={22} style={{ color: benefit.color }} />
      </span>
      <p className="data-type mb-2 text-[12px] uppercase ink-muted">{String(index + 1).padStart(2, "0")}</p>
      <h3 className="font-bold text-[#0F1B33] text-lg mb-2" style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}>{benefit.title}</h3>
      <span aria-hidden="true" className="rope-rule mb-3 block w-10 opacity-70" />
      <p className="ink-body text-sm leading-relaxed">{benefit.desc}</p>
    </motion.div>
  );
}

function TierCard({ tier, index }: { tier: { name: string; color: string; price: string; ideal: string; perks: string[]; featured?: boolean }; index: number }) {
  const featured = tier.featured;
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      className={`relative rounded-[5px] p-8 transition-all ${featured ? "sea-deep overflow-hidden border border-white/12 text-white shadow-[0_36px_90px_-36px_rgba(7,19,33,0.7)] scale-[1.04] md:scale-105" : CARD}`}
    >
      {featured && (
        <span
          aria-hidden="true"
          className="sea-chart-light pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            maskImage: "radial-gradient(ellipse 75% 70% at 50% 45%, transparent 20%, black 85%)",
            WebkitMaskImage: "radial-gradient(ellipse 75% 70% at 50% 45%, transparent 20%, black 85%)",
          }}
        />
      )}
      {featured && (
        <span className="data-type absolute -top-3 left-1/2 -translate-x-1/2 rounded-[3px] bg-[#E8231A] px-3 py-1 text-[12px] font-bold uppercase text-white">
          Most popular
        </span>
      )}
      <div className="relative z-10 flex items-baseline justify-between mb-1">
        <span className={`data-type text-[12px] font-bold uppercase ${featured ? "text-white/75" : "ink-muted"}`}>
          {String(index + 1).padStart(2, "0")}
        </span>
        {!featured && <span aria-hidden="true" className="w-2.5 h-2.5 rounded-full" style={{ background: tier.color }} />}
      </div>
      <h3 className={`relative z-10 font-bold text-xl ${featured ? "text-white" : "text-[#0F1B33]"}`} style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}>
        {tier.name}
      </h3>
      <p className={`data-type relative z-10 mt-1 text-[12px] uppercase ${featured ? "text-white/75" : "ink-muted"}`}>
        {tier.ideal}
      </p>
      <span aria-hidden="true" className={`relative z-10 mt-4 block h-px w-full ${featured ? "bg-white/12" : "rope-rule opacity-70"}`} />
      <p className={`data-type relative z-10 font-black text-3xl mt-4 ${featured ? "text-white" : "text-[#0F1B33]"}`}>
        {tier.price}
      </p>
      <ul className={`relative z-10 mt-6 space-y-3 text-sm ${featured ? "text-white/85" : "ink-body"}`}>
        {tier.perks.map((perk) => (
          <li key={perk} className="flex items-start gap-2.5">
            <CheckCircle size={16} className="shrink-0 mt-0.5" style={{ color: featured ? "#E8231A" : tier.color }} />
            <span>{perk}</span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

export default function PartnershipPage() {
  const [formState, setFormState] = useState({ name: "", org: "", email: "", type: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [content, setContent] = useState<PartnershipContent | null>(null);

  useEffect(() => {
    api.getPageBySlug("opportunities/partnership").then((res) => {
      const value = res?.page?.content as PartnershipContent | undefined;
      if (value?.header && Array.isArray(value.benefits) && Array.isArray(value.tiers) && value.benefitsSection && value.tiersSection && value.cta) setContent(value);
    }).catch(() => undefined);
  }, []);

  if (!content) return <PublicPageSkeleton />;
  const activeBenefits = content.benefits;
  const activeTiers = content.tiers;
  const activePartners = content.currentPartners;
  // Fields ruled onto the paper rather than floating boxes: a hairline border
  // and a translucent white fill, so the chart grain still reads underneath.
  const inputClass = "w-full rounded-[4px] border border-[#C3D2E0] bg-white/70 px-3 py-2.5 text-sm text-[#0F1B33] placeholder:text-[#475569] transition-colors focus:border-[#E8231A] focus:outline-none";
  const labelClass = "data-type mb-1.5 block text-[12px] uppercase ink-muted";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <>
      <PageHeader {...content.header} />

      <WaveTransition from={DEEP} to={SHORE} />

      {/* Why partner */}
      <section className="sea-shore relative overflow-hidden py-24">
        <div
          aria-hidden="true"
          className="sea-chart pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            maskImage: "radial-gradient(ellipse 80% 70% at 50% 40%, transparent 25%, black 90%)",
            WebkitMaskImage: "radial-gradient(ellipse 80% 70% at 50% 40%, transparent 25%, black 90%)",
          }}
        />
        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.6 }} className="max-w-3xl mb-14">
            <span className="data-type text-[12px] font-bold uppercase accent-label">{content.benefitsSection.label}</span>
            <h2 className="font-black text-[#0F1B33] text-4xl md:text-5xl mt-3 leading-tight" style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}>
              {content.benefitsSection.title}{content.benefitsSection.titleAccent}
            </h2>
            <span aria-hidden="true" className="rope-rule mt-5 block w-24 opacity-70" />
            <p className="ink-body text-base mt-4 leading-relaxed max-w-2xl">{content.benefitsSection.description}</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {activeBenefits.map((b, i) => <BenefitCard key={b.title} benefit={b} index={i} />)}
          </div>
        </div>
      </section>

      {/* Tiers */}
      <section className="sea-shore relative overflow-hidden py-24">
        <div
          aria-hidden="true"
          className="sea-chart pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            maskImage: "radial-gradient(ellipse 75% 65% at 50% 50%, transparent 20%, black 85%)",
            WebkitMaskImage: "radial-gradient(ellipse 75% 65% at 50% 50%, transparent 20%, black 85%)",
          }}
        />
        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.6 }} className="text-center mb-14">
            <span className="data-type text-[12px] font-bold uppercase accent-label">{content.tiersSection.label}</span>
            <h2 className="font-black text-[#0F1B33] text-4xl md:text-5xl mt-3" style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}>
              {content.tiersSection.title} <span style={{ color: RED }}>{content.tiersSection.titleAccent}</span>
            </h2>
            <span aria-hidden="true" className="rope-rule mx-auto mt-5 block w-24 opacity-70" />
            <p className="ink-body mt-4 max-w-xl mx-auto">{content.tiersSection.description}</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 items-stretch">
            {activeTiers.map((tier, i) => <TierCard key={tier.name} tier={tier} index={i} />)}
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="sea-shore relative overflow-hidden py-24">
        <div className="relative z-10 max-w-2xl mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center mb-10">
            <span className="data-type inline-flex items-center gap-1.5 text-[12px] font-bold uppercase accent-label">
              <Sparkles size={12} aria-hidden="true" /> Get in touch
            </span>
            <h2 className="font-black text-[#0F1B33] text-3xl md:text-4xl mt-3" style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}>
              {content.cta.title}
            </h2>
            <p className="ink-body mt-4 max-w-xl mx-auto">{content.cta.description}</p>
          </motion.div>

          <motion.form initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} onSubmit={handleSubmit} className="chart-paper rounded-[5px] border border-[#DCE7F1] p-6 md:p-10 shadow-[0_28px_70px_-30px_rgba(7,19,33,0.42)]">
            {submitted ? (
              <div className="text-center py-10">
                <span
                  className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white"
                  style={{ boxShadow: "inset 0 0 0 1px #10B98133, 0 0 0 5px #10B9810F" }}
                >
                  <CheckCircle size={32} className="text-[#10B981]" />
                </span>
                <p className="font-bold text-[#0F1B33] text-xl mt-4">{content.cta.title}</p>
                <p className="ink-body text-sm mt-2">We will be in touch soon.</p>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                  <div>
                    <label className={labelClass}>{content.cta.form.nameLabel}</label>
                    <input value={formState.name} onChange={(e) => setFormState({ ...formState, name: e.target.value })} required placeholder="Your full name" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>{content.cta.form.orgLabel}</label>
                    <input value={formState.org} onChange={(e) => setFormState({ ...formState, org: e.target.value })} placeholder="Organisation name" className={inputClass} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                  <div>
                    <label className={labelClass}>{content.cta.form.emailLabel}</label>
                    <input type="email" value={formState.email} onChange={(e) => setFormState({ ...formState, email: e.target.value })} required placeholder="name@org.com" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>{content.cta.form.typeLabel}</label>
                    <input value={formState.type} onChange={(e) => setFormState({ ...formState, type: e.target.value })} placeholder="Community, Event, Strategic" className={inputClass} />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>{content.cta.form.messageLabel}</label>
                  <textarea value={formState.message} onChange={(e) => setFormState({ ...formState, message: e.target.value })} required rows={5} placeholder="Tell us about your partnership idea" className={inputClass} />
                </div>
                <button type="submit" className="w-full flex items-center justify-center gap-2.5 bg-[#E8231A] hover:bg-[#C41E16] disabled:opacity-70 text-white font-semibold py-4 rounded-[4px] transition-all duration-200 shadow-lg shadow-red-900/20 hover:gap-3 hover:shadow-red-900/30 mt-4">
                  <Mail size={16} />
                  {content.cta.submitButton}
                  <ArrowRight size={16} />
                </button>
              </div>
            )}
          </motion.form>
        </div>
      </section>

      {/* Current Partners */}
      {activePartners.length > 0 && (
        <section className="sea-shore relative overflow-hidden py-20">
          <div className="relative z-10 max-w-3xl mx-auto px-6">
            <span aria-hidden="true" className="rope-rule mb-10 block opacity-70" />
            <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="data-type text-center text-[12px] font-bold uppercase ink-muted">
              Our current partners
            </motion.p>
            <div className="mt-8 flex flex-wrap items-stretch justify-center gap-4">
              {activePartners.map((partner, i) => (
                <motion.div
                  key={partner.name}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  className={`px-6 py-4 min-w-[220px] text-center ${CARD}`}
                >
                  <p className="font-bold text-[#0F1B33] text-sm">{partner.name}</p>
                  <p className="data-type mt-1 text-[12px] uppercase ink-muted">{partner.type}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
