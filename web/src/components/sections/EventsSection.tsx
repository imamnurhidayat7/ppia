"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Calendar, MapPin, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
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
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
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

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 320;
      scrollRef.current.scrollBy({
        left: direction === 'right' ? scrollAmount : -scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const showNav = events.length > 0;

  return (
    <section id="events" className="relative overflow-hidden bg-[#0D1B33] py-28">
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

        {/* Carousel Navigation */}
        {showNav && (
          <div className="flex items-center justify-end gap-2 mb-6">
            <button onClick={() => scroll('left')} disabled={!canScrollLeft} className="p-2 rounded-full border border-white/10 hover:bg-white/10 disabled:opacity-30 transition-colors">
              <ChevronLeft size={20} className="text-white" />
            </button>
            <button onClick={() => scroll('right')} disabled={!canScrollRight} className="p-2 rounded-full border border-white/10 hover:bg-white/10 disabled:opacity-30 transition-colors">
              <ChevronRight size={20} className="text-white" />
            </button>
          </div>
        )}

        {/* Events Carousel / States */}
        {loading ? (
          <div className="flex gap-5 overflow-hidden pb-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="min-w-[300px] w-[300px] h-72 rounded-2xl bg-white/5 border border-white/10 animate-pulse shrink-0"
              />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-16">
            <Calendar className="w-16 h-16 text-white/15 mx-auto mb-4" />
            <p className="text-white/60 text-lg">No events yet</p>
            <p className="text-white/30 text-sm mt-1">
              New events will appear here once they are published.
            </p>
          </div>
        ) : (
          <>
          <div ref={scrollRef} onScroll={handleScroll} className="flex gap-5 overflow-x-auto pb-4 scroll-smooth snap-x snap-mandatory scrollbar-hide">
            {events.map((event, i) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <Link
                  href={`/activities/events/${event.slug}`}
                  className={`group block min-w-[300px] w-[300px] h-72 relative rounded-2xl overflow-hidden bg-gradient-to-br ${event.bg} border border-white/10 hover:border-white/20 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 cursor-pointer p-6 flex flex-col snap-start`}
                >
                  {event.imageUrl && (
                    // Decorative backdrop behind the card text, so the card is a
                    // fixed 300px wide and the width hint can be exact.
                    <Image
                      src={event.imageUrl}
                      alt={event.title}
                      fill
                      sizes="300px"
                      className="object-cover opacity-30 group-hover:opacity-40 group-hover:scale-105 transition-all duration-500"
                    />
                  )}
                  <div className="relative flex-1 flex flex-col">
                    <span
                      className="self-start inline-block text-xs font-semibold px-3 py-1 rounded-full border"
                      style={{
                        background: `${event.accent}20`,
                        color: event.accent,
                        borderColor: `${event.accent}40`,
                      }}
                    >
                      Event
                    </span>

                    <h3 className="font-bold text-white text-lg leading-tight group-hover:text-white/90 transition-colors line-clamp-2 mt-4">
                      {event.title}
                    </h3>

                    <div className="flex flex-col gap-2.5 mt-auto">
                      <div className="flex items-center gap-2 text-white/70 text-sm">
                        <Calendar size={13} className="shrink-0" />
                        {event.date}
                      </div>
                      <div className="flex items-center gap-2 text-white/70 text-sm">
                        <MapPin size={13} className="shrink-0" />
                        <span className="truncate">{event.location}</span>
                      </div>
                    </div>
                  </div>

                  {/* Accent line bottom */}
                  <div
                    className="absolute bottom-0 left-0 right-0 h-0.5 opacity-60"
                    style={{ background: `linear-gradient(90deg, ${event.accent}, transparent)` }}
                  />
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Scroll position indicator (dots) */}
          {events.length > 3 && (
            <div className="flex items-center justify-center gap-1.5 mt-6">
              {events.map((event, i) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => {
                    const container = scrollRef.current;
                    if (container) {
                      container.scrollTo({ left: i * 320, behavior: 'smooth' });
                    }
                  }}
                  aria-label={`Go to event ${i + 1}`}
                  className="w-2 h-2 rounded-full bg-white/30 hover:bg-white/60 transition-colors"
                />
              ))}
            </div>
          )}
          </>
        )}
      </div>
    </section>
  );
}
