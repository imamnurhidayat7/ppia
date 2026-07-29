"use client";

import { useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Anchor } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { useMenuItems } from "@/lib/hooks/use-menu-items";
import type { MenuItem } from "@/lib/api-types";

const socials = [
  {
    label: "Instagram",
    href: "https://instagram.com/ppiauckland",
    svg: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    label: "LinkedIn",
    href: "https://linkedin.com/company/ppiauckland",
    svg: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
        <rect x="2" y="9" width="4" height="12" />
        <circle cx="4" cy="4" r="2" />
      </svg>
    ),
  },
  {
    label: "YouTube",
    href: "https://youtube.com/@ppiauckland2025",
    svg: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20.06 12 20.06 12 20.06s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" />
        <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="white" />
      </svg>
    ),
  },
  {
    label: "Email",
    href: "mailto:ppiauckland@gmail.com",
    svg: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
      </svg>
    ),
  },
];

export default function Footer() {
  const { t, language } = useLanguage();
  const { menu } = useMenuItems("footer_quicklinks");

  const defaultFooterLinks = {
    About: [
      { label: t("nav.about_sub.ambition"), href: "/about/ambition-action" },
      { label: t("nav.about_sub.cabinet"), href: "/about/cabinet" },
      { label: t("nav.about_sub.adart"), href: "/about/ad-art" },
      { label: t("nav.contact"), href: "/contact" },
    ],
    Community: [
      { label: t("nav.activities_sub.events"), href: "/activities/events" },
      { label: t("nav.activities_sub.news"), href: "/activities/news-articles" },
      { label: t("nav.activities_sub.research"), href: "/activities/research-corner" },
    ],
    Resources: [
      { label: t("nav.opportunities_sub.wiki"), href: "/opportunities/wiki-ppia" },
      { label: t("nav.opportunities_sub.scholarship"), href: "/opportunities/scholarship" },
      { label: t("nav.opportunities_sub.career"), href: "/opportunities/career-info" },
    ],
  };

  // Use CMS footer menu items if available, otherwise fall back to defaults
  const footerLinks = useMemo<Record<string, MenuItem[]>>(() => {
    if (menu?.items && menu.enabled !== false) {
      const items = language === "id" ? menu.items.id : menu.items.en;
      if (items && items.length > 0) {
        // Convert CMS items to the footer links structure
        const result: Record<string, MenuItem[]> = {};
        items.forEach((item) => {
          const category = item.label;
          result[category] = item.children || [];
        });
        if (Object.keys(result).length > 0) return result;
      }
    }
    return defaultFooterLinks;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menu, language]);

  return (
    /*
      The footer is the deepest water on the page: the same `.sea-deep` gradient
      as the masthead and hero, with the faint navigation-chart grid behind it,
      rope hairlines for edges, and the instrument row (coordinates + year) the
      dashboard footer already uses. It reads as the floor the whole voyage
      comes to rest on rather than a plain navy slab.
    */
    <footer className="sea-deep relative overflow-hidden text-white">
      <div
        aria-hidden="true"
        className="sea-chart-light pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          maskImage: "radial-gradient(ellipse 90% 80% at 50% 0%, black 30%, transparent 85%)",
          WebkitMaskImage: "radial-gradient(ellipse 90% 80% at 50% 0%, black 30%, transparent 85%)",
        }}
      />
      {/* Bearing rings, echoing the masthead and the About compass. */}
      <svg
        viewBox="0 0 200 200"
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-24 hidden h-80 w-80 lg:block"
      >
        <circle cx="100" cy="100" r="88" fill="none" stroke="white" strokeOpacity="0.06" />
        <circle cx="100" cy="100" r="62" fill="none" stroke="white" strokeOpacity="0.05" strokeDasharray="4 9" />
        <circle cx="100" cy="100" r="34" fill="none" stroke="white" strokeOpacity="0.05" />
        <path d="M100 12 L106 96 L100 188 L94 96 Z" fill="#E8231A" fillOpacity="0.18" />
      </svg>

      <div className="relative mx-auto max-w-7xl px-6 py-16">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-5">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="mb-5 inline-block">
              <Image
                src="/Logo-PPIA-2025-White.png"
                alt="PPIA Auckland"
                width={140}
                height={56}
                style={{ height: 48, width: "auto" }}
              />
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-white/70">
              {t("footer.tagline")}
            </p>

            {/* Home port line, set as chart data like the hero location tag. */}
            <p className="data-type mt-5 flex items-center gap-2 text-[12px] uppercase text-white/60">
              <Anchor size={12} aria-hidden="true" className="text-[#FF8A80]" />
              Auckland · 36.85° S, 174.76° E
            </p>

            <div className="mt-6 flex items-center gap-3">
              {socials.map((s) => (
                <Link
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80 transition-colors duration-200 hover:border-[#E8231A] hover:bg-[#E8231A] hover:text-white"
                >
                  {s.svg}
                </Link>
              ))}
            </div>
          </div>

          {/* Links: each column is a leg of the chart, titled as a data label
              with a red tick, and its entries threaded on a rope rule. */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <p className="data-type flex items-center gap-2 text-[12px] font-bold uppercase text-white/80">
                <span aria-hidden="true" className="h-px w-5 bg-[#E8231A]" />
                {category}
              </p>
              <span aria-hidden="true" className="rope-rule mt-3 block opacity-60" />
              <ul className="mt-4 space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href || "#"}
                      className="group inline-flex items-center gap-2 text-sm text-white/65 transition-colors hover:text-white"
                    >
                      <span
                        aria-hidden="true"
                        className="h-1 w-1 shrink-0 rounded-full bg-[#E8231A]/50 transition-colors group-hover:bg-[#E8231A]"
                      />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Instrument row: a rope edge, then the year and legal links as chart
            data, mirroring the dashboard footer. */}
        <span aria-hidden="true" className="rope-rule mt-14 block opacity-60" />
        <div className="mt-6 flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="data-type text-[12px] uppercase text-white/55">
            © {new Date().getFullYear()} PPIA Auckland · {t("footer.copyright")}
          </p>
          <div className="data-type flex gap-6 text-[12px] uppercase">
            <Link href="/legal/privacy-policy" className="text-white/55 transition-colors hover:text-white">
              {t("footer.privacy")}
            </Link>
            <Link href="/legal/terms-of-service" className="text-white/55 transition-colors hover:text-white">
              {t("footer.terms")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
