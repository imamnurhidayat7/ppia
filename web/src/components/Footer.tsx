"use client";

import { useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import NewsletterForm from "./NewsletterForm";
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
    <footer className="bg-[#0D1B33] text-white">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="inline-block mb-5">
              <Image
                src="/Logo-PPIA-2025-White.png"
                alt="PPIA Auckland"
                width={140}
                height={56}
                style={{ height: 48, width: "auto" }}
              />
            </Link>
            <p className="text-[#64748B] text-sm leading-relaxed max-w-xs">
              {t("footer.tagline")}
            </p>
            <div className="flex items-center gap-3 mt-6">
              {socials.map((s) => (
                <Link
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  className="w-9 h-9 rounded-lg bg-white/5 hover:bg-[#E8231A] flex items-center justify-center transition-colors duration-200"
                >
                  {s.svg}
                </Link>
              ))}
            </div>
          </div>

          {/* Newsletter */}
          <div className="lg:col-span-2">
            <NewsletterForm />
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <p className="font-display font-semibold text-sm mb-4">{category}</p>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href || "#"}
                      className="text-[#64748B] hover:text-white text-sm transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-[#64748B] text-xs">
          <p>© {new Date().getFullYear()} PPIA Auckland. {t("footer.copyright")}</p>
          <div className="flex gap-6">
            <Link href="/legal/privacy-policy" className="hover:text-white transition-colors">{t("footer.privacy")}</Link>
            <Link href="/legal/terms-of-service" className="hover:text-white transition-colors">{t("footer.terms")}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
