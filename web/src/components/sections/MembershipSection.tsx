"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Anchor, ArrowRight, Check, Sailboat } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { useLandingColors } from "@/lib/hooks/use-landing-colors";
import { useLandingSection, getBlocksByType } from "@/lib/hooks/use-landing-section";
import { pickText } from "@/lib/utils";
import SectionHeading from "./SectionHeading";

// Built-in copy is English only, matching the rest of the interface. CMS rows
// can still carry an Indonesian variant, which `pickText` picks up.
/**
 * Barcode bar heights, as percentages.
 *
 * Fixed rather than random: `Math.random()` during render would produce
 * different markup on the server and the client and trip a hydration mismatch.
 */
const BARCODE = [
  86, 54, 96, 40, 72, 100, 48, 64, 92, 36, 80, 58, 100, 44, 76, 62, 90, 50, 84, 68,
  96, 42, 74, 88, 56, 100, 46, 70,
];

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
    <section id="membership" className="sea-deep relative overflow-hidden py-28">
      {/* Same depth treatment as the other below-waterline sections. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div
          className="sea-chart-light absolute inset-0 opacity-[0.05]"
          style={{
            maskImage: "radial-gradient(ellipse 75% 65% at 50% 50%, transparent 20%, black 85%)",
            WebkitMaskImage: "radial-gradient(ellipse 75% 65% at 50% 50%, transparent 20%, black 85%)",
          }}
        />
        <div
          className="absolute right-0 top-0 h-[500px] w-[500px] rounded-full opacity-15"
          style={{
            background: "radial-gradient(circle, #E8231A, transparent 70%)",
            transform: "translate3d(0,0,0)",
          }}
        />
      </div>

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

            {/* Perks read as what is included with the fare, numbered like
                manifest lines rather than another tick-in-a-circle list. */}
            <ul className="mt-9 divide-y divide-white/10 border-y border-white/10">
              {content.perks.map((perk, i) => (
                <li key={i} className="flex items-center gap-4 py-3.5">
                  <span className="data-type w-6 shrink-0 text-[12px] text-white/35" aria-hidden="true">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <Check
                    size={14}
                    strokeWidth={3}
                    className="shrink-0"
                    style={{ color: colors.textAccent }}
                    aria-hidden="true"
                  />
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

          {/*
            Right: a boarding pass, not a generic glass card.

            Joining is boarding, which the hero already set up, so the object
            beside the call to action is a real ticket — printed on paper, torn
            along a perforation, with a stub. The previous version was a
            translucent rounded rectangle holding three grey bars standing in
            for text, which is the placeholder look every template ships.
            Every string here is still the same CMS field as before.
          */}
          <motion.div
            initial={{ opacity: 0, y: 28, rotate: -2.5 }}
            whileInView={{ opacity: 1, y: 0, rotate: -1.2 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="relative mx-auto w-full max-w-lg"
          >
            <div className="chart-paper relative overflow-hidden rounded-[6px] shadow-[0_40px_80px_-32px_rgba(0,0,0,0.75)]">
              {/* Airline-style header band */}
              <div className="flex items-center justify-between gap-4 px-6 py-4" style={{ background: colors.buttonPrimary }}>
                <div className="flex items-center gap-3">
                  <Anchor size={18} className="text-white" strokeWidth={2.4} aria-hidden="true" />
                  <p
                    className="text-sm font-black uppercase tracking-[0.14em] text-white"
                    style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
                  >
                    {content.cardTitle}
                  </p>
                </div>
                <p className="data-type text-[12px] font-bold uppercase text-white/80">Member card</p>
              </div>

              <div className="flex">
                {/* Main coupon */}
                <div className="min-w-0 flex-1 p-6">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="data-type text-[12px] uppercase ink-muted">From</p>
                      <p
                        className="text-2xl font-black leading-none text-[#0F1B33]"
                        style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
                      >
                        IDN
                      </p>
                    </div>

                    {/* Route line with a small vessel travelling it */}
                    <div className="relative mb-1 h-4 flex-1" aria-hidden="true">
                      <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 border-t border-dashed border-[#C3D2E0]" />
                      <Sailboat
                        size={16}
                        strokeWidth={2.2}
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#FCFBF7] px-0.5"
                        style={{ color: colors.textAccent }}
                      />
                    </div>

                    <div className="text-right">
                      <p className="data-type text-[12px] uppercase ink-muted">To</p>
                      <p
                        className="text-2xl font-black leading-none text-[#0F1B33]"
                        style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
                      >
                        AKL
                      </p>
                    </div>
                  </div>

                  <dl className="mt-7 grid grid-cols-3 gap-4">
                    {[
                      ["Holder", "Indonesian student"],
                      ["Status", "Member"],
                      ["Valid", "Anytime"],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <dt className="data-type text-[12px] uppercase ink-muted">{label}</dt>
                        <dd className="mt-1 truncate text-[13px] font-semibold text-[#28394F]">{value}</dd>
                      </div>
                    ))}
                  </dl>

                  {/* Barcode: varied bar widths, drawn from a fixed pattern so
                      it renders identically on server and client. */}
                  <div className="mt-7 flex h-11 items-end gap-[3px]" aria-hidden="true">
                    {BARCODE.map((height, i) => (
                      <span
                        key={i}
                        className="flex-1 bg-[#0F1B33]"
                        style={{ height: `${height}%`, opacity: i % 3 === 0 ? 0.85 : 0.55 }}
                      />
                    ))}
                  </div>
                </div>

                {/* Perforated seam and stub */}
                <div className="perforation-v w-[9px] shrink-0" aria-hidden="true" />

                <div className="flex w-[124px] shrink-0 flex-col items-center justify-center gap-1 border-l border-dashed border-[#C3D2E0] px-3 py-6 text-center">
                  <p className="data-type text-[12px] uppercase ink-muted">Fare</p>
                  <p
                    className="text-3xl font-black leading-none text-[#0F1B33]"
                    style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
                  >
                    {content.cardBadge}
                  </p>
                  <p className="mt-1 text-[12px] leading-snug ink-body">{content.cardBadgeSubtitle}</p>
                  <span
                    aria-hidden="true"
                    className="stamp-edge mt-3 flex h-9 w-9 rotate-[-12deg] items-center justify-center rounded-sm"
                    style={{ color: `${colors.textAccent}59` }}
                  >
                    <Anchor size={13} strokeWidth={2.5} style={{ color: colors.textAccent }} />
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
