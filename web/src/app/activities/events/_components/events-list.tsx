"use client";
import { toPlainText } from "@/lib/sanitize-html";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import PageHeader from "@/components/PageHeader";
import WaveTransition from "@/components/sections/WaveTransition";
import { SubscribeToCalendarLink } from "@/components/AddToCalendarButton";
import { Calendar, MapPin, Clock } from "lucide-react";
import api from "@/lib/api";
import { API_ORIGIN as API_BASE_URL } from "@/lib/api-base";
import { EventsListSkeleton } from "@/components/skeletons/public-skeletons";

/**
 * Seam colours for the waterline transitions. These match the ends of the
 * `.sea-deep` / `.sea-shore` gradients in globals.css, so no hairline of the
 * wrong colour shows where two surfaces meet.
 */
const DEEP_SEA = "#0B1C2E";
const SHORE = "#FFFFFF";

// Helper to get full image URL
const getFullImageUrl = (url: string | undefined | null): string | undefined => {
  if (!url) return undefined;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return `${API_BASE_URL}${url}`;
};

const categories = ["All", "Social", "Academic", "Cultural", "Well-being"] as const;
type Category = (typeof categories)[number];

interface Event {
  id: string;
  slug: string;
  title: string;
  date: string;
  time?: string;
  location: string;
  category: Category;
  color: string;
  description: string;
  attendees?: number;
  status: "upcoming" | "past";
  highlight?: boolean;
  startDate: string;
  endDate?: string;
  imageUrl?: string;
}

const categoryColors: Record<Category, string> = {
  All: "#1A2B4A",
  Social: "#F59E0B",
  Academic: "#3B82F6",
  Cultural: "#E8231A",
  "Well-being": "#10B981",
};


// Map API response to Event format
interface ApiEvent {
  id: string;
  slug: string;
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  location?: string;
  imageUrl?: string;
  published?: boolean;
  division?: { name?: string };
}

