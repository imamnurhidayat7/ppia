"use client";
import { toPlainText } from "@/lib/sanitize-html";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import PageHeader from "@/components/PageHeader";
import { SubscribeToCalendarLink } from "@/components/AddToCalendarButton";
import { Calendar, MapPin, Clock } from "lucide-react";
import api from "@/lib/api";
import { API_ORIGIN as API_BASE_URL } from "@/lib/api-base";
import { EventsListSkeleton } from "@/components/skeletons/public-skeletons";

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
    date: startDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
    time: startDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
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
        <section className="bg-[#0D1B33] py-16 relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage: `radial-gradient(circle at 30% 50%, #E8231A, transparent 50%),
                radial-gradient(circle at 70% 50%, #3B82F6, transparent 50%)`,
            }}
          />
          <div className="relative z-10 max-w-7xl mx-auto px-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-[#E8231A] animate-pulse" />
                <p className="text-[#E8231A] font-semibold text-sm tracking-widest uppercase">Upcoming</p>
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
                    className="group relative rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 overflow-hidden transition-all duration-300 cursor-pointer"
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
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0D1B33] via-transparent to-transparent" />
                      <div className="absolute top-4 left-4">
                        <span
                          className="px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm"
                          style={{ background: event.color, color: "white" }}
                        >
                          {event.category}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                      <h3 className="font-black text-white text-xl md:text-2xl mb-3 leading-tight group-hover:text-[#E8231A] transition-colors">
                        {event.title}
                      </h3>
                      <p className="text-[#94A3B8] text-sm mb-4 line-clamp-2">{toPlainText(event.description)}</p>
                      <div className="flex items-center gap-4 text-[#64748B] text-sm">
                        <span className="flex items-center gap-1.5">
                          <Calendar size={14} />
                          {event.date}
                        </span>
                        {event.time && (
                          <span className="flex items-center gap-1.5">
                            <Clock size={14} />
                            {event.time}
                          </span>
                        )}
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-1.5 text-[#64748B] text-sm mt-2">
                          <MapPin size={14} />
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

      {/* Filters */}
      <section className="bg-[#F8FAFC] py-10 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeCategory === cat
                      ? "bg-[#1A2B4A] text-white"
                      : "bg-white text-[#64748B] hover:bg-[#1A2B4A]/5"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              {(["all", "upcoming", "past"] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setActiveStatus(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                    activeStatus === status
                      ? "bg-[#E8231A] text-white"
                      : "bg-white text-[#64748B] hover:bg-[#E8231A]/5"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Events grid */}
      <section className="py-16 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((event, i) => (
              <Link key={event.id} href={`/activities/events/${event.slug}`}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.05 }}
                  className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-100 h-full"
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
                    <div className="absolute top-3 left-3">
                      <span
                        className="px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm"
                        style={{ background: `${event.color}`, color: "white" }}
                      >
                        {event.category}
                      </span>
                    </div>
                    <div className="absolute top-3 right-3">
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded backdrop-blur-sm ${
                          event.status === "upcoming"
                            ? "bg-green-500/90 text-white"
                            : "bg-gray-500/90 text-white"
                        }`}
                      >
                        {event.status}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-5">
                    <h3 className="font-bold text-[#1A2B4A] text-lg mb-2 group-hover:text-[#E8231A] transition-colors line-clamp-2">
                      {event.title}
                    </h3>
                    <p className="text-[#64748B] text-sm mb-4 line-clamp-2">{toPlainText(event.description)}</p>
                    <div className="flex items-center gap-4 text-[#94A3B8] text-sm">
                      <span className="flex items-center gap-1.5">
                        <Calendar size={14} />
                        {event.date}
                      </span>
                      {event.time && (
                        <span className="flex items-center gap-1.5">
                          <Clock size={14} />
                          {event.time}
                        </span>
                      )}
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-1.5 text-[#94A3B8] text-sm mt-2">
                        <MapPin size={14} />
                        {event.location}
                      </div>
                    )}
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-12">
              <p className="text-[#64748B] text-lg">
                {events.length === 0 ? "No upcoming events" : "No events found"}
              </p>
              <p className="text-[#94A3B8] text-sm mt-1">
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
