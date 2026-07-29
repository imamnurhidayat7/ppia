"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { Menu, X, ChevronDown, User, LogOut } from "lucide-react";
import GlobalSearch from "./GlobalSearch";
import { useLanguage } from "@/lib/language-context";
import { useMenuItems } from "@/lib/hooks/use-menu-items";
import { useHasElections } from "@/lib/hooks/use-has-elections";
import type { MenuItem } from "@/lib/api-types";

/** A nav entry points at PEMIRA if it, or any of its children, links to /pemira. */
function isPemiraItem(item: MenuItem): boolean {
  if (item.href === "/pemira") return true;
  return (item.children ?? []).some((child) => child.href === "/pemira");
}

const getNavItems = (lang: string) => lang === "id" ? navItemsId : navItemsEn;

const navItemsEn = [
  {
    label: "About",
    href: "#about",
    children: [
      { label: "Ambition & Action", href: "/about/ambition-action" },
      { label: "Cabinet", href: "/about/cabinet" },
      { label: "AD & ART", href: "/about/ad-art" },
      { label: "Historical Archive", href: "/about/historical-archive" },
    ],
  },
  {
    label: "Activities",
    href: "#activities",
    children: [
      { label: "Events", href: "/activities/events" },
      { label: "News & Articles", href: "/activities/news-articles" },
      { label: "Research Corner", href: "/activities/research-corner" },
    ],
  },
  {
    label: "Opportunities",
    href: "#opportunities",
    children: [
      { label: "Wiki PPIA", href: "/opportunities/wiki-ppia" },
      { label: "Career Info", href: "/opportunities/career-info" },
      { label: "Scholarship", href: "/opportunities/scholarship" },
      { label: "Partnership", href: "/opportunities/partnership" },
    ],
  },
  { label: "Contact", href: "/contact" },
  { label: "PEMIRA", href: "/pemira" },
];

