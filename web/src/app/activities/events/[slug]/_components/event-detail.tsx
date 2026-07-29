"use client";

import Image from "next/image";
import Link from "next/link";
import { sanitizeHtml } from "@/lib/sanitize-html";
import AddToCalendarButton from "@/components/AddToCalendarButton";
import EventGallery from "@/components/EventGallery";
import type { PublicEvent } from "@/lib/server-api";
import { ArrowLeft, Calendar, Clock, MapPin, Users } from "lucide-react";
import { getImageUrl } from "@/lib/utils";

export default function EventDetail({ event }: { event: PublicEvent }) {
  // Dates and times print as chart data, using the same en-NZ / tabular format
  // as the departure board on the homepage.
  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-NZ", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString("en-NZ", { hour: "2-digit", minute: "2-digit", hour12: false });

  // Check if event has ended or registration deadline passed
  const eventEndDate = event.endDate || event.startDate;
  const isEventEnded = new Date(eventEndDate) < new Date();
  const isRegistrationClosed =
    !!event.registrationDeadline && new Date(event.registrationDeadline) < new Date();
  const canRegister = !isEventEnded && !isRegistrationClosed;

  return (
    <div className="sea-shore relative min-h-screen overflow-hidden">
      {/* Faint navigation-chart grid, fading out behind the content. */}
      <div
        aria-hidden="true"
        className="sea-chart pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          maskImage: "radial-gradient(ellipse 85% 55% at 50% 20%, transparent 20%, black 90%)",
          WebkitMaskImage: "radial-gradient(ellipse 85% 55% at 50% 20%, transparent 20%, black 90%)",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-6 pb-16 pt-16">

        {/* Hero Banner - Full Width */}
        <div className="chart-paper mb-8 overflow-hidden rounded-[5px] border border-[#DCE7F1]">
          {event.imageUrl && (
            <div className="relative h-[260px] w-full bg-[#EDF5FB] sm:h-[380px] lg:h-[500px]">
              <Image
                src={getImageUrl(event.imageUrl) || event.imageUrl}
                alt={event.title}
                fill
                priority
                sizes="(min-width: 1280px) 1216px, 100vw"
                className="object-contain"
              />
            </div>
          )}
          <div className="p-8 md:p-10">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#0F1B33] mb-6 max-w-3xl leading-tight">
              {event.title}
            </h1>
            {/* Log line: the practical facts of the sailing, set as data and
                ruled off rather than floated as pills. */}
            <div aria-hidden="true" className="rope-rule mb-4" />
            <div className="data-type flex flex-wrap items-center gap-3 text-[12px] uppercase ink-muted">
              <span className="flex items-center gap-2">
                <Calendar size={11} className="text-ppia-red" aria-hidden="true" /> {formatDate(event.startDate)}
              </span>
              <span aria-hidden="true" className="h-1 w-1 rounded-full bg-[#C3D2E0]" />
              <span className="flex items-center gap-2">
                <Clock size={11} className="text-ppia-red" aria-hidden="true" /> {formatTime(event.startDate)}
              </span>
              {event.location && (
                <>
                  <span aria-hidden="true" className="h-1 w-1 rounded-full bg-[#C3D2E0]" />
                  <span className="flex items-center gap-2">
                    <MapPin size={11} className="text-ppia-red" aria-hidden="true" /> {event.location}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Back Link */}
        <div className="mb-8">
          <Link href="/activities/events" className="data-type inline-flex items-center gap-2 text-[12px] uppercase ink-muted transition-colors hover:text-ppia-red">
            <ArrowLeft size={13} aria-hidden="true" /> Back to Events
          </Link>
        </div>

        {/* Main Content with Sidebar */}
        <div className="grid lg:grid-cols-3 gap-12">
          {/* Left Content - About */}
          <div className="lg:col-span-2 space-y-8">
            <div className="chart-paper rounded-[5px] border border-[#DCE7F1] p-8 md:p-10">
              <h2 className="text-2xl font-bold text-[#0F1B33] mb-6 flex items-center gap-3">
                <span aria-hidden="true" className="h-8 w-1 bg-ppia-red" />
                About This Event
              </h2>
              <div
                className="prose prose-lg max-w-none text-[#5B6B7C] leading-relaxed"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(event.description) }}
              />
            </div>

            {/* Only rendered once an admin has set a map for this event, so
                events without one look exactly as they did before. */}
            {event.locationMapUrl && (
              <div className="chart-paper overflow-hidden rounded-[5px] border border-[#DCE7F1]">
                <div className="flex items-center gap-3 border-b border-[#DCE7F1] p-6 pb-4">
                  <span aria-hidden="true" className="h-8 w-1 bg-ppia-red" />
                  <h2 className="text-2xl font-bold text-[#0F1B33]">Location</h2>
                </div>
                <iframe
                  src={event.locationMapUrl}
                  title={`Map to ${event.location || event.title}`}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="h-[320px] w-full border-0 sm:h-[380px]"
                />
              </div>
            )}

            {/* Renders nothing until the committee has uploaded documentation,
                so upcoming events are unaffected. */}
            <EventGallery slug={event.slug} />
          </div>

          {/* Right Sidebar - Registration Card */}
          <div className="space-y-6">
            <div className="chart-paper sticky top-24 relative overflow-hidden rounded-[5px] border border-[#DCE7F1] p-6">
              <div aria-hidden="true" className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-ppia-red to-orange-500" />
              <div className="text-center mb-6">
                <p className="data-type text-[12px] uppercase ink-muted mb-2">Event Price</p>
                <div className="data-type text-4xl font-bold text-[#0F1B33]">
                  {event.isFree ? "Free" : `NZ$${event.isFree ? 0 : 'TBA'}`}
                </div>
                {event.isFree && <span className="data-type mt-2 inline-block rounded-[3px] bg-[#0B7A55]/12 px-2.5 py-1 text-[12px] font-bold uppercase text-[#0B7A55]">FREE EVENT</span>}
              </div>

              {canRegister ? (
                <Link
                  href={`/activities/events/${event.slug}/register`}
                  className="mb-4 block w-full py-4 bg-gradient-to-r from-ppia-red to-red-600 text-white rounded-[3px] font-bold text-lg text-center hover:from-ppia-red-dark hover:to-red-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  Register Now
                </Link>
              ) : (
                <div className="data-type w-full py-4 rounded-[3px] border border-[#DCE7F1] bg-white/60 ink-muted font-bold text-xs uppercase text-center mb-4">
                  {isEventEnded ? "Event Ended" : "Registration Closed"}
                </div>
              )}

              {/* Offered for past events too — people keep a record of what they
                  attended, and the entry is still valid history. */}
              <AddToCalendarButton
                event={{
                  slug: event.slug,
                  title: event.title,
                  description: event.description,
                  location: event.location ?? undefined,
                  startDate: event.startDate,
                  endDate: event.endDate ?? undefined,
                }}
                className="mb-4"
              />

              {/* Event Info Cards */}
              <div aria-hidden="true" className="rope-rule mt-4" />
              <div className="space-y-3 pt-4">
                <div className="flex items-center gap-4 rounded-[3px] border border-[#DCE7F1] bg-white/60 p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[3px] bg-ppia-red/10">
                    <Calendar className="text-ppia-red" size={20} />
                  </div>
                  <div>
                    <p className="data-type text-[12px] uppercase ink-muted">Date</p>
                    <p className="data-type mt-0.5 text-[12px] font-semibold uppercase text-[#0F1B33]">{formatDate(event.startDate)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 rounded-[3px] border border-[#DCE7F1] bg-white/60 p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[3px] bg-blue-100">
                    <Clock className="text-blue-600" size={20} />
                  </div>
                  <div>
                    <p className="data-type text-[12px] uppercase ink-muted">Time</p>
                    <p className="data-type mt-0.5 text-[12px] font-semibold uppercase text-[#0F1B33]">{formatTime(event.startDate)}{event.endDate && ` - ${formatTime(event.endDate)}`}</p>
                  </div>
                </div>

                {event.location && (
                  <div className="flex items-center gap-4 rounded-[3px] border border-[#DCE7F1] bg-white/60 p-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-[3px] bg-green-100">
                      <MapPin className="text-green-600" size={20} />
                    </div>
                    <div>
                      <p className="data-type text-[12px] uppercase ink-muted">Location</p>
                      <p className="data-type mt-0.5 text-[12px] font-semibold uppercase text-[#0F1B33]">{event.location}</p>
                    </div>
                  </div>
                )}

                {event.capacity && (
                  <div className="flex items-center gap-4 rounded-[3px] border border-[#DCE7F1] bg-white/60 p-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-[3px] bg-purple-100">
                      <Users className="text-purple-600" size={20} />
                    </div>
                    <div>
                      <p className="data-type text-[12px] uppercase ink-muted">Spots Available</p>
                      <p className="data-type mt-0.5 text-[12px] font-semibold uppercase text-[#0F1B33]">{event.capacity} spots</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
