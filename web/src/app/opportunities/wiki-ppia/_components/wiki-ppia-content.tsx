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
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import PageHeader from "@/components/PageHeader";
import WaveTransition from "@/components/sections/WaveTransition";
import { PublicPageSkeleton } from "@/components/skeletons/public-skeletons";
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
  Compass,
  Landmark,
  Link2,
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

/** Waterline seam colours — the ends of the sea-deep / sea-shore gradients. */
const DEEP = "#0B1C2E";
const SHORE = "#FFFFFF";

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
  number,
  showRule,
  color,
  query,
  isOpen,
  onToggle,
  onCopy,
  copied,
}: {
  item: WikiItem;
  anchor: string;
  /** Position within its section, set in the data face like a log entry. */
  number: string;
  /** Rope hairline above the row — omitted on the first row of a section. */
  showRule: boolean;
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
    <article id={anchor} className="scroll-mt-24">
      {showRule && <span aria-hidden="true" className="rope-rule block opacity-70" />}
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
            <span className="data-type mb-1 block text-[12px] uppercase ink-muted">{number}</span>
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
                className="wiki-content text-[14.5px] leading-relaxed text-[#475569] [&_a]:font-medium [&_a]:accent-label [&_a]:underline [&_li]:mt-1 [&_ol]:mt-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mt-2 [&_p:first-child]:mt-0 [&_strong]:text-[#0F1B33] [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.a) }}
              />

              <div className="data-type mt-4 flex items-center gap-4 text-[12px] uppercase ink-muted">
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
      className="chart-paper scroll-mt-24 overflow-hidden rounded-[5px] border border-[#DCE7F1] transition-shadow duration-300 hover:shadow-[0_28px_70px_-30px_rgba(7,19,33,0.42)]"
    >
      <div aria-hidden="true" className="h-[3px]" style={{ background: color }} />

      <header className="flex items-start gap-4 px-6 py-5 sm:px-8">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white"
          style={{ boxShadow: `inset 0 0 0 1px ${color}33, 0 0 0 4px ${color}0F` }}
        >
          {createElement(icon, { size: 19, strokeWidth: 2.1, style: { color } })}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <span className="data-type text-[12px] font-bold uppercase ink-muted">
              {String(number).padStart(2, "0")}
            </span>
            <span
              className="data-type truncate text-[12px] font-bold uppercase"
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
          className="data-type shrink-0 self-start rounded-[3px] px-2 py-0.5 text-[12px] font-bold uppercase"
          style={{ background: `${color}14`, color }}
        >
          {section.items.length}
        </span>
      </header>

      <span aria-hidden="true" className="rope-rule mx-6 block opacity-70 sm:mx-8" />

      <div className="px-6 py-2 sm:px-8">
        {section.items.map((item, idx) => {
          const key = itemKey(section.id, idx);
          return (
            <Topic
              key={key}
              item={item}
              anchor={key}
              number={String(idx + 1).padStart(2, "0")}
              showRule={idx > 0}
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

// ─── Section index ───────────────────────────────────────────────────────────

/**
 * The left-hand index, drawn as a plotted course.
 *
 * Two earlier attempts failed for the same underlying reason. The first was
 * bare words on the page background: no surface, hover a faint tint, so it read
 * as a caption and nobody tried clicking it. The second added a panel and put
 * every section icon in a bordered tile — which is the stock documentation
 * sidebar, an icon-in-a-box per row, clean and completely anonymous. Clean is
 * the floor, not the achievement.
 *
 * So this version is built around one idea instead of decorated around none:
 * the index is a voyage down the page, and the reader is the ship sailing it.
 *
 * A course runs down the gutter with a waypoint per section. The stretch already
 * sailed is drawn solid; the stretch ahead stays dashed, because it is intention
 * rather than history. The ship itself — a hand-drawn hull, sail and pennant in
 * the brand's red and navy, not an icon from a pack — rides the course line and
 * glides down to whichever leg the reader has reached, bobbing gently while it
 * sits there. Scrolling the article sails the ship; clicking a leg sends it.
 *
 * The rows are paper slats with a self-coloured edge, and the current one flips
 * to the deep-sea fill used by the masthead, so "you are here" is a change of
 * material rather than a tint.
 *
 * The labels are pills that drift left and right with the course rather than a
 * ruled column of boxes beside it, and each one carries a single figure: how
 * many topics are in that section. Everything else that used to be written here
 * — a leg number per row, a leg and topic count in the header, a position
 * readout at the base — said the same thing four times over a panel whose whole
 * job is eight labels. The hull marks the position; the base hairline fills as
 * the voyage progresses; no sentence is needed for either.
 *
 * Everything animated is gated on `prefers-reduced-motion`: the ship jumps
 * instead of gliding and stops bobbing, and the course still reads correctly
 * because the state is carried by colour and position, not by the motion.
 *
 * The section icons live on the cards in the content column, where they are
 * large enough to read; repeating them here bought nothing but a tile.
 */

/* ── Chart geometry ──────────────────────────────────────────────────────────
 *
 * The course is a curve, not a rule. A straight rail down a list is the stock
 * timeline decoration; a plotted course tacks. These three numbers are the whole
 * geometry: the gutter reserved to the left of the rows, the axis the course
 * meanders around, and how far it is allowed to swing off that axis.
 */
const CHART_GUTTER = 78;
const CHART_AXIS = 39;
const CHART_SWING = 18;

/**
 * Where leg `index` sits across the gutter.
 *
 * Two sines of unrelated periods, so the course wanders instead of zig-zagging
 * on a fixed beat — and because it is a pure function of the index it is stable
 * between server and client render (no `Math.random`, no hydration mismatch).
 */
function legX(index: number): number {
  return (
    CHART_AXIS +
    CHART_SWING * (Math.sin(index * 0.95 + 0.6) * 0.72 + Math.sin(index * 0.41 + 1.9) * 0.28)
  );
}

interface Leg {
  x: number;
  y: number;
}

/**
 * A smooth course through the waypoints.
 *
 * Cubic segments with vertical control handles: each leg leaves its waypoint
 * heading down and arrives at the next one heading down, so the curve bends
 * sideways between fixes without ever kinking at one.
 */
function coursePath(points: Leg[]): string {
  if (points.length === 0) return "";
  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let i = 1; i < points.length; i += 1) {
    const from = points[i - 1];
    const to = points[i];
    const handle = Math.max(8, (to.y - from.y) * 0.45);
    d +=
      ` C ${from.x.toFixed(2)} ${(from.y + handle).toFixed(2)},` +
      ` ${to.x.toFixed(2)} ${(to.y - handle).toFixed(2)},` +
      ` ${to.x.toFixed(2)} ${to.y.toFixed(2)}`;
  }
  return d;
}

/** Course extended past the first and last fix so it enters and leaves frame. */
function withApproaches(points: Leg[], tail: boolean): Leg[] {
  if (points.length === 0) return points;
  const first = points[0];
  const last = points[points.length - 1];
  const lead: Leg = { x: first.x - 3, y: first.y - 18 };
  return tail ? [lead, ...points, { x: last.x + 3, y: last.y + 18 }] : [lead, ...points];
}

/**
 * The ship. Drawn here rather than imported because the whole point is that it
 * belongs to this page — hull, two sails and a pennant on a small wake, in the
 * same navy and red as the rest of the brand.
 */
function ShipMark() {
  return (
    <svg
      width="38"
      height="38"
      viewBox="0 0 28 28"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {/* Wake, so the hull sits in water rather than floating in space. */}
      <path
        d="M4.5 22.4c2.9 1.5 5.9 1.5 8.8 0s5.9-1.5 8.8 0"
        stroke="#94A3B8"
        strokeWidth="1.1"
        strokeLinecap="round"
        opacity="0.75"
      />
      {/* Hull */}
      <path
        d="M5.6 17.6h16.8l-2.5 3.3c-.4.5-1 .8-1.6.8H9.7c-.6 0-1.2-.3-1.6-.8L5.6 17.6Z"
        fill="#0F1B33"
      />
      {/* Mast and pennant */}
      <path d="M14 4.6v12.2" stroke="#0F1B33" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M14.7 4.2l3.6 1.1-3.6 1.1V4.2Z" fill="#C41E16" />
      {/* Mainsail, filled brand red; foresail in paper white with an ink edge. */}
      <path d="M15.2 7.1c3.3 1.9 5.1 4.3 5.5 7.2h-5.5V7.1Z" fill="#C41E16" />
      <path
        d="M12.8 8c-2.5 1.6-3.9 3.7-4.3 6.3h4.3V8Z"
        fill="#FFFFFF"
        stroke="#0F1B33"
        strokeWidth="0.9"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function SectionIndex({
  sections,
  activeSection,
  onJump,
}: {
  sections: WikiSection[];
  activeSection: string | null;
  onJump: (event: React.MouseEvent<HTMLAnchorElement>, id: string) => void;
}) {
  const reduceMotion = useReducedMotion();
  const listRef = useRef<HTMLUListElement>(null);
  /** Measured waypoints, in the list's own coordinate space. */
  const [legs, setLegs] = useState<Leg[]>([]);
  const [chartHeight, setChartHeight] = useState(0);

  const total = sections.reduce((sum, section) => sum + section.items.length, 0);
  /** −1 while the reader is above the first section, which is a valid state. */
  const activeIndex = sections.findIndex((section) => section.id === activeSection);

  /**
   * Measure the waypoints.
   *
   * The rows are two lines of text inside a scrollable list, so their height is
   * not a constant we can multiply — it moves with the font, the label wrapping,
   * and the browser's zoom. Reading `offsetTop` off each row keeps every fix and
   * the hull on its own leg under all of that, and the ResizeObserver
   * re-measures when the panel or its contents change size.
   */
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const measure = () => {
      const rows = Array.from(list.querySelectorAll<HTMLLIElement>("li[data-leg]"));
      setLegs(rows.map((row, i) => ({ x: legX(i), y: row.offsetTop + row.offsetHeight / 2 })));
      setChartHeight(list.scrollHeight);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    return () => observer.disconnect();
  }, [sections.length]);

  const fullCourse = coursePath(withApproaches(legs, true));
  /** The stretch already sailed stops at the hull, so it grows as you read. */
  const sailedCourse =
    activeIndex > -1 ? coursePath(withApproaches(legs.slice(0, activeIndex + 1), false)) : "";

  // Where the hull sits, and how much it heels. Above the first section it is
  // still moored, just off the opening fix.
  const anchored = legs[0] ?? { x: CHART_AXIS, y: 24 };
  const berth = activeIndex > -1 ? legs[activeIndex] : undefined;
  // Moored above the first fix, but never so high that the hull rides up over
  // the panel's title block: half the mark is 19px, so 22 is the ceiling.
  const ship = berth ?? { x: anchored.x - 3, y: Math.max(22, anchored.y - 18) };
  const before = legs[Math.max(0, (activeIndex > -1 ? activeIndex : 0) - 1)] ?? ship;
  const after = legs[(activeIndex > -1 ? activeIndex : 0) + 1] ?? ship;
  /** Heel follows the tangent of the curve, clamped so it never looks capsized. */
  const heel = Math.max(
    -16,
    Math.min(16, ((after.x - before.x) / Math.max(24, after.y - before.y)) * 34)
  );

  return (
    <nav
      aria-label="Wiki sections"
      className="overflow-hidden rounded-[5px] border border-[#DCE7F1] shadow-[0_10px_24px_-18px_rgba(7,19,33,0.45)]"
    >
      {/* One line of chrome. The earlier version stated the leg count, the topic
          count, a per-row leg number and a position readout — four ways of
          saying the same thing in a panel whose job is eight labels. */}
      <div className="sea-deep relative flex items-center gap-2 px-4 py-2.5">
        <span
          aria-hidden="true"
          className="sea-chart-light pointer-events-none absolute inset-0 opacity-[0.07]"
        />
        <Compass size={13} aria-hidden="true" className="relative text-white/80" />
        <p className="data-type relative text-[12px] font-bold uppercase text-white">Course</p>
        <p className="data-type relative ml-auto text-[12px] uppercase text-white/70">
          {total} topics
        </p>
      </div>

      {/* The chart field is tinted so the white slats sit on top of it rather
          than dissolving into a white panel. */}
      <ul
        ref={listRef}
        className="relative max-h-[calc(100vh-15rem)] space-y-1.5 overflow-y-auto bg-[#EFF5FA] pb-5 pr-3 pt-7"
        style={{ paddingLeft: CHART_GUTTER }}
      >
        {/*
          The chart itself: one SVG so the course, its fixes and the hull share
          a coordinate space and cannot drift apart at odd zoom levels — which
          is exactly what happens when each marker is separately nudged with
          pixel offsets.
        */}
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0"
          width={CHART_GUTTER}
          height={chartHeight}
          viewBox={`0 0 ${CHART_GUTTER} ${Math.max(1, chartHeight)}`}
          fill="none"
        >
          {/* The whole course, dashed: the water ahead is a plan, not a wake. */}
          <path
            d={fullCourse}
            stroke="#0F1B33"
            strokeOpacity="0.2"
            strokeWidth="1.5"
            strokeDasharray="5 6"
            strokeLinecap="round"
          />
          {sailedCourse && (
            <path
              d={sailedCourse}
              stroke="#0F1B33"
              strokeOpacity="0.55"
              strokeWidth="2.25"
              strokeLinecap="round"
            />
          )}

          {legs.map((leg, i) => {
            const section = sections[i];
            if (!section) return null;
            const color = section.color || ACCENT;
            const isActive = i === activeIndex;
            const passed = activeIndex > -1 && i < activeIndex;

            // The hull stands in for the marker on the current leg: a diamond
            // under the ship only muddied both. What is left there is a berth
            // ring in the section's colour, wide enough to read around the hull.
            if (isActive) {
              return (
                <g key={section.id}>
                  <circle cx={leg.x} cy={leg.y} r="14" fill={color} fillOpacity="0.14" />
                  <circle
                    cx={leg.x}
                    cy={leg.y}
                    r="14"
                    fill="none"
                    stroke={color}
                    strokeOpacity="0.55"
                    strokeWidth="1.5"
                    strokeDasharray="3 4"
                  />
                </g>
              );
            }

            return (
              <g key={section.id} transform={`rotate(45 ${leg.x} ${leg.y})`}>
                {/* Halo in the field colour, so the dashes pass behind the fix
                    instead of through it. */}
                <rect
                  x={leg.x - 7}
                  y={leg.y - 7}
                  width="14"
                  height="14"
                  rx="1.5"
                  fill="#EFF5FA"
                />
                <rect
                  x={leg.x - 4}
                  y={leg.y - 4}
                  width="8"
                  height="8"
                  rx="1"
                  fill={passed ? "#0F1B33" : "#FFFFFF"}
                  fillOpacity={passed ? 0.55 : 1}
                  stroke={passed ? "none" : "#94A3B8"}
                  strokeWidth="1.5"
                />
              </g>
            );
          })}
        </svg>

        {/* The ship rides the curve: it glides to the current fix and heels into
            whichever way the course is turning there. */}
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 z-20 h-0 w-0"
          animate={{ x: ship.x, y: ship.y }}
          transition={
            reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 170, damping: 22 }
          }
        >
          <span className="absolute block -translate-x-1/2 -translate-y-1/2">
            <motion.span
              className="block drop-shadow-[0_3px_5px_rgba(7,19,33,0.28)]"
              animate={
                reduceMotion ? { rotate: heel } : { rotate: [heel - 4, heel + 4], y: [0.5, -1.5] }
              }
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { duration: 3.4, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }
              }
            >
              <ShipMark />
            </motion.span>
          </span>
        </motion.div>

        {sections.map((section, i) => {
          const isActive = activeSection === section.id;
          // Each label steps in and out with the course, so the left edge of the
          // list follows the curve instead of ruling a straight column beside
          // it. This is what stops the panel reading as a stack of boxes.
          const drift = (legs[i]?.x ?? CHART_AXIS) - (CHART_AXIS - CHART_SWING);

          return (
            <li key={section.id} data-leg={section.id} className="relative">
              <a
                href={`#${section.id}`}
                onClick={(event) => onJump(event, section.id)}
                aria-current={isActive ? "true" : undefined}
                style={{ marginLeft: drift }}
                /* The pill hugs its label, so both of its edges follow the
                   course. Filling the column would put every right edge back on
                   a ruled line and undo the drift. */
                className={`group inline-flex max-w-full items-center gap-2 rounded-full py-1.5 pl-4 pr-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C41E16]/50 ${
                  isActive
                    ? "sea-deep shadow-[0_6px_14px_-9px_rgba(7,19,33,0.65)]"
                    : /* Self-coloured edge rather than a grey hairline: the ink
                         of the page at low opacity, so the pill has an edge you
                         feel instead of a border you look at. */
                      "bg-white ring-1 ring-inset ring-[#0F1B33]/[0.09] hover:ring-[#0F1B33]/30"
                }`}
              >
                <span
                  className={`min-w-0 truncate text-[13px] font-semibold transition-colors ${
                    isActive ? "text-white" : "text-[#1E293B]"
                  }`}
                >
                  {section.label}
                </span>

                {/* One figure, and it swaps for the arrow on hover — the count is
                    what you read while scanning, the arrow is the answer to
                    pointing at a row. */}
                <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
                  <span
                    className={`data-type absolute text-[12px] transition-opacity group-hover:opacity-0 group-focus-visible:opacity-0 ${
                      isActive ? "text-white/70" : "ink-muted"
                    }`}
                  >
                    {section.items.length}
                  </span>
                  <ArrowRight
                    size={13}
                    aria-hidden="true"
                    className={`absolute opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 ${
                      isActive ? "text-white" : "text-[#C41E16]"
                    }`}
                  />
                </span>
              </a>
            </li>
          );
        })}
      </ul>

      {/* Progress with no words attached: the hull already says which leg, so a
          hairline filling across the base is all the summary needed. */}
      <span aria-hidden="true" className="block h-[3px] w-full bg-[#DCE7F1]">
        <span
          className="block h-full bg-[#0F1B33] transition-[width] duration-500"
          style={{
            width: `${activeIndex > -1 ? ((activeIndex + 1) / sections.length) * 100 : 0}%`,
          }}
        />
      </span>
    </nav>
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
  const reduceMotion = useReducedMotion();

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

  /**
   * Jump to a section from the index.
   *
   * A plain `href="#id"` already worked, but it teleported and left the scroll
   * spy to catch up, so the row you clicked lit up a beat later. Scrolling it
   * ourselves lets us mark the target active immediately and still write the
   * hash, so the address bar keeps working as a shareable position.
   */
  const jumpToSection = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
      const target = document.getElementById(id);
      if (!target) return; // Let the browser handle it rather than swallow the click.
      event.preventDefault();
      target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      setActiveSection(id);
      window.history.replaceState(null, "", `#${id}`);
    },
    [reduceMotion]
  );

  if (!content) return <PublicPageSkeleton />;

  const meta = content.meta ?? {};
  const contactEmail = meta.contactEmail || "ppiauckland@gmail.com";
  const anyOpen = Object.values(openItems).some(Boolean);

  return (
    /*
      Shore surface for the whole document. Deliberately no `overflow-hidden`
      here: it would turn this element into a scroll container and break the
      sticky sidebar index below.
    */
    <div className="sea-shore">
      <PageHeader {...content.header} />

      <WaveTransition from={DEEP} to={SHORE} />

      {/* ── Search ─────────────────────────────────────────────────── */}
      <section className="relative">
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
              className="w-full rounded-[4px] border border-[#C3D2E0] bg-white/70 py-3.5 pl-11 pr-24 text-sm text-[#0F1B33] outline-none transition-all placeholder:text-[#475569] focus:border-[#E8231A] focus:bg-white"
            />
            <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
              {search ? (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className="rounded-[3px] p-1.5 ink-muted transition-colors hover:bg-white hover:text-[#0F1B33]"
                >
                  <X size={14} />
                </button>
              ) : (
                <kbd className="data-type hidden select-none rounded-[3px] border border-[#C3D2E0] bg-white px-1.5 py-0.5 text-[12px] font-bold ink-muted sm:block">
                  ⌘K
                </kbd>
              )}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="data-type text-[12px] uppercase ink-muted" aria-live="polite">
              {query
                ? `${matchCount} ${matchCount === 1 ? "topic" : "topics"} match “${query}”`
                : `${totalCount} topics across ${content.sections.length} sections`}
            </p>
            <div className="data-type flex items-center gap-3 text-[12px] font-bold uppercase">
              <button
                type="button"
                onClick={expandAllVisible}
                className="ink-body transition-colors hover:text-[#0F1B33]"
              >
                Expand all
              </button>
              {anyOpen && (
                <>
                  <span aria-hidden="true" className="h-3 w-px bg-[#C3D2E0]" />
                  <button
                    type="button"
                    onClick={collapseAll}
                    className="ink-body transition-colors hover:text-[#0F1B33]"
                  >
                    Collapse all
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-6">
          <span aria-hidden="true" className="rope-rule block opacity-70" />
        </div>
      </section>

      {/* ── Index + content ────────────────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex gap-10">
          {/*
            Persistent index. Forty topics is far too many to navigate by
            scrolling, and the section anchors already existed — nothing linked
            to them.
          */}
          <aside className="hidden w-[21rem] shrink-0 lg:block">
            <div className="sticky top-24">
              <SectionIndex
                sections={visibleSections}
                activeSection={activeSection}
                onJump={jumpToSection}
              />
            </div>
          </aside>

          <main className="min-w-0 flex-1 space-y-5">
            {visibleSections.length === 0 ? (
              <div className="chart-paper rounded-[5px] border border-dashed border-[#C3D2E0] p-12 text-center">
                <Search size={26} className="mx-auto mb-3 text-[#C3D2E0]" aria-hidden="true" />
                <p
                  className="text-xl font-black text-[#0F1B33]"
                  style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
                >
                  Nothing matched “{query}”
                </p>
                <p className="mx-auto mt-2 max-w-sm text-sm ink-body">
                  Try a shorter or more general word — or email us and we will add it.
                </p>
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="mt-6 rounded-[4px] bg-[#E8231A] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#C41E16]"
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
      <footer className="relative">
        <div className="mx-auto max-w-7xl px-6">
          <span aria-hidden="true" className="rope-rule block opacity-70" />
        </div>
        <div className="mx-auto grid max-w-7xl items-center gap-6 px-6 py-12 md:grid-cols-2">
          <div>
            <p className="data-type text-[12px] uppercase ink-muted">
              {meta.reviewedLabel || "Last reviewed"}
            </p>
            <p className="data-type mt-1.5 text-xl font-black text-[#0F1B33]">
              {meta.reviewedValue || "—"}
            </p>
            {meta.reviewedNote && (
              <p className="mt-2 max-w-md text-xs leading-relaxed ink-body">
                {meta.reviewedNote}
              </p>
            )}
          </div>

          <a
            href={`mailto:${contactEmail}?subject=${encodeURIComponent(
              `Wiki update for ${content.header.title} ${content.header.titleAccent}`.trim()
            )}`}
            className="group flex items-center gap-3 justify-self-start text-[#0F1B33] transition-colors hover:text-[#C41E16] md:justify-self-end"
          >
            <span
              aria-hidden="true"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white transition-shadow"
              style={{ boxShadow: "inset 0 0 0 1px #C3D2E0, 0 0 0 4px rgba(195,210,224,0.25)" }}
            >
              <Mail size={16} />
            </span>
            <span className="text-sm font-semibold">
              {meta.contactText || "Found something outdated? Tell us."}
            </span>
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
          </a>
        </div>
        {meta.credit && (
          <div className="data-type mx-auto max-w-7xl px-6 pb-10 text-[12px] uppercase ink-muted">{meta.credit}</div>
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