const navItemsId = [
  {
    label: "Tentang",
    href: "#about",
    children: [
      { label: "Visi & Misi", href: "/about/ambition-action" },
      { label: "Pengurus", href: "/about/cabinet" },
      { label: "AD & ART", href: "/about/ad-art" },
      { label: "Arsip Sejarah", href: "/about/historical-archive" },
    ],
  },
  {
    label: "Aktivitas",
    href: "#activities",
    children: [
      { label: "Acara", href: "/activities/events" },
      { label: "Berita & Artikel", href: "/activities/news-articles" },
      { label: "Pojok Riset", href: "/activities/research-corner" },
    ],
  },
  {
    label: "Kesempatan",
    href: "#opportunities",
    children: [
      { label: "Wiki PPIA", href: "/opportunities/wiki-ppia" },
      { label: "Info Karir", href: "/opportunities/career-info" },
      { label: "Beasiswa", href: "/opportunities/scholarship" },
      { label: "Kemitraan", href: "/opportunities/partnership" },
    ],
  },
  { label: "Anggota", href: "/register" },
  { label: "Kontak", href: "/contact" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdown, setDropdown] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { user, isAuthenticated, logout, isLoading } = useAuth();
  const { language } = useLanguage();
  const { menu } = useMenuItems("header_main");
  const hasElections = useHasElections();

  // Use CMS menu items if available, otherwise fall back to hardcoded items.
  // PEMIRA is dropped once we have confirmed there are no elections, so deleting
  // the last election also removes it from the header (whichever source the
  // menu comes from).
  const navItems = useMemo<MenuItem[]>(() => {
    const source =
      menu?.items && menu.enabled !== false
        ? (language === "id" ? menu.items.id : menu.items.en) || getNavItems(language)
        : getNavItems(language);
    const items = source.length > 0 ? source : getNavItems(language);
    return hasElections === false ? items.filter((item) => !isPemiraItem(item)) : items;
  }, [menu, language, hasElections]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdown(null);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav
      className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'border-b border-white/10 bg-[#071321] shadow-lg shadow-black/20'
          : 'bg-[#071321]/95 backdrop-blur-md'
      }`}
    >
      {/*
        Faint navigation-chart grid behind the bar, the same texture the
        masthead and footer carry, so the header reads as part of the maritime
        surface rather than a flat strip. It fades out below the bar.
      */}
      <div
        aria-hidden="true"
        className="sea-chart-light pointer-events-none absolute inset-0 opacity-[0.04]"
      />
      <div className="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-4" ref={dropdownRef}>
        {/* Logo */}
        <Link href="/" className="flex items-center group">
          <Image
            src="/Logo-PPIA-2025-White.png"
            alt="PPIA Auckland"
            width={120}
            height={48}
            style={{ height: 40, width: "auto" }}
            priority
          />
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {navItems.map((item) =>
            item.children ? (
              <div key={item.label} className="relative">
                <button
                  onClick={() => setDropdown(dropdown === item.label ? null : item.label)}
                  className="flex items-center gap-1 text-[#94A3B8] hover:text-white text-sm font-medium transition-colors duration-200 relative group"
                >
                  {item.label}
                  <ChevronDown
                    size={14}
                    className={`transition-transform duration-200 ${dropdown === item.label ? "rotate-180" : ""}`}
                  />
                  <span className="absolute -bottom-1 left-0 w-0 h-px bg-[#E8231A] transition-all duration-300 group-hover:w-full" />
                </button>

                {dropdown === item.label && (
                  <div className="animate-fade-in absolute left-0 top-full mt-3 w-56 overflow-hidden rounded-xl border border-white/10 bg-[#071321] shadow-2xl shadow-black/40">
                    {item.children.map((child) => (
                      <Link
                        key={child.href || child.label}
                        href={child.href || "#"}
                        onClick={() => setDropdown(null)}
                        className="group flex items-center gap-3 border-b border-white/5 px-4 py-3 text-sm text-[#94A3B8] transition-colors last:border-0 hover:bg-white/5 hover:text-white"
                      >
                        <span className="h-1 w-1 shrink-0 rounded-full bg-[#E8231A]/60 transition-colors group-hover:bg-[#E8231A]" />
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Link
                key={item.href || item.label}
                href={item.href || "#"}
                className="text-[#94A3B8] hover:text-white text-sm font-medium transition-colors duration-200 relative group"
              >
                {item.label}
                <span className="absolute -bottom-1 left-0 w-0 h-px bg-[#E8231A] transition-all duration-300 group-hover:w-full" />
              </Link>
            )
          )}
        </div>

        {/* Search & CTA */}
        <div className="hidden md:flex items-center gap-3">
          <GlobalSearch />
          {isAuthenticated && user ? (
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 text-[#94A3B8] hover:text-white text-sm font-medium transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-[#E8231A] flex items-center justify-center overflow-hidden shrink-0">
                  {user.avatar ? (
                    <Image
                      src={user.avatar}
                      alt={user.name}
                      width={32}
                      height={32}
                      className="rounded-full object-cover w-full h-full"
                    />
                  ) : (
                    <User size={16} className="text-white" />
                  )}
                </div>
                <span className="max-w-[100px] truncate">{user.name || user.username}</span>
                <ChevronDown size={14} className={`transition-transform ${userMenuOpen ? "rotate-180" : ""}`} />
              </button>

              {userMenuOpen && (
                <div className="absolute top-full right-0 mt-3 w-56 bg-[#071321] border border-white/10 rounded-xl shadow-2xl shadow-black/40 overflow-hidden">
                  <div className="px-4 py-3 border-b border-white/10">
                    <p className="text-white font-medium truncate">{user.name}</p>
                    <p className="text-[#94A3B8] text-xs truncate">{user.email}</p>
                    {user.role && (
                      <span className="data-type mt-1.5 inline-block rounded-md bg-[#E8231A]/20 px-2 py-0.5 text-[12px] font-bold uppercase text-[#FF8A80]">
                        {user.role}
                      </span>
                    )}
                  </div>
                  <div className="py-1">
                    <Link
                      href="/dashboard"
                      className="flex items-center px-4 py-2.5 text-[#94A3B8] hover:text-white hover:bg-white/5 text-sm transition-colors"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <User size={16} className="mr-3" />
                      Dashboard
                    </Link>
                    {(user.role === "SUPER_ADMIN" ) && (
                      <Link
                        href="/dashboard/admin"
                        className="group flex items-center gap-3 px-4 py-2.5 text-[#94A3B8] hover:text-white hover:bg-white/5 text-sm transition-colors"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <span className="h-1 w-1 shrink-0 rounded-full bg-[#E8231A]/60 transition-colors group-hover:bg-[#E8231A]" />
                        Admin Panel
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        logout();
                        setUserMenuOpen(false);
                      }}
                      className="flex items-center w-full px-4 py-2.5 text-[#94A3B8] hover:text-white hover:bg-white/5 text-sm transition-colors"
                    >
                      <LogOut size={16} className="mr-3" />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : !isLoading && (
            <>
              <Link href="/login" className="text-[#94A3B8] hover:text-white text-sm font-medium transition-colors">
                {language === "id" ? "Masuk" : "Login"}
              </Link>
              <Link
                href="/register"
                className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-[#E8231A] px-5 py-2 text-sm font-semibold text-white shadow-[0_10px_30px_-12px_rgba(232,35,26,0.8)] transition-transform duration-300 hover:-translate-y-0.5"
              >
                {/* The same sheen wipe the hero's primary CTA carries. */}
                <span
                  aria-hidden="true"
                  className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full"
                />
                <span className="relative">{language === "id" ? "Bergabung" : "Join Us"}</span>
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden text-white p-2"
          aria-label="Toggle menu"
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-[#071321]/98 backdrop-blur-md border-t border-white/5">
          <div className="px-6 py-4 flex flex-col gap-1">
            {navItems.map((item) =>
              item.children ? (
                <div key={item.label}>
                  <button
                    onClick={() => setMobileOpen(mobileOpen === item.label ? null : item.label)}
                    className="flex items-center justify-between w-full text-[#94A3B8] hover:text-white text-sm font-medium py-2.5 transition-colors"
                  >
                    {item.label}
                    <ChevronDown size={14} className={`transition-transform ${mobileOpen === item.label ? "rotate-180" : ""}`} />
                  </button>
                  {mobileOpen === item.label && (
                    <div className="pl-4 flex flex-col gap-1 mb-1">
                      {item.children.map((child) => (
                        <Link
                          key={child.href || child.label}
                          href={child.href || "#"}
                          onClick={() => setMenuOpen(false)}
                          className="group flex items-center gap-2 py-2 text-sm text-[#94A3B8] transition-colors hover:text-white"
                        >
                          <span className="h-1 w-1 shrink-0 rounded-full bg-[#E8231A]/60 transition-colors group-hover:bg-[#E8231A]" />
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  key={item.href || item.label}
                  href={item.href || "#"}
                  onClick={() => setMenuOpen(false)}
                  className="text-[#94A3B8] hover:text-white text-sm font-medium py-2.5 transition-colors"
                >
                  {item.label}
                </Link>
              )
            )}
            {isAuthenticated && user ? (
              <div className="pt-3 border-t border-white/10 flex flex-col gap-3 mt-2">
                <div className="flex items-center gap-3 px-2">
                  <div className="w-10 h-10 rounded-full bg-[#E8231A] flex items-center justify-center">
                    {user.avatar ? (
                      <Image src={user.avatar} alt={user.name} width={40} height={40} className="rounded-full" />
                    ) : (
                      <User size={20} className="text-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{user.name}</p>
                    <p className="text-[#94A3B8] text-xs truncate">{user.email}</p>
                  </div>
                </div>
                <Link href="/dashboard" className="text-[#94A3B8] hover:text-white text-sm font-medium py-2">Dashboard</Link>
                {(user.role === "SUPER_ADMIN" ) && (
                  <Link href="/dashboard/admin" className="text-[#94A3B8] hover:text-white text-sm font-medium py-2">Admin Panel</Link>
                )}
                <button onClick={logout} className="text-left text-[#94A3B8] hover:text-white text-sm font-medium py-2">Logout</button>
              </div>
            ) : (
              <div className="pt-3 border-t border-white/10 flex flex-col gap-3 mt-2">
                <Link href="/login" className="text-[#94A3B8] hover:text-white text-sm font-medium">Login</Link>
                <Link href="/register" className="rounded-full bg-[#E8231A] px-5 py-2.5 text-center text-sm font-semibold text-white shadow-[0_10px_30px_-12px_rgba(232,35,26,0.8)] transition-colors hover:bg-[#C41E16]">Join Us</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
