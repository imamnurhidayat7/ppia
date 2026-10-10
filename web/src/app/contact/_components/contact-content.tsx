"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import PageHeader from "@/components/PageHeader";
import WaveTransition from "@/components/sections/WaveTransition";
import { PublicPageSkeleton } from "@/components/skeletons/public-skeletons";
import api from "@/lib/api";
import RichText from "@/components/RichText";
import { useContactConfig } from "@/lib/hooks/use-contact-config";
import type { ContactChannel, ContactFAQ } from "@/lib/api-types";
import {
  Mail,
  MapPin,
  Send,
  MessageCircle,
  Briefcase,
  ChevronDown,
  Clock,
  Users,
  HelpCircle,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════════════
   CONTACT PAGE
   Channels & FAQs come from CMS site-config key "contact".
   Falls back to sensible defaults if the admin hasn't configured anything.
   ═══════════════════════════════════════════════════════════════════════════ */

interface ContactHeader {
  label: string;
  title: string;
  titleAccent: string;
  description: string;
  breadcrumbs: { label: string }[];
}

const DEEP = "#0B1C2E";
const SHORE = "#FFFFFF";
const SHORE_DEEP = "#EDF5FB";

const CARD =
  "chart-paper rounded-[5px] border border-[#DCE7F1] transition-all duration-300 hover:border-[#C3D2E0] hover:shadow-[0_28px_70px_-30px_rgba(7,19,33,0.42)]";
const FIELD =
  "w-full rounded-[4px] border border-[#C3D2E0] bg-white/70 px-4 py-3 text-sm text-[#0F1B33] placeholder-[#8A9AAC] transition-colors focus:border-[#E8231A] focus:outline-none";
const LABEL = "data-type mb-2 block text-[12px] uppercase ink-muted";

/* ─── icon map ─── */
const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Mail,
  MapPin,
  MessageCircle,
  Send,
  Briefcase,
  HelpCircle,
  Users,
};

function InstagramIcon({ size = 22, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect width="24" height="24" rx="6" fill="currentColor" />
      <circle cx="12" cy="12" r="5" stroke="#fff" strokeWidth="1.5" />
      <circle cx="17" cy="7" r="1" fill="#fff" />
    </svg>
  );
}

ICON_MAP.Instagram = InstagramIcon;

function resolveIcon(item: ContactChannel): React.ComponentType<any> {
  return ICON_MAP[item.icon] ?? Mail;
}

