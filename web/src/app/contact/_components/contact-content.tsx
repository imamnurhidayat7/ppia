"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import PageHeader from "@/components/PageHeader";
import { PublicPageSkeleton } from "@/components/skeletons/public-skeletons";
import api from "@/lib/api";
import RichText from "@/components/RichText";
import {
  Mail,
  MessageCircle,
  MapPin,
  Send,
  Briefcase,
  CheckCircle,
  ChevronDown,
  Clock,
  Users,
  HelpCircle,
} from "lucide-react";

interface ContactHeader {
  label: string;
  title: string;
  titleAccent: string;
  description: string;
  breadcrumbs: { label: string }[];
}

function InstagramIcon({ size = 22, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

/* ─── icon registry: maps string names (from CMS) to React components ─── */
const ICON_MAP: Record<string, React.ComponentType<any>> = {
  mail: Mail,
  instagram: InstagramIcon,
  whatsapp: MessageCircle,
  mapPin: MapPin,
  users: Users,
  helpCircle: HelpCircle,
  messageCircle: MessageCircle,
  clock: Clock,
  // Stored content already used these two for the partnership and "other"
  // enquiry topics. They were missing from the map, so both fell back to the
  // envelope icon.
  briefcase: Briefcase,
  send: Send,
};

function resolveIcon(item: any): React.ComponentType<any> {
  // Hardcoded items have `icon` as a component; CMS items have `iconName` as a string.
  if (item.icon && typeof item.icon !== 'string') return item.icon;
  const name = item.iconName || (typeof item.icon === 'string' ? item.icon : '');
  return ICON_MAP[name] ?? Mail;
}

/* ─── contact channels ─── */
const channels = [
  {
    icon: Mail,
    color: "#E8231A",
    label: "Email Us",
    value: "ppiauckland@gmail.com",
    sub: "We reply within 1–2 business days",
    href: "mailto:ppiauckland@gmail.com",
  },
  {
    icon: InstagramIcon,
    color: "#C13584",
    label: "Instagram",
    value: "@ppiauckland",
    sub: "DM us for quick questions",
    href: "https://instagram.com/ppiauckland",
  },
  {
    icon: MessageCircle,
    color: "#25D366",
    label: "WhatsApp Community",
    value: "Join our group",
    sub: "Member announcements & discussions",
    href: "#membership",
  },
  {
    icon: MapPin,
    color: "#3B82F6",
    label: "Location",
    value: "Auckland, New Zealand",
    sub: "Serving all Auckland universities",
    href: "#",
  },
];

/* ─── FAQ items ─── */
const faqs = [
  {
    q: "How do I join PPIA Auckland?",
    a: "Registration is completely free. Fill in our membership form and you'll be added to our WhatsApp community and receive updates about events and resources.",
  },
  {
    q: "I'm a new student arriving in Auckland — where do I start?",
    a: "Head to our Wiki PPIA page which covers everything from pre-departure checklists to finding accommodation, banking, and life in Auckland. You can also post questions in our WhatsApp community group.",
  },
  {
    q: "Can I propose an event or program?",
    a: "Absolutely! We welcome ideas from members. Send us a message via Instagram DM or email with your concept and we'll review it with the relevant department.",
  },
  {
    q: "How do I get involved as a volunteer or cabinet member?",
    a: "PPIA cabinet recruitment usually opens at the start of each academic year. Follow our Instagram and join the WhatsApp community to be notified when positions open.",
  },
  {
    q: "I'm a business / organisation — how do I partner with PPIA?",
    a: "Visit our Partnership page for details on collaboration options, or send us an email at ppiauckland@gmail.com. Our Public Relations team will get back to you within 3 business days.",
  },
  {
    q: "Is PPIA Auckland affiliated with the Indonesian Government?",
    a: "PPIA Auckland is an independent student association. We work closely with the Indonesian Consulate General Auckland and are part of the broader PPI (Perhimpunan Pelajar Indonesia) network across New Zealand.",
  },
];

/* ─── reasons ─── */
const topics = [
  { icon: Users, label: "Membership & Registration" },
  { icon: HelpCircle, label: "New Student Questions" },
  { icon: MessageCircle, label: "Event Enquiry" },
  { icon: Mail, label: "Partnership / Sponsorship" },
  { icon: Clock, label: "Volunteer Opportunities" },
  { icon: Send, label: "Other" },
];

/* ─── faq item ─── */
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#F8FAFC] transition-colors"
      >
        <span className="font-semibold text-[#1A2B4A] text-sm pr-4">{q}</span>
        <ChevronDown
          size={16}
          className="shrink-0 text-[#94A3B8] transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
        >
          <div className="px-5 pb-5 pt-1 text-[#64748B] text-sm leading-relaxed border-t border-[#E2E8F0]">
            <RichText html={a} />
          </div>
        </motion.div>
      )}
    </div>
  );
}

