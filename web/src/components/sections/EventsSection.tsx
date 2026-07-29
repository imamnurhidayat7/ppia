"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, Calendar, MapPin } from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";
import { getImageUrl } from "@/lib/utils";
import { useLanguage } from "@/lib/language-context";
import { useLandingColors } from "@/lib/hooks/use-landing-colors";
import { useLandingSection } from "@/lib/hooks/use-landing-section";
import { pickText } from "@/lib/utils";
import type { LandingSection } from "@/lib/api-types";
import SectionHeading from "./SectionHeading";

interface ApiEvent {
  id: string;
  slug: string;
  title: string;
  description?: string;
  startDate: string;
  endDate?: string | null;
  location?: string | null;
  imageUrl?: string;
  published?: boolean;
}

interface DisplayEvent {
  id: string;
  slug: string;
  title: string;
  date: string;
  /** Day of month, for the departure-board date block. */
  day: string;
  /** Three-letter month, for the same block. */
  month: string;
  /** Departure time, or an em dash when the date carries no usable time. */
  time: string;
  location: string;
  imageUrl?: string;
  accent: string;
  bg: string;
}

// Accent palette cycled per card (DB events have no color field in the list response)
const ACCENTS = [
  { accent: "#E8231A", bg: "from-red-950/80 to-[#1A2B4A]" },
  { accent: "#3B82F6", bg: "from-blue-950/80 to-[#1A2B4A]" },
  { accent: "#8B5CF6", bg: "from-purple-950/80 to-[#1A2B4A]" },
  { accent: "#10B981", bg: "from-emerald-950/80 to-[#1A2B4A]" },
  { accent: "#F59E0B", bg: "from-amber-950/80 to-[#1A2B4A]" },
  { accent: "#06B6D4", bg: "from-cyan-950/80 to-[#1A2B4A]" },
];

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-NZ", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

/**
 * Split a date into the parts the departure board prints separately.
 *
 * A malformed date must not take the row down, so every field degrades to a
 * placeholder rather than throwing.
 */
function departureParts(iso: string): { day: string; month: string; time: string } {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return { day: "--", month: "---", time: "—" };

  return {
    day: date.toLocaleDateString("en-NZ", { day: "2-digit" }),
    month: date.toLocaleDateString("en-NZ", { month: "short" }).toUpperCase(),
    time: date.toLocaleTimeString("en-NZ", { hour: "2-digit", minute: "2-digit", hour12: false }),
  };
}

/** Map the raw API event list to the display shape used by the carousel. */
function mapEvents(list: ApiEvent[]): DisplayEvent[] {
  return list.map((e, i) => {
    const palette = ACCENTS[i % ACCENTS.length];
    return {
      id: e.id,
      slug: e.slug,
      title: e.title,
      date: formatDate(e.startDate),
      ...departureParts(e.startDate),
      location: e.location || "TBA",
      imageUrl: getImageUrl(e.imageUrl),
      accent: palette.accent,
      bg: palette.bg,
    };
  });
}

interface EventsSectionProps {
  /**
   * Events resolved on the server. When provided, the section renders them
   * immediately (no client fetch, no loading skeleton). When omitted, it falls
   * back to fetching on the client so the component still works standalone.
   */
  initialEvents?: ApiEvent[];
  /** Server-resolved CMS heading config for this section. */
  initialSection?: LandingSection | null;
}

