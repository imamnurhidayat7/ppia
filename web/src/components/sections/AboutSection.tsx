"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Award,
  BookOpen,
  Calendar,
  CheckCircle,
  Coffee,
  FileText,
  Globe,
  GraduationCap,
  Heart,
  Image as ImageIcon,
  Lightbulb,
  Mail,
  MapPin,
  Phone,
  Rocket,
  Star,
  TrendingUp,
  Users,
  Video,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { useLandingSection, getBlocksByType } from "@/lib/hooks/use-landing-section";
import { pickText } from "@/lib/utils";
import SectionHeading from "./SectionHeading";

// Built-in copy is English only, matching the rest of the interface. CMS rows
// can still carry an Indonesian variant, which `pickText` picks up.
const DEFAULT_FEATURES = [
  {
    icon: Users,
    title: "Strong Community",
    desc: "Over 500 Indonesian students supporting each other across Auckland.",
    color: "#E8231A",
    iconName: "Users",
  },
  {
    icon: Globe,
    title: "Wide Network",
    desc: "Connect with Indonesian alumni and professionals throughout New Zealand.",
    color: "#3B82F6",
    iconName: "Globe",
  },
  {
    icon: Star,
    title: "Quality Events",
    desc: "From academic seminars to cultural celebrations — there's always something on.",
    color: "#F59E0B",
    iconName: "Star",
  },
  {
    icon: BookOpen,
    title: "Academic Support",
    desc: "Mentoring, study groups, and resources to help you excel in your studies.",
    color: "#8B00B4",
    iconName: "BookOpen",
  },
];

/**
 * Every icon the editor offers (ICON_OPTIONS in lib/section-schemas.ts) must be
 * resolvable here. This map used to hold four entries, so choosing any of the
 * other sixteen silently rendered the Users icon instead.
 */
const iconMap: Record<string, LucideIcon> = {
  Users,
  Calendar,
  FileText,
  MapPin,
  Heart,
  Star,
  Award,
  BookOpen,
  GraduationCap,
  Globe,
  Mail,
  Phone,
  Video,
  Image: ImageIcon,
  Coffee,
  Lightbulb,
  Rocket,
  TrendingUp,
  CheckCircle,
  ArrowRight,
};