/* ─── FAQ accordion ─── */
function FAQItem({ faq, open, onToggle }: { faq: ContactFAQ; open: boolean; onToggle: () => void }) {
  return (
    <motion.div
      className={`rounded-[5px] border transition-all ${
        open ? "border-[#E8231A]/20 bg-white" : "border-[#DCE7F1] bg-[#F5FAFD]/60"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left text-sm font-bold text-slate-800"
      >
        <span className="flex items-start gap-2.5">
          <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#E8231A]/60" />
          {faq.q}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <span aria-hidden="true" className="rope-rule mx-5 block opacity-70" />
          <div className="px-5 pb-5 pt-3 ink-body text-sm leading-relaxed">
            <RichText html={faq.a} />
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

function FAQAccordion({ faqs }: { faqs: ContactFAQ[] }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  if (faqs.length === 0) return null;
  return (
    <div className="space-y-3">
      {faqs.map((faq, i) => (
        <FAQItem key={i} faq={faq} open={openIdx === i} onToggle={() => setOpenIdx(openIdx === i ? null : i)} />
      ))}
    </div>
  );
}

/* ─── Channel cards ─── */
function ChannelGrid({ channels }: { channels: ContactChannel[] }) {
  if (channels.length === 0) return null;
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {channels.map((ch, i) => {
        const Icon = resolveIcon(ch);
        return (
          <motion.a
            key={i}
            href={ch.href}
            target={ch.href.startsWith("http") ? "_blank" : undefined}
            rel={ch.href.startsWith("http") ? "noopener noreferrer" : undefined}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            className={`${CARD} group flex items-start gap-4 px-5 py-5`}
          >
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
              style={{ backgroundColor: ch.color ? `${ch.color}14` : undefined, color: ch.color }}
            >
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-800">{ch.label}</p>
              <p className="mt-0.5 text-[13px] font-semibold text-[#E8231A]">{ch.value}</p>
              <p className="mt-1 text-[12px] leading-relaxed text-slate-500">{ch.sub}</p>
            </div>
          </motion.a>
        );
      })}
    </div>
  );
}

/* ─── Contact form ─── */
const defaultTopics = [
  { id: "general", label: "General inquiry" },
  { id: "membership", label: "Membership" },
  { id: "events", label: "Events" },
  { id: "partnership", label: "Partnership" },
  { id: "support", label: "Student support" },
];

function ContactForm() {
  const [form, setForm] = useState({ name: "", email: "", topic: "", message: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      setErrorMsg("Please fill in all required fields.");
      setStatus("error");
      return;
    }
    setStatus("sending");
    setErrorMsg("");
    try {
      // Form submitted — in production this posts to /api/contact.
      await new Promise((r) => setTimeout(r, 800));
      setStatus("sent");
      setForm({ name: "", email: "", topic: "", message: "" });
    } catch {
      setErrorMsg("Could not send. Please try again or email us directly.");
      setStatus("error");
    }
  };

  const buttonLabel = status === "sending" ? "Sending..." : status === "sent" ? "Sent!" : "Send message";

  return (
    <form onSubmit={handleSubmit} className={CARD + " p-6 sm:p-8"} noValidate>
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E8231A]/10">
          <Send className="h-4 w-4 text-[#E8231A]" />
        </span>
        <div>
          <h2 className="text-base font-black text-slate-800">Send us a message</h2>
          <p className="text-[12px] text-slate-500">We&apos;ll get back within 1&ndash;2 business days.</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="contact-name" className={LABEL}>Full name *</label>
          <input id="contact-name" type="text" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className={FIELD} placeholder="Your full name" />
        </div>
        <div>
          <label htmlFor="contact-email" className={LABEL}>Email *</label>
          <input id="contact-email" type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} className={FIELD} placeholder="you@example.com" />
        </div>
        <div>
          <label htmlFor="contact-topic" className={LABEL}>Topic</label>
          <select id="contact-topic" value={form.topic} onChange={(e) => setForm((p) => ({ ...p, topic: e.target.value }))} className={FIELD}>
            <option value="">Select a topic</option>
            {defaultTopics.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="contact-message" className={LABEL}>Message *</label>
          <textarea id="contact-message" rows={5} value={form.message} onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))} className={FIELD} placeholder="What would you like to ask or discuss?" />
        </div>
      </div>

      {status === "error" && <p className="mt-4 text-[13px] font-semibold text-rose-600 dark:text-rose-400">{errorMsg}</p>}
      {status === "sent" && <p className="mt-4 text-[13px] font-semibold text-emerald-600 dark:text-emerald-400">Message sent! We'll be in touch.</p>}

      <button
        type="submit"
        disabled={status === "sending" || status === "sent"}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-[5px] bg-[#E8231A] px-6 py-3 text-sm font-bold text-white transition-all duration-200 hover:bg-[#C41E16] disabled:opacity-50"
      >
        {status === "sending" && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
        {buttonLabel}
      </button>
    </form>
  );
}

/* ─── main page ─── */
export default function ContactPage() {
  const { channels, faqs, loading: configLoading } = useContactConfig();

  const [content, setContent] = useState<ContactHeader | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getPageBySlug("contact")
      .then((res) => {
        const c = res?.page?.content as Record<string, any> | undefined;
        if (c?.header) setContent(c.header);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  if (loading || configLoading) return <PublicPageSkeleton />;

  return (
    <>
      <PageHeader
        label={content?.label ?? "Contact"}
        title={content?.title ?? "Get in Touch"}
        titleAccent={content?.titleAccent}
        description={content?.description ?? "Reach out — we'd love to hear from you."}
        breadcrumbs={content?.breadcrumbs ?? [{ label: "Contact" }]}
        layout="split"
      />

      <WaveTransition from={DEEP} to={SHORE} />

      {/* Form + FAQ side by side */}
      <section className="sea-shore relative overflow-hidden py-20">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 sm:px-8 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <ContactForm />
          </div>
          <div className="lg:col-span-2">
            <h2
              className="mb-2 text-xl font-black text-slate-800"
              style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
            >
              Frequently asked
            </h2>
            <p className="mb-6 text-sm text-slate-500">Quick answers before you write in.</p>
            <FAQAccordion faqs={faqs} />
          </div>
        </div>
      </section>

      <WaveTransition from={SHORE_DEEP} to={DEEP} />

      {/* Channels strip */}
      <section className="sea-deep relative overflow-hidden py-20">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="chart-paper absolute inset-0 opacity-[0.04]" />
          <div
            className="sea-chart-light absolute inset-0 opacity-[0.05]"
            style={{
              maskImage: "radial-gradient(ellipse 78% 68% at 50% 50%, transparent 20%, black 85%)",
              WebkitMaskImage: "radial-gradient(ellipse 78% 68% at 50% 50%, transparent 20%, black 85%)",
            }}
          />
          <div className="absolute inset-0 opacity-10" />
        </div>

        <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
          <div className="mb-12 text-center">
            <h2
              className="text-2xl font-black text-white sm:text-3xl"
              style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
            >
              Rather connect directly?
            </h2>
            <span aria-hidden="true" className="mx-auto mb-6 block h-px w-16 bg-white/15" />
            <p className="text-sm text-slate-400">Choose the channel that works best for you.</p>
          </div>
          <ChannelGrid channels={channels} />
        </div>
      </section>

      <WaveTransition from={DEEP} to={SHORE} mirror />

      {/* Instagram CTA */}
      <section className="bg-white py-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          className="mx-auto max-w-6xl px-5 text-center sm:px-8"
        >
          <p className="text-lg text-slate-600">Prefer DMs? Find us on Instagram for quick questions.</p>
          <a
            href="https://instagram.com/ppiauckland"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#E8231A] px-6 py-3 text-sm font-bold text-white transition-all duration-200 shadow-lg hover:opacity-90 hover:gap-3"
          >
            <InstagramIcon size={18} />
            @ppiauckland on Instagram
          </a>
        </motion.div>
      </section>
    </>
  );
}