export default function EventsSection({ initialEvents, initialSection }: EventsSectionProps = {}) {
  // Treat the server data as authoritative only when it is non-empty. An empty
  // array almost always means the API was unreachable during server rendering
  // (it degrades to `[]`), so in that case we still let the client re-fetch —
  // otherwise a transient API outage at render time would leave the section
  // permanently empty until the ISR cache expires.
  const hasInitial = Array.isArray(initialEvents) && initialEvents.length > 0;
  const [events, setEvents] = useState<DisplayEvent[]>(() =>
    hasInitial ? mapEvents(initialEvents!) : []
  );
  const [loading, setLoading] = useState(!hasInitial);
  const { language } = useLanguage();
  const { colors } = useLandingColors();
  const { section } = useLandingSection("events", initialSection);
  const isId = language === "id";

  const header = useMemo(() => {
    const cfg = (key: string) =>
      pickText(
        isId,
        section?.config?.[`${key}Id`] as string | undefined,
        section?.config?.[key] as string | undefined
      );

    return {
      badge: cfg("badge") || (isId ? "Acara" : "Events"),
      title: pickText(isId, section?.titleId, section?.title) || (isId ? "Acara" : "Events"),
      titleHighlight: section?.config?.titleHighlight || "Events",
      viewAll: cfg("viewAll") || (isId ? "Lihat semua acara" : "View all events"),
      viewAllHref: section?.config?.viewAllHref || "/activities/events",
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, language]);

  useEffect(() => {
    // Server already provided the events — no client fetch needed.
    if (hasInitial) return;

    const fetchEvents = async () => {
      try {
        const response = await api.getEvents({ limit: 8 });
        const list: ApiEvent[] =
          response.events && Array.isArray(response.events)
            ? response.events
            : Array.isArray(response)
              ? response
              : [];
        setEvents(mapEvents(list));
      } catch (err) {
        console.error("Failed to fetch events:", err);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, [hasInitial]);

  return (
    <section id="events" className="sea-deep relative overflow-hidden py-28">
      {/* Cool glow on the opposite side to the video section's warm one, so the
          two dark sections read as separate moments rather than one long block. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-40 top-1/4 h-[520px] w-[520px] rounded-full opacity-[0.13]"
        style={{ background: 'radial-gradient(circle, #6D28D9 0%, transparent 65%)' }}
      />
      <div className="relative mx-auto max-w-7xl px-6">
        {/*
          The heading used to render a hard-coded "Our " followed by the
          highlighted words whenever the title contained them, throwing away
          whatever the CMS actually said. SectionHeading splits the real title.
        */}
        <SectionHeading
          eyebrow={header.badge}
          title={header.title}
          highlight={header.titleHighlight}
          align="left"
          tone="dark"
          className="mb-12"
          action={
            <Link
              href={header.viewAllHref}
              className="group inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-white/85 transition-colors hover:border-white/50 hover:bg-white/[0.06] hover:text-white"
            >
              {header.viewAll}
              <ArrowRight
                size={15}
                className="transition-transform duration-300 group-hover:translate-x-1"
              />
            </Link>
          }
        />

        {/*
          Structure: a departure board, not a card carousel.

          A row of fixed-width cards in a horizontal scroller hid most of the
          schedule behind an interaction and truncated every title to two lines.
          A board shows the whole schedule at once, gives long event names room,
          and matches how sailings are actually posted at a port — which is the
          frame the hero sets. The date is the anchor of each row, printed as
          data, so scanning for "when" does not mean reading prose.
        */}
        <div className="overflow-hidden rounded-[6px] border border-white/10 bg-white/[0.03] backdrop-blur-sm">
          <div className="flex items-center gap-4 border-b border-white/10 bg-white/[0.04] px-5 py-3">
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span
                className="absolute inline-flex h-full w-full rounded-full opacity-60 motion-safe:animate-ping"
                style={{ background: colors.textAccent }}
              />
              <span
                className="relative inline-flex h-2 w-2 rounded-full"
                style={{ background: colors.textAccent }}
              />
            </span>
            <p className="data-type text-[12px] font-bold uppercase text-white/75">Departures</p>
            <span aria-hidden="true" className="h-px flex-1 bg-white/10" />
            <p className="data-type hidden text-[12px] uppercase text-white/40 sm:block">
              Date · Destination · Time
            </p>
          </div>

          {loading ? (
            <div className="divide-y divide-white/[0.07]">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-5 px-5 py-5">
                  <div className="h-12 w-12 shrink-0 animate-pulse rounded-[4px] bg-white/[0.07]" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-4 w-2/3 animate-pulse rounded bg-white/[0.07]" />
                    <div className="h-3 w-1/3 animate-pulse rounded bg-white/[0.05]" />
                  </div>
                </div>
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <Calendar className="mx-auto mb-4 h-14 w-14 text-white/15" aria-hidden="true" />
              <p className="text-lg text-white/60">No sailings scheduled</p>
              <p className="mt-1 text-sm text-white/30">
                New events will appear on the board once they are published.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-white/[0.07]">
              {events.map((event, i) => (
                <motion.li
                  key={event.id}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ duration: 0.45, delay: Math.min(i, 5) * 0.06 }}
                >
                  <Link
                    href={`/activities/events/${event.slug}`}
                    className="group relative flex items-center gap-4 px-5 py-4 transition-colors duration-300 hover:bg-white/[0.05] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white sm:gap-6 sm:py-5"
                  >
                    {/* Accent spine grows on hover, marking the active row. */}
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-0 left-0 w-[3px] origin-center scale-y-0 transition-transform duration-300 group-hover:scale-y-100"
                      style={{ background: event.accent }}
                    />

                    {/* Date block: the board's anchor. */}
                    <span
                      className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-[4px] border"
                      style={{
                        background: `${event.accent}14`,
                        borderColor: `${event.accent}33`,
                      }}
                      aria-hidden="true"
                    >
                      <span
                        className="data-type text-lg font-black leading-none text-white"
                        style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}
                      >
                        {event.day}
                      </span>
                      <span className="data-type mt-0.5 text-[12px] font-bold" style={{ color: event.accent }}>
                        {event.month}
                      </span>
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-bold text-white sm:text-base">
                        {event.title}
                      </span>
                      <span className="mt-1 flex items-center gap-3 text-xs text-white/70">
                        <span className="flex min-w-0 items-center gap-1.5">
                          <MapPin size={11} className="shrink-0" aria-hidden="true" />
                          <span className="truncate">{event.location}</span>
                        </span>
                        <span aria-hidden="true" className="hidden h-1 w-1 shrink-0 rounded-full bg-white/25 sm:block" />
                        <span className="data-type hidden shrink-0 sm:block">{event.date}</span>
                      </span>
                    </span>

                    {/* Thumbnail, when the event has artwork. Small on purpose:
                        the row is a schedule line, not a hero image. */}
                    {event.imageUrl && (
                      <span className="relative hidden h-12 w-20 shrink-0 overflow-hidden rounded-[3px] md:block">
                        <Image
                          src={event.imageUrl}
                          alt=""
                          fill
                          sizes="80px"
                          className="object-cover opacity-70 transition-opacity duration-300 group-hover:opacity-100"
                        />
                      </span>
                    )}

                    <span className="data-type hidden w-14 shrink-0 text-right text-sm font-bold text-white/80 sm:block">
                      {event.time}
                    </span>

                    <ArrowRight
                      size={16}
                      aria-hidden="true"
                      className="shrink-0 text-white/25 transition-all duration-300 group-hover:translate-x-1 group-hover:text-white/70"
                    />
                  </Link>
                </motion.li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
