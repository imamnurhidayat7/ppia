"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import PageHeader from "@/components/PageHeader";
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

const NAVY = "#1A2B4A";
const RED = "#E8231A";
const RED_DARK = "#C41E16";
const SLATE = "#64748B";
const MIST = "#94A3B8";
const LINE = "#E2E8F0";
const CANVAS = "#F8FAFC";

function BenefitCard({ benefit, index }: { benefit: { icon: string; color: string; title: string; desc: string }; index: number }) {
  const Icon = ICON_MAP[benefit.icon as keyof typeof ICON_MAP] ?? Users;
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      whileHover={{ y: -4 }}
      className="group relative bg-white border border-[#E2E8F0] rounded-2xl p-7 transition-shadow hover:shadow-[0_12px_32px_-12px_rgba(15,23,42,0.18)] hover:border-[#94A3B8]"
    >
      <span className="absolute top-0 left-7 right-7 h-1 rounded-b" style={{ background: benefit.color }} />
      <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 mt-1" style={{ background: `${benefit.color}15` }}>
        <Icon size={22} style={{ color: benefit.color }} />
      </div>
      <h3 className="font-bold text-[#1A2B4A] text-lg mb-2" style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}>{benefit.title}</h3>
      <p className="text-[#64748B] text-sm leading-relaxed">{benefit.desc}</p>
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
      className={`relative rounded-3xl p-8 transition-all ${featured ? "bg-[#1A2B4A] text-white shadow-2xl scale-[1.04] md:scale-105" : "bg-white border border-[#E2E8F0] hover:shadow-xl"}`}
    >
      {featured && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#E8231A] text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
          Most popular
        </span>
      )}
      <div className="flex items-baseline justify-between mb-1">
        <span className={`text-[11px] font-bold tracking-[0.25em] ${featured ? "text-white/60" : "text-[#94A3B8]"}`}>
          {String(index + 1).padStart(2, "0")}
        </span>
        {!featured && <div className="w-3 h-3 rounded-full" style={{ background: tier.color }} />}
      </div>
      <h3 className={`font-bold text-xl ${featured ? "text-white" : "text-[#1A2B4A]"}`} style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}>
        {tier.name}
      </h3>
      <p className={`text-xs uppercase tracking-widest font-semibold mt-1 ${featured ? "text-white/60" : "text-[#94A3B8]"}`}>
        {tier.ideal}
      </p>
      <p className={`font-black text-3xl mt-5 ${featured ? "text-white" : "text-[#1A2B4A]"}`} style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}>
        {tier.price}
      </p>
      <ul className={`mt-6 space-y-3 text-sm ${featured ? "text-white/85" : "text-[#475569]"}`}>
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

  if (!content) return null;
  const activeBenefits = content.benefits;
  const activeTiers = content.tiers;
  const activePartners = content.currentPartners;
  const inputClass = "w-full px-1 py-3 bg-transparent text-[#1A2B4A] placeholder:text-[#94A3B8] focus:outline-none text-sm border-b border-[#E2E8F0] focus:border-[#E8231A] transition-colors";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <>
      <PageHeader {...content.header} />

      {/* Why partner */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.6 }} className="max-w-3xl mb-14">
            <span className="text-[#E8231A] font-bold text-xs tracking-[0.3em] uppercase">{content.benefitsSection.label}</span>
            <h2 className="font-black text-[#1A2B4A] text-4xl md:text-5xl mt-3 leading-tight" style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}>
              {content.benefitsSection.title}{content.benefitsSection.titleAccent}
            </h2>
            <p className="text-[#64748B] text-base mt-4 leading-relaxed max-w-2xl">{content.benefitsSection.description}</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {activeBenefits.map((b, i) => <BenefitCard key={b.title} benefit={b} index={i} />)}
          </div>
        </div>
      </section>

      {/* Tiers */}
      <section className="py-24" style={{ background: CANVAS }}>
        <div className="max-w-7xl mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.6 }} className="text-center mb-14">
            <span className="text-[#E8231A] font-bold text-xs tracking-[0.3em] uppercase">{content.tiersSection.label}</span>
            <h2 className="font-black text-[#1A2B4A] text-4xl md:text-5xl mt-3" style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}>
              {content.tiersSection.title} <span style={{ color: RED }}>{content.tiersSection.titleAccent}</span>
            </h2>
            <p className="text-[#64748B] mt-4 max-w-xl mx-auto">{content.tiersSection.description}</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 items-stretch">
            {activeTiers.map((tier, i) => <TierCard key={tier.name} tier={tier} index={i} />)}
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-24 bg-white">
        <div className="max-w-2xl mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center mb-10">
            <span className="inline-flex items-center gap-1.5 text-[#E8231A] font-bold text-xs tracking-[0.3em] uppercase">
              <Sparkles size={12} /> Get in touch
            </span>
            <h2 className="font-black text-[#1A2B4A] text-3xl md:text-4xl mt-3" style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}>
              {content.cta.title}
            </h2>
            <p className="text-[#64748B] mt-4 max-w-xl mx-auto">{content.cta.description}</p>
          </motion.div>

          <motion.form initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} onSubmit={handleSubmit} className="bg-white border border-[#E2E8F0] rounded-3xl p-6 md:p-10 shadow-[0_4px_24px_-8px_rgba(15,23,42,0.12)]">
            {submitted ? (
              <div className="text-center py-10">
                <CheckCircle size={40} className="mx-auto text-[#10B981]" />
                <p className="font-bold text-[#1A2B4A] text-xl mt-4">{content.cta.title}</p>
                <p className="text-[#64748B] text-sm mt-2">We will be in touch soon.</p>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#94A3B8] mb-1.5">{content.cta.form.nameLabel}</label>
                    <input value={formState.name} onChange={(e) => setFormState({ ...formState, name: e.target.value })} required placeholder="Your full name" className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#94A3B8] mb-1.5">{content.cta.form.orgLabel}</label>
                    <input value={formState.org} onChange={(e) => setFormState({ ...formState, org: e.target.value })} placeholder="Organisation name" className={inputClass} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#94A3B8] mb-1.5">{content.cta.form.emailLabel}</label>
                    <input type="email" value={formState.email} onChange={(e) => setFormState({ ...formState, email: e.target.value })} required placeholder="name@org.com" className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#94A3B8] mb-1.5">{content.cta.form.typeLabel}</label>
                    <input value={formState.type} onChange={(e) => setFormState({ ...formState, type: e.target.value })} placeholder="Community, Event, Strategic" className={inputClass} />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#94A3B8] mb-1.5">{content.cta.form.messageLabel}</label>
                  <textarea value={formState.message} onChange={(e) => setFormState({ ...formState, message: e.target.value })} required rows={5} placeholder="Tell us about your partnership idea" className={inputClass} />
                </div>
                <button type="submit" className="w-full flex items-center justify-center gap-2.5 bg-[#E8231A] hover:bg-[#C41E16] disabled:opacity-70 text-white font-semibold py-4 rounded-xl transition-all duration-200 shadow-lg shadow-red-900/20 hover:gap-3 hover:shadow-red-900/30 mt-4">
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
        <section className="py-20 border-t border-[#E2E8F0]" style={{ background: CANVAS }}>
          <div className="max-w-3xl mx-auto px-6">
            <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-[11px] uppercase tracking-[0.3em] text-[#94A3B8] font-bold text-center">
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
                  className="bg-white border border-[#E2E8F0] rounded-2xl px-6 py-4 min-w-[220px] text-center"
                >
                  <p className="font-bold text-[#1A2B4A] text-sm">{partner.name}</p>
                  <p className="text-xs text-[#94A3B8] mt-0.5 uppercase tracking-wider font-semibold">{partner.type}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
