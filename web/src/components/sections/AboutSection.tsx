"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Users, Globe, Star, BookOpen } from "lucide-react";
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

const iconMap: Record<string, LucideIcon> = { Users, Globe, Star, BookOpen };

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
    <section id="about" className="relative overflow-hidden bg-white py-28">
      {/* A single soft wash keeps the section from reading as a plain white box
          without competing with the cards. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 left-1/2 h-[420px] w-[820px] -translate-x-1/2 opacity-[0.05]"
        style={{ background: 'radial-gradient(ellipse at center, #E8231A 0%, transparent 70%)' }}
      />

      <div className="relative mx-auto max-w-7xl px-6">
        <SectionHeading
          eyebrow={header.badge}
          title={header.title}
          highlight={header.titleHighlight}
          intro={header.description}
          className="mb-16"
        />

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="group relative overflow-hidden rounded-2xl border border-[#EDF1F7] bg-white p-7 transition-all duration-300 hover:-translate-y-1 hover:border-transparent hover:shadow-[0_24px_60px_-24px_rgba(15,27,51,0.28)]"
            >
              {/* Accent rule that draws itself across the top on hover */}
              <span
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-[3px] origin-left scale-x-0 transition-transform duration-500 group-hover:scale-x-100"
                style={{ background: f.color }}
              />
              {/* Faint colour wash so the whole card responds, not just the icon */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-20"
                style={{ background: f.color }}
              />

              <div
                className="relative mb-6 flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110"
                style={{ background: `${f.color}14`, boxShadow: `inset 0 0 0 1px ${f.color}26` }}
              >
                <f.icon size={21} strokeWidth={2.1} style={{ color: f.color }} />
              </div>
              <h3
                className="relative mb-2.5 text-[17px] font-bold leading-snug text-[#0F1B33]"
                style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
              >
                {f.title}
              </h3>
              <p className="relative text-sm leading-relaxed text-[#64748B]">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
