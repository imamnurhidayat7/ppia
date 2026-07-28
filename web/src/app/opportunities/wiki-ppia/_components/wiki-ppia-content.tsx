"use client";

/**
 * Wiki PPIA — the long-form reference for living and studying in Auckland.
 *
 * This is a documentation site, not a marketing page, so it uses the layout
 * documentation sites converged on: a persistent index on the left, one column
 * of content on the right, and search across everything.
 *
 * What the previous version got wrong, and why this file looks different:
 *
 * • Answers were behind a small red "Show answer" text link sitting in a
 *   right-hand column, while the question sat in a left-hand column. People
 *   click the question. Now the whole question row is the control.
 *
 * • Forty topics across eight sections with no index. The sections already had
 *   `id` and `scroll-mt`, but nothing linked to them, so the only way through
 *   the page was scrolling. There is now a sticky index with scroll spy.
 *
 * • "Copy link" wrote a URL ending in `#about-3`, but no element ever carried
 *   that id, so every copied link landed at the top of the page. Item ids are
 *   real now, and a matching hash opens and scrolls to that topic on load.
 *
 * • Each section stored an `icon` and a `color` that nothing read. Both are used
 *   here and are editable in the CMS.
 *
 * Answers are authored as rich text and rendered with `dangerouslySetInnerHTML`.
 * That is pre-existing behaviour and unchanged here, but it means the wiki
 * trusts whatever an admin saves — worth sanitising at some point.
 */

