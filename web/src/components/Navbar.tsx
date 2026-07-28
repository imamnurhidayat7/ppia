"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { Menu, X, ChevronDown, User, LogOut } from "lucide-react";
import GlobalSearch from "./GlobalSearch";
import { useLanguage } from "@/lib/language-context";
import { useMenuItems } from "@/lib/hooks/use-menu-items";
import type { MenuItem } from "@/lib/api-types";

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

  // Use CMS menu items if available, otherwise fall back to hardcoded items
  const navItems = useMemo<MenuItem[]>(() => {
    if (menu?.items && menu.enabled !== false) {
      const items = language === "id" ? menu.items.id : menu.items.en;
      if (items && items.length > 0) return items;
    }
    return getNavItems(language);
  }, [menu, language]);

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
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#0D1B33] shadow-lg shadow-black/20 border-b border-white/10'
          : 'bg-[#0D1B33]/95 backdrop-blur-md'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between" ref={dropdownRef}>
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
                  <div className="absolute top-full left-0 mt-3 w-52 bg-[#0D1B33] border border-white/10 rounded-xl shadow-2xl shadow-black/40 overflow-hidden">
                    {item.children.map((child) => (
                      <Link
                        key={child.href || child.label}
                        href={child.href || "#"}
                        onClick={() => setDropdown(null)}
                        className="flex items-center px-4 py-3 text-[#94A3B8] hover:text-white hover:bg-white/5 text-sm transition-colors border-b border-white/5 last:border-0"
                      >
                        <span className="w-1 h-1 rounded-full bg-[#E8231A] mr-3 shrink-0" />
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
                <div className="absolute top-full right-0 mt-3 w-56 bg-[#0D1B33] border border-white/10 rounded-xl shadow-2xl shadow-black/40 overflow-hidden">
                  <div className="px-4 py-3 border-b border-white/10">
                    <p className="text-white font-medium truncate">{user.name}</p>
                    <p className="text-[#64748B] text-xs truncate">{user.email}</p>
                    {user.role && (
                      <span className="inline-block mt-1 text-xs bg-[#E8231A]/20 text-[#E8231A] px-2 py-0.5 rounded">
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
                        className="flex items-center px-4 py-2.5 text-[#94A3B8] hover:text-white hover:bg-white/5 text-sm transition-colors"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <span className="w-1 h-1 rounded-full bg-[#E8231A] mr-3 shrink-0" />
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
                className="bg-[#E8231A] hover:bg-[#C41E16] text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors duration-200 shadow-lg shadow-red-900/30"
              >
                {language === "id" ? "Bergabung" : "Join Us"}
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
        <div className="md:hidden bg-[#0D1B33]/98 backdrop-blur-md border-t border-white/5">
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
                          className="text-[#64748B] hover:text-white text-sm py-2 flex items-center gap-2 transition-colors"
                        >
                          <span className="w-1 h-1 rounded-full bg-[#E8231A] shrink-0" />
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
                    <p className="text-[#64748B] text-xs truncate">{user.email}</p>
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
                <Link href="/register" className="bg-[#E8231A] text-white text-sm font-semibold px-5 py-2.5 rounded-lg text-center">Join Us</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
