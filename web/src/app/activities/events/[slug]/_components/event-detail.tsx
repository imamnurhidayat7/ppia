"use client";

import { useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { sanitizeHtml } from "@/lib/sanitize-html";
import AddToCalendarButton from "@/components/AddToCalendarButton";
import EventGallery from "@/components/EventGallery";
import { useToast } from "@/components/Toast";
import { Modal } from "@/components/ui";
import type { PublicEvent } from "@/lib/server-api";
import { ArrowLeft, Calendar, Clock, MapPin, Users } from "lucide-react";

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegister: () => void;
  eventTitle: string;
  isRegistering: boolean;
}

function RegistrationModal({
  isOpen,
  onClose,
  onRegister,
  eventTitle,
  isRegistering,
}: RegistrationModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Register Event"
      description={eventTitle}
      size="md"
    >
      <div className="space-y-4 mb-6">
        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
          <p className="text-gray-600 text-sm">
            You&apos;re about to register for this event. Click confirm to secure your spot!
          </p>
        </div>
      </div>
      <button
        onClick={onRegister}
        disabled={isRegistering}
        className="w-full py-4 bg-gradient-to-r from-ppia-red to-red-600 text-white rounded-2xl font-bold hover:from-ppia-red-dark hover:to-red-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
      >
        {isRegistering ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Processing...
          </span>
        ) : (
          "Confirm Registration"
        )}
      </button>
    </Modal>
  );
}

export default function EventDetail({ event }: { event: PublicEvent }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const { showSuccess, showError } = useToast();

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  // Check if event has ended or registration deadline passed
  const eventEndDate = event.endDate || event.startDate;
  const isEventEnded = new Date(eventEndDate) < new Date();
  const isRegistrationClosed =
    !!event.registrationDeadline && new Date(event.registrationDeadline) < new Date();
  const canRegister = !isEventEnded && !isRegistrationClosed;

  const handleRegister = async () => {
    setIsRegistering(true);
    try {
      await api.registerForEvent(event.id);
      showSuccess("Registered successfully!");
      setModalOpen(false);
    } catch (error) {
      const message =
        typeof error === "object" && error !== null && "message" in error
          ? String((error as { message?: unknown }).message)
          : "Registration failed. Please try again.";
      showError(message);
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pt-16 pb-16 max-w-7xl mx-auto px-6">

        {/* Hero Banner - Full Width */}
        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden mb-8">
          {event.imageUrl && (
            <div className="w-full">
              <img src={event.imageUrl} alt={event.title} className="w-full h-auto max-h-[500px] object-contain bg-gray-100" />
            </div>
          )}
          <div className="p-8 md:p-10">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-navy mb-6 max-w-3xl leading-tight">
              {event.title}
            </h1>
            <div className="flex flex-wrap gap-4 text-gray-600">
              <span className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-full text-sm font-medium">
                <Calendar size={16} className="text-ppia-red" /> {formatDate(event.startDate)}
              </span>
              <span className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-full text-sm font-medium">
                <Clock size={16} className="text-ppia-red" /> {formatTime(event.startDate)}
              </span>
              {event.location && (
                <span className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-full text-sm font-medium">
                  <MapPin size={16} className="text-ppia-red" /> {event.location}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Back Link */}
        <div className="mb-8">
          <Link href="/activities/events" className="inline-flex items-center gap-2 text-gray-500 hover:text-ppia-red transition-colors text-sm font-medium">
            <ArrowLeft size={16} /> Back to Events
          </Link>
        </div>

        {/* Main Content with Sidebar */}
        <div className="grid lg:grid-cols-3 gap-12">
          {/* Left Content - About */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-3xl p-8 md:p-10 shadow-lg border border-gray-100">
              <h2 className="text-2xl font-bold text-navy mb-6 flex items-center gap-3">
                <span className="w-1 h-8 bg-ppia-red rounded-full" />
                About This Event
              </h2>
              <div
                className="prose prose-lg max-w-none text-gray-600 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(event.description) }}
              />
            </div>

            {/* Renders nothing until the committee has uploaded documentation,
                so upcoming events are unaffected. */}
            <EventGallery slug={event.slug} />
          </div>

          {/* Right Sidebar - Registration Card */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 shadow-xl border-2 border-gray-100 sticky top-24 overflow-hidden relative">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-ppia-red to-orange-500" />
              <div className="text-center mb-6">
                <p className="text-gray-500 text-sm mb-1">Event Price</p>
                <div className="text-4xl font-bold text-navy">
                  {event.isFree ? "Free" : `NZ$${event.isFree ? 0 : 'TBA'}`}
                </div>
                {event.isFree && <span className="inline-block mt-2 px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">FREE EVENT</span>}
              </div>

              {canRegister ? (
                <button
                  onClick={() => setModalOpen(true)}
                  className="w-full py-4 bg-gradient-to-r from-ppia-red to-red-600 text-white rounded-2xl font-bold text-lg hover:from-ppia-red-dark hover:to-red-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 mb-4"
                >
                  Register Now
                </button>
              ) : (
                <div className="w-full py-4 bg-gray-200 text-gray-500 rounded-2xl font-bold text-lg text-center mb-4">
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
              <div className="space-y-3 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-2xl">
                  <div className="w-10 h-10 bg-ppia-red/10 rounded-xl flex items-center justify-center">
                    <Calendar className="text-ppia-red" size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Date</p>
                    <p className="font-semibold text-navy text-sm">{formatDate(event.startDate)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-2xl">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Clock className="text-blue-600" size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Time</p>
                    <p className="font-semibold text-navy text-sm">{formatTime(event.startDate)}{event.endDate && ` - ${formatTime(event.endDate)}`}</p>
                  </div>
                </div>

                {event.location && (
                  <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-2xl">
                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                      <MapPin className="text-green-600" size={20} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Location</p>
                      <p className="font-semibold text-navy text-sm">{event.location}</p>
                    </div>
                  </div>
                )}

                {event.capacity && (
                  <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-2xl">
                    <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                      <Users className="text-purple-600" size={20} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Spots Available</p>
                      <p className="font-semibold text-navy text-sm">{event.capacity} spots</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      <RegistrationModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onRegister={handleRegister}
        eventTitle={event.title}
        isRegistering={isRegistering}
      />
    </div>
  );
}