import { useState, useEffect, useMemo, useRef, useCallback, createElement } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PageHeader from "@/components/PageHeader";
import { api } from "@/lib/api";
import {
  ArrowRight,
  ArrowUp,
  BookOpen,
  Car,
  Check,
  ChevronDown,
  Clock,
  FileText,
  Globe,
  Heart,
  HeartPulse,
  Home,
  Landmark,
  Link2,
  ListTree,
  MapPin,
  Plane,
  Search,
  ShoppingBag,
  Sun,
  Users,
  X,
  Mail,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { sanitizeHtml } from "@/lib/sanitize-html";

interface WikiItem {
  q: string;
  a: string;
}

interface WikiSection {
  id: string;
  label: string;
  title: string;
  icon?: string;
  color?: string;
  items: WikiItem[];
}

interface WikiMeta {
  reviewedLabel?: string;
  reviewedValue?: string;
  reviewedNote?: string;
  contactEmail?: string;
  contactText?: string;
  credit?: string;
}

interface Content {
  header: {
    label: string;
    title: string;
    titleAccent: string;
    description: string;
    breadcrumbs: { label: string }[];
  };
  meta?: WikiMeta;
  sections: WikiSection[];
}

const ACCENT = "#E8231A";

const ICONS: Record<string, LucideIcon> = {
  BookOpen,
  Plane,
  MapPin,
  FileText,
  Car,
  ShoppingBag,
  Sun,
  Users,
  Home,
  Landmark,
  HeartPulse,
  Heart,
  Globe,
};

function iconFor(name?: string): LucideIcon {
  return (name && ICONS[name]) || BookOpen;
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function itemMatches(item: WikiItem, query: string): boolean {
  if (!query) return true;
  return `${item.q} ${stripHtml(item.a)}`.toLowerCase().includes(query);
}

/**
 * Wrap every occurrence of `query` in a <mark>.
 *
 * `String.split` with one capture group yields alternating [text, match, text,
 * match, …], so odd indices are the matches. The previous version called
 * `regex.test(part)` on a `/g` regex, which advances `lastIndex` between calls
 * and therefore returned true and false alternately for identical input — some
 * matches were highlighted and others silently were not.
 */
function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const safe = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${safe})`, "ig"));
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="rounded bg-amber-200/70 px-0.5 text-[#0F1B33]">
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

/** Rough reading time. Only surfaced when it is actually worth knowing. */
function readMinutes(item: WikiItem): number {
  const words = `${item.q} ${stripHtml(item.a)}`.split(/\s+/).length;
  return Math.max(1, Math.round(words / 90));
}

function itemKey(sectionId: string, index: number): string {
  return `${sectionId}--${index}`;
}

// ─── Topic ───────────────────────────────────────────────────────────────────

function Topic({
  item,
  anchor,
  color,
  query,
  isOpen,
  onToggle,
  onCopy,
  copied,
}: {
  item: WikiItem;
  anchor: string;
  color: string;
  query: string;
  isOpen: boolean;
  onToggle: () => void;
  onCopy: () => void;
  copied: boolean;
}) {
  const minutes = readMinutes(item);
  const panelId = `${anchor}-panel`;

  return (
    <article id={anchor} className="scroll-mt-24 border-t border-[#EEF2F7] first:border-t-0">
      {/* The whole row toggles. A wide hit area matters here because the list is
          long and the questions are the only thing people aim at. */}
      <h3>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-controls={panelId}
          className="group flex w-full items-start gap-3.5 py-4 text-left transition-colors"
        >
          <span
            aria-hidden="true"
            className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-all duration-300"
            style={
              isOpen
                ? { background: color, color: "#fff" }
                : { background: "rgba(148,163,184,0.14)", color: "#94A3B8" }
            }
          >
            <ChevronDown
              size={14}
              className={`transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
            />
          </span>
          <span className="min-w-0 flex-1">
            <span
              className={`block text-[15px] font-semibold leading-snug transition-colors ${
                isOpen ? "text-[#0F1B33]" : "text-[#1E293B] group-hover:text-[#0F1B33]"
              }`}
            >
              {highlightMatch(item.q, query)}
            </span>
          </span>
        </button>
      </h3>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={panelId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="pb-5 pl-[2.375rem] pr-1">
              <div
                className="wiki-content text-[14.5px] leading-relaxed text-[#475569] [&_a]:font-medium [&_a]:text-[#E8231A] [&_a]:underline [&_li]:mt-1 [&_ol]:mt-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mt-2 [&_p:first-child]:mt-0 [&_strong]:text-[#0F1B33] [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.a) }}
              />

              <div className="mt-4 flex items-center gap-4 text-[11px] text-[#94A3B8]">
                {/* A one-minute estimate on a two-sentence answer is noise, so
                    it only appears once there is something to budget for. */}
                {minutes > 1 && (
                  <span className="inline-flex items-center gap-1.5">
                    <Clock size={11} />
                    {minutes} min read
                  </span>
                )}
                <button
                  type="button"
                  onClick={onCopy}
                  className="inline-flex items-center gap-1.5 font-medium transition-colors hover:text-[#0F1B33]"
                >
                  {copied ? <Check size={11} /> : <Link2 size={11} />}
                  {copied ? "Link copied" : "Copy link to this answer"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
}

// ─── Section ─────────────────────────────────────────────────────────────────

function SectionCard({
  section,
  number,
  query,
  openItems,
  onToggleItem,
  onCopyItem,
  copiedKey,
}: {
  section: WikiSection;
  number: number;
  query: string;
  openItems: Record<string, boolean>;
  onToggleItem: (key: string) => void;
  onCopyItem: (key: string) => void;
  copiedKey: string | null;
}) {
  const color = section.color || ACCENT;
  const icon = iconFor(section.icon);

  return (
    <motion.section
      id={section.id}
      data-wiki-section={section.id}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="scroll-mt-24 overflow-hidden rounded-2xl border border-[#E7EDF4] bg-white"
    >
      <div aria-hidden="true" className="h-1" style={{ background: color }} />

      <header className="flex items-start gap-4 border-b border-[#EEF2F7] px-6 py-5 sm:px-8">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
          style={{ background: `${color}16`, boxShadow: `inset 0 0 0 1px ${color}2E` }}
        >
          {createElement(icon, { size: 19, strokeWidth: 2.1, style: { color } })}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <span className="text-[11px] font-bold tabular-nums tracking-[0.14em] text-[#CBD5E1]">
              {String(number).padStart(2, "0")}
            </span>
            <span
              className="truncate text-[11px] font-bold uppercase tracking-[0.16em]"
              style={{ color }}
            >
              {section.label}
            </span>
          </div>
          <h2
            className="mt-1.5 text-lg font-black leading-snug tracking-[-0.01em] text-[#0F1B33] sm:text-xl"
            style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
          >
            {highlightMatch(section.title, query)}
          </h2>
        </div>
        <span
          className="shrink-0 self-start rounded-full px-2.5 py-1 text-[11px] font-semibold tabular-nums"
          style={{ background: `${color}14`, color }}
        >
          {section.items.length}
        </span>
      </header>

      <div className="px-6 py-2 sm:px-8">
        {section.items.map((item, idx) => {
          const key = itemKey(section.id, idx);
          return (
            <Topic
              key={key}
              item={item}
              anchor={key}
              color={color}
              query={query}
              isOpen={!!openItems[key]}
              onToggle={() => onToggleItem(key)}
              onCopy={() => onCopyItem(key)}
              copied={copiedKey === key}
            />
          );
        })}
      </div>
    </motion.section>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function WikiPPIAPage() {
  const [content, setContent] = useState<Content | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [showTop, setShowTop] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api
      .getPageBySlug("opportunities/wiki-ppia")
      .then((res) => {
        const value = res?.page?.content as Content | undefined;
        if (value?.header && Array.isArray(value.sections)) setContent(value);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 200);
    return () => clearTimeout(timer);
  }, [search]);

  const query = debouncedSearch;

  const visibleSections = useMemo(() => {
    if (!content) return [] as WikiSection[];
    if (!query) return content.sections;
    return content.sections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => itemMatches(item, query)),
      }))
      .filter((section) => section.items.length > 0);
  }, [content, query]);

  const matchCount = useMemo(
    () => visibleSections.reduce((sum, s) => sum + s.items.length, 0),
    [visibleSections]
  );
  const totalCount = useMemo(
    () => content?.sections.reduce((sum, s) => sum + s.items.length, 0) ?? 0,
    [content]
  );

  /**
   * Open the topic named in the URL fragment.
   *
   * Runs once the content is in, because the element cannot be scrolled to
   * before it exists. This is what makes "copy link" worth having.
   */
  useEffect(() => {
    if (!content) return;
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    setOpenItems((prev) => ({ ...prev, [hash]: true }));
    requestAnimationFrame(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [content]);

  /** Scroll spy for the sidebar index. */
  useEffect(() => {
    if (!content) return;
    const nodes = Array.from(
      document.querySelectorAll<HTMLElement>("[data-wiki-section]")
    );
    if (nodes.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) {
          setActiveSection(visible.target.getAttribute("data-wiki-section"));
        }
      },
      // The top band is excluded so a section counts as "current" only once it
      // has cleared the sticky header area.
      { rootMargin: "-96px 0px -65% 0px", threshold: 0 }
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [content, visibleSections.length]);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 900);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /** Cmd/Ctrl+K focuses search, matching the shortcut people already expect. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const toggleItem = useCallback((key: string) => {
    setOpenItems((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const copyItem = useCallback(async (key: string) => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/opportunities/wiki-ppia#${key}`
      );
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1800);
    } catch {
      setCopiedKey(null);
    }
  }, []);

  const expandAllVisible = useCallback(() => {
    const next: Record<string, boolean> = {};
    for (const section of visibleSections) {
      section.items.forEach((_, idx) => {
        next[itemKey(section.id, idx)] = true;
      });
    }
    setOpenItems((prev) => ({ ...prev, ...next }));
  }, [visibleSections]);

  const collapseAll = useCallback(() => setOpenItems({}), []);

  if (!content) return null;

  const meta = content.meta ?? {};
  const contactEmail = meta.contactEmail || "ppiauckland@gmail.com";
  const anyOpen = Object.values(openItems).some(Boolean);

  return (
    <div className="bg-[#F8FAFC]">
      <PageHeader {...content.header} />

      {/* ── Search ─────────────────────────────────────────────────── */}
      <section className="border-b border-[#E7EDF4] bg-white">
        <div className="mx-auto max-w-3xl px-6 py-10">
          <div className="group relative">
            <Search
              size={17}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8]"
            />
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search the wiki — try visa, IRD, AT Hop, halal"
              aria-label="Search the wiki"
              className="w-full rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] py-3.5 pl-11 pr-24 text-sm text-[#0F1B33] outline-none transition-all placeholder:text-[#94A3B8] focus:border-[#E8231A] focus:bg-white focus:ring-4 focus:ring-[#E8231A]/10"
            />
            <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
              {search ? (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className="rounded-lg p-1.5 text-[#94A3B8] transition-colors hover:bg-slate-100 hover:text-[#0F1B33]"
                >
                  <X size={14} />
                </button>
              ) : (
                <kbd className="hidden select-none rounded-md border border-[#E2E8F0] bg-white px-1.5 py-0.5 font-sans text-[10px] font-semibold text-[#94A3B8] sm:block">
                  ⌘K
                </kbd>
              )}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-[#94A3B8]" aria-live="polite">
              {query
                ? `${matchCount} ${matchCount === 1 ? "topic" : "topics"} match “${query}”`
                : `${totalCount} topics across ${content.sections.length} sections`}
            </p>
            <div className="flex items-center gap-3 text-xs font-medium">
              <button
                type="button"
                onClick={expandAllVisible}
                className="text-[#64748B] transition-colors hover:text-[#0F1B33]"
              >
                Expand all
              </button>
              {anyOpen && (
                <>
                  <span aria-hidden="true" className="h-3 w-px bg-[#E2E8F0]" />
                  <button
                    type="button"
                    onClick={collapseAll}
                    className="text-[#64748B] transition-colors hover:text-[#0F1B33]"
                  >
                    Collapse all
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Index + content ────────────────────────────────────────── */}
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex gap-10">
          {/*
            Persistent index. Forty topics is far too many to navigate by
            scrolling, and the section anchors already existed — nothing linked
            to them.
          */}
          <aside className="hidden w-60 shrink-0 lg:block">
            <div className="sticky top-24">
              <p className="mb-3 flex items-center gap-2 px-3 text-[11px] font-bold uppercase tracking-[0.16em] text-[#94A3B8]">
                <ListTree size={13} />
                On this page
              </p>
              <nav aria-label="Wiki sections" className="space-y-0.5">
                {visibleSections.map((section) => {
                  const color = section.color || ACCENT;
                  const Icon = iconFor(section.icon);
                  const isActive = activeSection === section.id;
                  return (
                    <a
                      key={section.id}
                      href={`#${section.id}`}
                      aria-current={isActive ? "true" : undefined}
                      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] leading-snug transition-colors ${
                        isActive
                          ? "bg-white font-semibold text-[#0F1B33] shadow-[0_1px_2px_rgba(15,27,51,0.06)]"
                          : "text-[#64748B] hover:bg-white/70 hover:text-[#0F1B33]"
                      }`}
                    >
                      <Icon
                        size={14}
                        className="shrink-0"
                        style={{ color: isActive ? color : "#94A3B8" }}
                      />
                      <span className="min-w-0 flex-1 truncate">{section.label}</span>
                      <span className="shrink-0 text-[11px] tabular-nums text-[#CBD5E1]">
                        {section.items.length}
                      </span>
                    </a>
                  );
                })}
              </nav>
            </div>
          </aside>

          <main className="min-w-0 flex-1 space-y-5">
            {visibleSections.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-[#CBD5E1] bg-white p-12 text-center">
                <Search size={26} className="mx-auto mb-3 text-[#CBD5E1]" />
                <p
                  className="text-xl font-black text-[#0F1B33]"
                  style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
                >
                  Nothing matched “{query}”
                </p>
                <p className="mx-auto mt-2 max-w-sm text-sm text-[#64748B]">
                  Try a shorter or more general word — or email us and we will add it.
                </p>
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="mt-6 rounded-full bg-[#E8231A] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#C41E16]"
                >
                  Clear search
                </button>
              </div>
            ) : (
              visibleSections.map((section) => (
                <SectionCard
                  key={section.id}
                  section={section}
                  number={content.sections.findIndex((s) => s.id === section.id) + 1}
                  query={query}
                  openItems={openItems}
                  onToggleItem={toggleItem}
                  onCopyItem={copyItem}
                  copiedKey={copiedKey}
                />
              ))
            )}
          </main>
        </div>
      </div>

      {/* ── Footer note ────────────────────────────────────────────── */}
      <footer className="border-t border-[#E7EDF4] bg-white">
        <div className="mx-auto grid max-w-6xl items-center gap-6 px-6 py-12 md:grid-cols-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#94A3B8]">
              {meta.reviewedLabel || "Last reviewed"}
            </p>
            <p
              className="mt-1.5 text-xl font-black text-[#0F1B33]"
              style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
            >
              {meta.reviewedValue || "—"}
            </p>
            {meta.reviewedNote && (
              <p className="mt-2 max-w-md text-xs leading-relaxed text-[#64748B]">
                {meta.reviewedNote}
              </p>
            )}
          </div>

          <a
            href={`mailto:${contactEmail}?subject=${encodeURIComponent(
              `Wiki update for ${content.header.title} ${content.header.titleAccent}`.trim()
            )}`}
            className="group flex items-center gap-3 justify-self-start text-[#0F1B33] transition-colors hover:text-[#E8231A] md:justify-self-end"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#CBD5E1] transition-colors group-hover:border-[#E8231A]">
              <Mail size={16} />
            </span>
            <span className="text-sm font-semibold">
              {meta.contactText || "Found something outdated? Tell us."}
            </span>
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
          </a>
        </div>
        {meta.credit && (
          <div className="mx-auto max-w-6xl px-6 pb-10 text-xs text-[#94A3B8]">{meta.credit}</div>
        )}
      </footer>

      {/* Back to top — the page is long enough that scrolling back is a chore */}
      <AnimatePresence>
        {showTop && (
          <motion.button
            type="button"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.2 }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label="Back to top"
            className="fixed bottom-6 right-6 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-[#0F1B33] text-white shadow-[0_12px_32px_-10px_rgba(15,27,51,0.6)] transition-colors hover:bg-[#E8231A]"
          >
            <ArrowUp size={17} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