function mapApiEventToEvent(apiEvent: ApiEvent): Event {
  const startDate = new Date(apiEvent.startDate);
  const now = new Date();
  const status = startDate > now ? "upcoming" : "past";

  // Determine category from division or default
  let category: Category = "Social";
  if (apiEvent.division?.name) {
    const divName = apiEvent.division.name.toLowerCase();
    if (divName.includes("academic")) category = "Academic";
    else if (divName.includes("culture")) category = "Cultural";
    else if (divName.includes("well") || divName.includes("kesejahteraan")) category = "Well-being";
    else if (divName.includes("social")) category = "Social";
  }

  const color = categoryColors[category];

  return {
    id: apiEvent.id,
    slug: apiEvent.slug,
    title: apiEvent.title,
    // Dates and times are printed as chart data, so they use the same
    // en-NZ / tabular format as the departure board on the homepage.
    date: startDate.toLocaleDateString("en-NZ", { day: "2-digit", month: "short", year: "numeric" }),
    time: startDate.toLocaleTimeString("en-NZ", { hour: "2-digit", minute: "2-digit", hour12: false }),
    location: apiEvent.location || "TBA",
    category,
    color,
    description: apiEvent.description || "",
    status,
    highlight: status === "upcoming" && apiEvent.published,
    startDate: apiEvent.startDate,
    endDate: apiEvent.endDate,
    imageUrl: apiEvent.imageUrl,
  };
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<Category>("All");
  const [activeStatus, setActiveStatus] = useState<"all" | "upcoming" | "past">("all");

  // CMS-managed header content (falls back to defaults if fetch fails)
  const [headerData, setHeaderData] = useState({
    label: "Activities",
    title: "PPIA",
    titleAccent: "Events",
    description: "From social nights to academic forums and cultural celebrations — every PPIA event brings our community closer.",
    breadcrumbs: [{ label: "Activities" }, { label: "Events" }],
  });

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const response = await api.getEvents({ limit: 50 });
        if (response.events && Array.isArray(response.events)) {
          setEvents(response.events.map(mapApiEventToEvent));
        } else if (Array.isArray(response)) {
          // Handle case where response is directly an array
          setEvents(response.map(mapApiEventToEvent));
        } else {
          setEvents([]);
        }
      } catch (err) {
        console.error("Failed to fetch events:", err);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();

    // Fetch CMS-managed header content
    api.getPageBySlug('activities/events')
      .then((res) => {
        const header = res?.page?.content?.header;
        if (header) {
          setHeaderData({
            label: header.label ?? "Activities",
            title: header.title ?? "PPIA",
            titleAccent: header.titleAccent ?? "Events",
            description: header.description ?? headerData.description,
            breadcrumbs: header.breadcrumbs ?? [{ label: "Activities" }, { label: "Events" }],
          });
        }
      })
      .catch(() => { /* keep defaults */ });
  }, []);

  const filtered = events.filter((e) => {
    const catMatch = activeCategory === "All" || e.category === activeCategory;
    const statusMatch = activeStatus === "all" || e.status === activeStatus;
    return catMatch && statusMatch;
  });

  const upcoming = events.filter((e) => e.status === "upcoming");

  // Show skeleton loading
  if (loading) {
    return (
      <>
        <PageHeader
          label={headerData.label}
          title={headerData.title}
          titleAccent={headerData.titleAccent}
          description={headerData.description}
          breadcrumbs={headerData.breadcrumbs}
        />
        <EventsListSkeleton />
      </>
    );
  }

  return (
    <>
      <PageHeader
        label={headerData.label}
        title={headerData.title}
        titleAccent={headerData.titleAccent}
        description={headerData.description}
        breadcrumbs={headerData.breadcrumbs}
      />

      {/* Upcoming highlight */}
      {upcoming.length > 0 && (
        <section className="sea-deep relative overflow-hidden py-16">
          {/* Same below-waterline depth treatment as the homepage: a faint
              navigation-chart grid that fades out from the centre. */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <div
              className="sea-chart-light absolute inset-0 opacity-[0.05]"
              style={{
                maskImage: "radial-gradient(ellipse 80% 70% at 40% 45%, transparent 20%, black 85%)",
                WebkitMaskImage: "radial-gradient(ellipse 80% 70% at 40% 45%, transparent 20%, black 85%)",
              }}
            />
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: `radial-gradient(circle at 30% 50%, #E8231A, transparent 50%),
                  radial-gradient(circle at 70% 50%, #3B82F6, transparent 50%)`,
              }}
            />
          </div>
          <div className="relative z-10 max-w-7xl mx-auto px-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-3">
                <span aria-hidden="true" className="w-2 h-2 rounded-full bg-[#E8231A] animate-pulse" />
                <p className="data-type text-[12px] font-bold uppercase accent-label">Upcoming</p>
                <span aria-hidden="true" className="h-px w-10 bg-[#E8231A]/40" />
              </div>
              {/* Whole-programme feed, so members do not have to add each event
                  one at a time. */}
              <SubscribeToCalendarLink />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {upcoming.slice(0, 2).map((event, i) => (
                <Link key={event.id} href={`/activities/events/${event.slug}`}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                    className="group relative cursor-pointer overflow-hidden rounded-[5px] border border-white/10 bg-white/[0.04] transition-all duration-300 hover:border-white/25 hover:bg-white/[0.07]"
                  >
                    {/* Image */}
                    <div className="relative h-48">
                      {event.imageUrl ? (
                        <Image
                          src={getFullImageUrl(event.imageUrl) || ''}
                          alt={event.title}
                          fill
                          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center"
                          style={{ background: `${event.color}25` }}
                        >
                          <Calendar size={48} style={{ color: event.color }} />
                        </div>
                      )}
                      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[#071321] via-transparent to-transparent" />
                      {/* Category as a filed label pinned to the image edge,
                          squared off rather than a floating pill. */}
                      <span
                        className="data-type absolute bottom-0 left-0 px-3 py-1.5 text-[12px] font-bold uppercase text-white"
                        style={{ background: `${event.color}E6` }}
                      >
                        {event.category}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                      {/* Hover tint is the light red: #C41E16 would drop to
                          2.4:1 against this dark card. */}
                      <h3 className="font-black text-white text-xl md:text-2xl mb-3 leading-tight transition-colors group-hover:text-[#FF8A80]">
                        {event.title}
                      </h3>
                      <p className="text-[#94A3B8] text-sm mb-4 line-clamp-2">{toPlainText(event.description)}</p>
                      {/* Log-entry meta line: date and time set as data. */}
                      <div className="data-type flex items-center gap-3 text-[12px] uppercase text-white/70">
                        <span className="flex items-center gap-1.5">
                          <Calendar size={11} aria-hidden="true" />
                          {event.date}
                        </span>
                        {event.time && (
                          <>
                            <span aria-hidden="true" className="h-1 w-1 rounded-full bg-white/25" />
                            <span className="flex items-center gap-1.5">
                              <Clock size={11} aria-hidden="true" />
                              {event.time}
                            </span>
                          </>
                        )}
                      </div>
                      {event.location && (
                        <div className="data-type mt-2 flex items-center gap-1.5 text-[12px] uppercase text-white/70">
                          <MapPin size={11} aria-hidden="true" />
                          {event.location}
                        </div>
                      )}
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Waterline between the deep-sea masthead/highlight and the shore below. */}
      <WaveTransition from={DEEP_SEA} to={SHORE} />

      {/*
        Filters and grid share one shore surface. They used to be two stacked
        light slabs, which re-started the gradient halfway down the page and read
        as a seam that means nothing.
      */}
      <section className="sea-shore relative overflow-hidden pb-20 pt-10">
        <div
          aria-hidden="true"
          className="sea-chart pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            maskImage: "radial-gradient(ellipse 80% 70% at 50% 35%, transparent 25%, black 90%)",
            WebkitMaskImage: "radial-gradient(ellipse 80% 70% at 50% 35%, transparent 25%, black 90%)",
          }}
        />
        <div className="relative max-w-7xl mx-auto px-6">
          {/*
            Filters as one ruled board rather than two rows of floating pills:
            a labelled strip of chart paper, each axis on its own line, split by
            a rope hairline.
          */}
          <div className="chart-paper mb-12 rounded-[5px] border border-[#DCE7F1]">
            <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
              <p className="data-type w-24 shrink-0 text-[12px] font-bold uppercase ink-muted">
                Category
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    aria-pressed={activeCategory === cat}
                    className={`data-type rounded-[3px] border px-3 py-1.5 text-[12px] font-bold uppercase transition-colors ${
                      activeCategory === cat
                        ? "border-[#0F2438] bg-[#0F2438] text-white"
                        : "border-[#DCE7F1] text-[#5B6B7C] hover:border-[#9FB3C6] hover:text-[#0F1B33]"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div aria-hidden="true" className="rope-rule mx-5" />

            <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
              <p className="data-type w-24 shrink-0 text-[12px] font-bold uppercase ink-muted">
                Status
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {(["all", "upcoming", "past"] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setActiveStatus(status)}
                    aria-pressed={activeStatus === status}
                    className={`data-type rounded-[3px] border px-3 py-1.5 text-[12px] font-bold uppercase transition-colors ${
                      activeStatus === status
                        ? "border-[#E8231A] bg-[#E8231A] text-white"
                        : "border-[#DCE7F1] text-[#5B6B7C] hover:border-[#9FB3C6] hover:text-[#0F1B33]"
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((event, i) => (
              <Link key={event.id} href={`/activities/events/${event.slug}`}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.05 }}
                  className="chart-paper group h-full cursor-pointer overflow-hidden rounded-[5px] border border-[#DCE7F1] transition-all duration-300 hover:-translate-y-1 hover:border-[#C3D2E0] hover:shadow-[0_28px_70px_-30px_rgba(7,19,33,0.42)]"
                >
                  {/* Image */}
                  <div className="relative h-40 overflow-hidden">
                    {event.imageUrl ? (
                      <Image
                        src={getFullImageUrl(event.imageUrl) || ''}
                        alt={event.title}
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center"
                        style={{ background: `${event.color}15` }}
                      >
                        <Calendar size={40} style={{ color: event.color }} />
                      </div>
                    )}
                    <span
                      className="data-type absolute bottom-0 left-0 px-3 py-1.5 text-[12px] font-bold uppercase text-white"
                      style={{ background: `${event.color}E6` }}
                    >
                      {event.category}
                    </span>
                    <span
                      className={`data-type absolute right-3 top-3 rounded-[3px] px-2 py-1 text-[12px] font-bold uppercase ${
                        event.status === "upcoming"
                          ? "bg-[#0B7A55]/90 text-white"
                          : "bg-[#0F2438]/85 text-white/80"
                      }`}
                    >
                      {event.status}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="p-5">
                    {/* Log-entry meta line, ruled with a rope hairline. */}
                    <div className="data-type mb-3 flex items-center gap-3 text-[12px] uppercase ink-muted">
                      <span className="flex items-center gap-1.5">
                        <Calendar size={10} aria-hidden="true" />
                        {event.date}
                      </span>
                      <span aria-hidden="true" className="rope-rule h-px flex-1 opacity-70" />
                      {event.time && (
                        <span className="flex items-center gap-1.5">
                          <Clock size={10} aria-hidden="true" />
                          {event.time}
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-[#0F1B33] text-lg mb-2 group-hover:text-[#C41E16] transition-colors line-clamp-2">
                      {event.title}
                    </h3>
                    <p className="ink-body text-sm line-clamp-2">{toPlainText(event.description)}</p>
                    {event.location && (
                      <div className="data-type mt-4 flex items-center gap-1.5 text-[12px] uppercase ink-muted">
                        <MapPin size={10} aria-hidden="true" />
                        {event.location}
                      </div>
                    )}
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="chart-paper rounded-[5px] border border-[#DCE7F1] py-16 text-center">
              <Calendar className="mx-auto mb-4 h-12 w-12 text-[#C3D2E0]" aria-hidden="true" />
              <p className="text-[#0F1B33] text-lg font-bold">
                {events.length === 0 ? "No upcoming events" : "No events found"}
              </p>
              <p className="data-type mt-2 text-[12px] uppercase ink-muted">
                {events.length === 0
                  ? "New events will appear here once they are published."
                  : "Try adjusting your filters"}
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