export default function AboutSection() {
  const { language } = useLanguage();
  const { section } = useLandingSection("about");
  const isId = language === "id";

  const header = useMemo(() => {
    return {
      badge:
        pickText(isId, section?.config?.badgeId as string | undefined, section?.config?.badge as string | undefined) ||
        "About Us",
      title:
        pickText(isId, section?.titleId, section?.title) ||
        "What is PPIA Auckland?",
      titleHighlight: section?.config?.titleHighlight || "PPIA Auckland?",
      description:
        pickText(isId, section?.descriptionId, section?.description) ||
        "PPIA Auckland is the official association for Indonesian students in Auckland, New Zealand. We bring people together, and help every member grow academically, professionally, and personally.",
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, language]);

  const features = useMemo(() => {
    const cmsFeatures = getBlocksByType(section?.blocks, "FEATURE");
    if (cmsFeatures.length === 0) {
      return DEFAULT_FEATURES.map((f) => ({
        icon: f.icon,
        title: f.title,
        desc: f.desc,
        color: f.color,
      }));
    }
    return cmsFeatures.map((block) => {
      const iconName = block.iconName || "Users";
      const icon = iconMap[iconName] || Users;
      const color = block.color || "#E8231A";
      return {
        icon,
        title: pickText(isId, block.titleId, block.title) || "",
        // The editor form and the seed both write the description to
        // `subtitle`. `content` is only read as a fallback for older rows.
        desc:
          pickText(isId, block.subtitleId, block.subtitle) ||
          pickText(isId, block.contentId, block.content) ||
          "",
        color,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, language]);

  return (
    <section id="about" className="sea-shore relative overflow-hidden py-28 lg:py-32">
      {/* Shore-side depth: the navigation-chart grid carried down from the hero,
          fading out behind the cards, plus one warm wash so the surface is not
          a flat panel. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div
          className="sea-chart absolute inset-0 opacity-[0.05]"
          style={{
            maskImage: 'radial-gradient(ellipse 75% 65% at 50% 45%, transparent 20%, black 85%)',
            WebkitMaskImage: 'radial-gradient(ellipse 75% 65% at 50% 45%, transparent 20%, black 85%)',
          }}
        />
        <div
          className="absolute -top-24 left-1/2 h-[420px] w-[820px] -translate-x-1/2 opacity-[0.05]"
          style={{ background: 'radial-gradient(ellipse at center, #E8231A 0%, transparent 70%)' }}
        />
      </div>

      {/*
        Structure: a plotted route, not a card grid.

        The heading holds the left rail and the features become numbered
        waypoints threaded onto a single rope running down the page, each one
        offset from the last. A four-across grid of tinted icon circles is the
        default shape every landing page reaches for; a route is something this
        organisation can actually own, and it also survives long CMS copy
        better — a waypoint can grow downwards, where a grid row cannot.
      */}
      <div className="relative mx-auto grid max-w-7xl gap-14 px-6 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:gap-20">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <SectionHeading
            eyebrow={header.badge}
            title={header.title}
            highlight={header.titleHighlight}
            intro={header.description}
            align="left"
          />

          {/* Compass rose: the section's own mark, drawn rather than imported. */}
          <svg
            aria-hidden="true"
            viewBox="0 0 120 120"
            className="mt-12 hidden h-28 w-28 lg:block"
          >
            <circle cx="60" cy="60" r="52" fill="none" stroke="#0D2740" strokeOpacity="0.12" />
            <circle cx="60" cy="60" r="38" fill="none" stroke="#0D2740" strokeOpacity="0.08" strokeDasharray="3 6" />
            <path d="M60 8 L69 55 L60 112 L51 55 Z" fill="#E8231A" fillOpacity="0.85" />
            <path d="M8 60 L55 51 L112 60 L55 69 Z" fill="#0D2740" fillOpacity="0.28" />
            <circle cx="60" cy="60" r="4.5" fill="#0D2740" />
            <text x="60" y="6" textAnchor="middle" className="data-type" fontSize="9" fill="#0D2740" fillOpacity="0.5">N</text>
          </svg>
        </div>

        <ol className="relative">
          {/* The rope every waypoint hangs from. */}
          <span
            aria-hidden="true"
            className="rope-line-v absolute left-[19px] top-3 bottom-6 w-[3px] rounded-full sm:left-[23px]"
          />

          {features.map((f, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: -18 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.55, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="relative flex gap-5 pb-10 last:pb-0 sm:gap-7"
            >
              {/* Waypoint marker: a numbered buoy on the rope. */}
              <span
                aria-hidden="true"
                className="relative z-10 mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white sm:h-12 sm:w-12"
                style={{ boxShadow: `0 0 0 2px ${f.color}, 0 0 0 7px ${f.color}14` }}
              >
                <span className="data-type text-[12px] font-bold sm:text-xs" style={{ color: f.color }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
              </span>

              {/* Alternating indent so the column reads as a course being
                  steered rather than a straight list. */}
              <div className={`group min-w-0 flex-1 ${i % 2 === 1 ? "lg:translate-x-8" : ""}`}>
                <div className="chart-paper relative overflow-hidden rounded-[4px] border border-[#DCE7F1] p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_50px_-26px_rgba(7,19,33,0.4)] sm:p-7">
                  {/* Corner fold, so the card is a sheet of chart paper. */}
                  <span
                    aria-hidden="true"
                    className="absolute right-0 top-0 h-8 w-8"
                    style={{
                      background: `linear-gradient(225deg, #EDF5FB 0 50%, ${f.color}22 50%)`,
                      clipPath: "polygon(100% 0, 0 0, 100% 100%)",
                    }}
                  />

                  <div className="flex items-center gap-2.5">
                    <f.icon size={15} strokeWidth={2.3} style={{ color: f.color }} aria-hidden="true" />
                    <h3
                      className="text-[17px] font-bold leading-snug text-[#0F1B33]"
                      style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
                    >
                      {f.title}
                    </h3>
                  </div>

                  <p className="mt-3 max-w-xl text-sm leading-relaxed ink-body">{f.desc}</p>

                  {/* Underline that runs out as the eye leaves the card. */}
                  <span
                    aria-hidden="true"
                    className="mt-5 block h-px w-full origin-left scale-x-[0.18] transition-transform duration-500 group-hover:scale-x-100"
                    style={{ background: `linear-gradient(90deg, ${f.color}, transparent)` }}
                  />
                </div>
              </div>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}