/* ─── main page ─── */
export default function ContactPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    topic: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState<{ header: ContactHeader } | null>(null);
  const [cmsChannels, setCmsChannels] = useState<typeof channels | null>(null);
  const [cmsFaqs, setCmsFaqs] = useState<typeof faqs | null>(null);
  const [cmsTopics, setCmsTopics] = useState<typeof topics | null>(null);

  useEffect(() => {
    api.getPageBySlug("contact")
      .then((res) => {
        const c = res?.page?.content as Record<string, any> | undefined;
        if (c?.header) setContent({ header: c.header });
        if (Array.isArray(c?.channels)) setCmsChannels(c.channels);
        if (Array.isArray(c?.faqs)) setCmsFaqs(c.faqs);
        if (Array.isArray(c?.topics)) setCmsTopics(c.topics);
      })
      .catch(() => undefined);
  }, []);

  if (!content) return <PublicPageSkeleton />;

  const activeChannels = cmsChannels ?? [];
  const activeFaqs = cmsFaqs ?? [];
  const activeTopics = cmsTopics ?? [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 1200);
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

      {/* Contact channels */}
      <section className="py-16 bg-[#0D1B33] relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, #E8231A, transparent 50%),
              radial-gradient(circle at 80% 50%, #3B82F6, transparent 50%)`,
          }}
        />
        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {activeChannels.map((ch, i) => (
              <motion.a
                key={ch.label}
                href={ch.href}
                target={ch.href.startsWith("http") ? "_blank" : undefined}
                rel={ch.href.startsWith("http") ? "noopener noreferrer" : undefined}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="group flex flex-col gap-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-6 transition-all duration-300 cursor-pointer"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110"
                  style={{ background: `${ch.color}25` }}
                >
                  {(() => { const Icon = resolveIcon(ch); return <Icon size={22} style={{ color: ch.color }} />; })()}
                </div>
                <div>
                  <p className="text-[#94A3B8] text-xs uppercase tracking-widest mb-1">{ch.label}</p>
                  <p
                    className="font-bold text-white text-sm leading-snug group-hover:underline"
                    style={{ textDecorationColor: ch.color }}
                  >
                    {ch.value}
                  </p>
                  <p className="text-[#64748B] text-xs mt-1">{ch.sub}</p>
                </div>
              </motion.a>
            ))}
          </div>
        </div>
      </section>

      {/* Form + topics */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
            {/* Left: what we can help with */}
            <div className="lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, x: -24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.6 }}
              >
                <span className="text-[#E8231A] font-semibold text-sm tracking-widest uppercase">
                  How we can help
                </span>
                <h2
                  className="font-black text-[#1A2B4A] text-3xl md:text-4xl mt-3 mb-6 leading-tight"
                  style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
                >
                  We&apos;re Here for{" "}
                  <span className="gradient-text">Every Question</span>
                </h2>
                <p className="text-[#64748B] leading-relaxed mb-8">
                  Whether you&apos;re a new student preparing to arrive, an existing member with ideas, or an
                  organisation interested in collaborating — our team is happy to hear from you.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  {activeTopics.map((t, i) => (
                    <motion.div
                      key={t.label}
                      initial={{ opacity: 0, y: 12 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: i * 0.07 }}
                      className="flex items-center gap-3 bg-[#F8FAFC] rounded-xl px-3 py-2.5 border border-[#F1F5F9]"
                    >
                      <div className="w-7 h-7 rounded-lg bg-[#E8231A]/10 flex items-center justify-center shrink-0">
                        {(() => { const Icon = resolveIcon(t); return <Icon size={13} className="text-[#E8231A]" />; })()}
                      </div>
                      <p className="text-[#64748B] text-xs font-medium leading-tight">{t.label}</p>
                    </motion.div>
                  ))}
                </div>

                {/* Response time */}
                <div className="mt-8 flex items-start gap-3 rounded-2xl border border-[#E8231A]/20 bg-[#FFF0EF] px-5 py-4">
                  <Clock size={16} className="text-[#E8231A] mt-0.5 shrink-0" />
                  <p className="text-[#64748B] text-sm">
                    <span className="font-semibold text-[#1A2B4A]">Average response time:</span> 1–2 business
                    days via email, faster via Instagram DM.
                  </p>
                </div>
              </motion.div>
            </div>

            {/* Right: form */}
            <div className="lg:col-span-3">
              <motion.div
                initial={{ opacity: 0, x: 24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{ duration: 0.6 }}
              >
                {submitted ? (
                  <div className="h-full flex flex-col items-center justify-center text-center py-20 border-2 border-[#10B981]/20 bg-[#F0FDF4] rounded-3xl">
                    <motion.div
                      initial={{ scale: 0.7, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                      <div className="w-20 h-20 rounded-full bg-[#10B981]/15 flex items-center justify-center mx-auto mb-6">
                        <CheckCircle size={40} className="text-[#10B981]" />
                      </div>
                    </motion.div>
                    <h3
                      className="font-black text-[#1A2B4A] text-2xl mb-3"
                      style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
                    >
                      Message Sent!
                    </h3>
                    <p className="text-[#64748B] max-w-sm">
                      Thank you for reaching out. We&apos;ll get back to you within 1–2 business days.
                    </p>
                    <button
                      onClick={() => { setSubmitted(false); setForm({ name: "", email: "", topic: "", message: "" }); }}
                      className="mt-8 text-sm font-medium text-[#E8231A] hover:underline"
                    >
                      Send another message
                    </button>
                  </div>
                ) : (
                  <form
                    onSubmit={handleSubmit}
                    className="bg-[#F8FAFC] rounded-3xl border border-[#E2E8F0] p-8 md:p-10 space-y-5"
                  >
                    <div>
                      <h3
                        className="font-black text-[#1A2B4A] text-2xl mb-1"
                        style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
                      >
                        Send a Message
                      </h3>
                      <p className="text-[#94A3B8] text-sm">
                        Fill in the form and we&apos;ll reply by email.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-[#1A2B4A] uppercase tracking-wider mb-2">
                          Full Name
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Budi Santoso"
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                          className="w-full bg-white border-2 border-[#E2E8F0] rounded-xl px-4 py-3 text-[#1A2B4A] placeholder-[#CBD5E1] text-sm focus:outline-none focus:border-[#E8231A]/40 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#1A2B4A] uppercase tracking-wider mb-2">
                          Email Address
                        </label>
                        <input
                          type="email"
                          required
                          placeholder="budi@email.com"
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                          className="w-full bg-white border-2 border-[#E2E8F0] rounded-xl px-4 py-3 text-[#1A2B4A] placeholder-[#CBD5E1] text-sm focus:outline-none focus:border-[#E8231A]/40 transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#1A2B4A] uppercase tracking-wider mb-2">
                        Topic
                      </label>
                      <select
                        required
                        value={form.topic}
                        onChange={(e) => setForm({ ...form, topic: e.target.value })}
                        className="w-full bg-white border-2 border-[#E2E8F0] rounded-xl px-4 py-3 text-[#1A2B4A] text-sm focus:outline-none focus:border-[#E8231A]/40 transition-colors appearance-none"
                      >
                        <option value="">Select a topic...</option>
                        <option value="membership">Membership & Registration</option>
                        <option value="new-student">New Student Questions</option>
                        <option value="event">Event Enquiry</option>
                        <option value="partnership">Partnership / Sponsorship</option>
                        <option value="volunteer">Volunteer Opportunities</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#1A2B4A] uppercase tracking-wider mb-2">
                        Message
                      </label>
                      <textarea
                        required
                        rows={5}
                        placeholder="Tell us what's on your mind..."
                        value={form.message}
                        onChange={(e) => setForm({ ...form, message: e.target.value })}
                        className="w-full bg-white border-2 border-[#E2E8F0] rounded-xl px-4 py-3 text-[#1A2B4A] placeholder-[#CBD5E1] text-sm focus:outline-none focus:border-[#E8231A]/40 transition-colors resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2.5 bg-[#E8231A] hover:bg-[#C41E16] disabled:opacity-70 text-white font-semibold py-4 rounded-xl transition-all duration-200 shadow-lg shadow-red-900/20 hover:gap-3 hover:shadow-red-900/30"
                    >
                      {loading ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                            className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                          />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send size={16} />
                          Send Message
                        </>
                      )}
                    </button>
                  </form>
                )}
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-[#F8FAFC]">
        <div className="max-w-3xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <span className="text-[#E8231A] font-semibold text-sm tracking-widest uppercase">FAQ</span>
            <h2
              className="font-black text-[#1A2B4A] text-4xl md:text-5xl mt-3"
              style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
            >
              Common <span className="gradient-text">Questions</span>
            </h2>
            <p className="text-[#64748B] mt-4">
              Quick answers to the questions we get most often.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.5 }}
            className="space-y-3"
          >
            {activeFaqs.map((faq) => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </motion.div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-16 bg-[#0D1B33] relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 50% 50%, #E8231A, transparent 60%)`,
          }}
        />
        <div className="relative z-10 max-w-2xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
          >
            <h2
              className="font-black text-white text-3xl md:text-4xl mb-4"
              style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
            >
              Rather Connect Directly?
            </h2>
            <p className="text-[#94A3B8] mb-8">
              For the fastest response, send us a DM on Instagram — we&apos;re usually online daily.
            </p>
            <a
              href="https://instagram.com/ppiauckland"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] text-white font-semibold px-8 py-4 rounded-xl transition-all duration-200 shadow-lg hover:opacity-90 hover:gap-3"
            >
              <InstagramIcon size={18} />
              @ppiauckland on Instagram
            </a>
          </motion.div>
        </div>
      </section>
    </>
  );
}
