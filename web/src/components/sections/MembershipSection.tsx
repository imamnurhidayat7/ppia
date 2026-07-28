"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, CheckCircle } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { useLandingColors } from "@/lib/hooks/use-landing-colors";
import { useLandingSection, getBlocksByType } from "@/lib/hooks/use-landing-section";
import { pickText } from "@/lib/utils";
import SectionHeading from "./SectionHeading";

// Built-in copy is English only, matching the rest of the interface. CMS rows
// can still carry an Indonesian variant, which `pickText` picks up.
const DEFAULT_PERKS = [
  "Access to all exclusive PPIA events",
  "Community network of 500+ Indonesian students",
  "Scholarship & job opportunity updates",
  "Living & study guide for Auckland",
];

export default function MembershipSection() {
  const { language } = useLanguage();
  const { colors } = useLandingColors();
  const { section } = useLandingSection("membership");
  const isId = language === "id";

  const content = useMemo(() => {
    const cmsPerks = getBlocksByType(section?.blocks, "FEATURE");
    // A benefit's text lives in `title`, with `subtitle` as an optional longer
    // form that wins when filled. Reading `content` first meant every CMS perk
    // fell through to its own heading, because nothing writes to `content`.
    const perks: string[] =
      cmsPerks.length > 0
        ? cmsPerks.map(
            (b) =>
              pickText(isId, b.subtitleId, b.subtitle) ||
              pickText(isId, b.titleId, b.title) ||
              b.content ||
              ""
          )
        : DEFAULT_PERKS;

    // Read a config value for the visitor's language, falling back to the
    // language-neutral field the admin editor actually writes to.
    const cfg = (key: string) =>
      pickText(
        isId,
        section?.config?.[`${key}Id`] as string | undefined,
        section?.config?.[key] as string | undefined
      );

    // Buttons come from CTA_BUTTON blocks so they are editable in the CMS.
    // The older config-based fields stay as a fallback for un-migrated rows.
    const cmsButtons = getBlocksByType(section?.blocks, "CTA_BUTTON");
    const buttons =
      cmsButtons.length > 0
        ? cmsButtons.map((b, i) => ({
            label: pickText(isId, b.titleId, b.title) || "",
            href: b.linkUrl || "#",
            variant:
              (b.config?.variant as "primary" | "secondary") ||
              (i === 0 ? "primary" : "secondary"),
            color: b.color || "",
          }))
        : [
            {
              label: cfg("ctaText") || "Register Now",
              href: (section?.config?.ctaHref as string) || "/register",
              variant: "primary" as const,
              color: "",
            },
            {
              label: cfg("secondaryCtaText") || "Learn More",
              href: (section?.config?.secondaryCtaHref as string) || "/about",
              variant: "secondary" as const,
              color: "",
            },
          ];

    return {
      badge: cfg("badge") || "Membership",
      // The fallback heading now contains the fallback highlight, so the accent
      // still applies when nothing has been set in the CMS.
      title:
        pickText(isId, section?.titleId, section?.title) ||
        "Become Part of the PPIA Family",
      /**
       * The highlighted words are found *inside* the heading, matching every
       * other section. They used to be appended to it, which meant the same
       * CMS field behaved differently here than elsewhere and produced
       * nonsense when both were filled: a heading of "Join Our Community"
       * plus a highlight of "PPIA Family" rendered as
       * "Join Our Community PPIA Family".
       */
      titleHighlight: section
        ? ((section.config?.titleHighlight as string) || "")
        : "PPIA Family",
      description:
        pickText(isId, section?.descriptionId, section?.description) ||
        "Free for all Indonesian students currently studying in Auckland. Register and enjoy all the benefits of being a member.",
      perks,
      buttons,
      cardBadge: cfg("cardBadge") || "FREE",
      cardBadgeSubtitle: cfg("cardBadgeSubtitle") || "for active students",
      cardTitle: cfg("cardTitle") || "PPIA Auckland",
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, language]);

  return (
    <section id="membership" className="py-28 mesh-gradient relative overflow-hidden">
      {/* Static decorative orb */}
      <div
        className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full opacity-15 pointer-events-none"
        style={{
          background: "radial-gradient(circle, #E8231A, transparent 70%)",
          transform: "translate3d(0,0,0)",
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6 }}
          >
            {/*
              The highlight is appended to the heading here rather than found
              inside it, so it is joined on before handing the string over —
              SectionHeading then splits it back out for the gradient. Rendered
              text is unchanged; only the type treatment is now shared.
            */}
            <SectionHeading
              eyebrow={content.badge}
              title={content.title}
              highlight={content.titleHighlight || undefined}
              intro={content.description}
              align="left"
              tone="dark"
            />

            <ul className="mt-9 space-y-3.5">
              {content.perks.map((perk, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span
                    className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                    style={{ background: `${colors.textAccent}1F` }}
                    aria-hidden="true"
                  >
                    <CheckCircle size={13} style={{ color: colors.textAccent }} />
                  </span>
                  <span className="text-sm leading-relaxed text-[#CBD5E1]">{perk}</span>
                </li>
              ))}
            </ul>

            <div className="mt-10 flex flex-col sm:flex-row gap-3.5">
              {content.buttons.map((btn, i) =>
                btn.variant === "primary" ? (
                  <Link
                    key={i}
                    href={btn.href}
                    className="group relative flex items-center justify-center gap-2 overflow-hidden rounded-full px-8 py-4 font-semibold text-white shadow-[0_10px_40px_-12px_rgba(232,35,26,0.7)] transition-transform duration-300 hover:-translate-y-0.5"
                    style={{ background: btn.color || colors.buttonPrimary }}
                  >
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full"
                    />
                    <span className="relative">{btn.label}</span>
                    <ArrowRight
                      size={19}
                      className="relative transition-transform duration-300 group-hover:translate-x-1"
                    />
                  </Link>
                ) : (
                  <Link
                    key={i}
                    href={btn.href}
                    className="flex items-center justify-center rounded-full px-6 py-4 font-medium text-white/70 transition-colors hover:text-white"
                    style={btn.color ? { color: btn.color } : undefined}
                  >
                    {btn.label}
                  </Link>
                )
              )}
            </div>
          </motion.div>

          {/* Right - Decorative Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <div className="relative rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm p-8 overflow-hidden">
              {/* Glow */}
              <div
                className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-20"
                style={{ background: "radial-gradient(circle, #E8231A, transparent)" }}
              />

              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg shadow-red-900/50" style={{ background: colors.buttonPrimary }}>
                  <span
                    className="text-white font-black text-lg"
                    style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
                  >
                    PP
                  </span>
                </div>
                <div>
                  <p className="text-white font-bold">{content.cardTitle}</p>
                  <p className="text-[#94A3B8] text-sm">Membership Card</p>
                </div>
              </div>

              {/* Card number style decoration */}
              <div className="space-y-3 mb-8">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-2 rounded-full bg-white/10" style={{ width: `${100 - i * 15}%` }} />
                ))}
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#94A3B8] text-xs uppercase tracking-wider mb-1">Member Since</p>
                  <p className="text-white font-semibold">2024</p>
                </div>
                {/* Static dots decoration */}
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full opacity-60" style={{ background: colors.textAccent }} />
                  ))}
                </div>
              </div>
            </div>

            {/* Static badge */}
            <div className="absolute -top-4 -right-4 border border-white/10 bg-white/5 rounded-xl px-4 py-3 text-center">
              <p
                className="font-black text-white text-xl"
                style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
              >
                {content.cardBadge}
              </p>
              <p className="text-[#94A3B8] text-xs">{content.cardBadgeSubtitle}</p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
