"use client";

/**
 * Full-page event registration form.
 *
 * Moved out of the modal so long, admin-built forms have room to breathe.
 * Registration requires an account: the default fields pre-fill from the
 * member's profile, and the check-in code ties to their user.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/lib/auth-context";
import {
  resolveEventFields,
  prefillResponses,
  validateResponses,
  type RegAnswer,
  type RegResponses,
} from "@/lib/event-registration";
import type { PublicEvent } from "@/lib/server-api";
import { ArrowLeft, CalendarClock, CheckCircle2, Loader2, MapPin } from "lucide-react";

const FIELD_INPUT =
  "w-full rounded-[4px] border border-[#C3D2E0] bg-white px-3.5 py-3 text-sm text-[#0F1B33] focus:border-ppia-red focus:outline-none";

export default function EventRegisterForm({ event }: { event: PublicEvent }) {
  const router = useRouter();
  const { showError } = useToast();
  const { user, isLoading, isAuthenticated } = useAuth();

  const fields = useMemo(() => resolveEventFields(event.registrationFields), [event.registrationFields]);

  const [responses, setResponses] = useState<RegResponses>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [prefilled, setPrefilled] = useState(false);

  const registerHref = `/activities/events/${event.slug}/register`;

  // Signing in is optional. The form already asks for a name (the "Full name"
  // default field, answered below), so a guest is only asked for an e-mail —
  // asking for the name a second time in a separate box was the duplicate
  // "Full name" prompt this replaces. If an admin removes that default field
  // entirely, the fallback name input below reappears so a guest can still be
  // identified.
  const [guestEmail, setGuestEmail] = useState('');
  const nameField = useMemo(() => fields.find((f) => f.prefill === 'name'), [fields]);
  const [guestNameFallback, setGuestNameFallback] = useState('');
  const guestName = nameField
    ? String(responses[nameField.id] ?? '')
    : guestNameFallback;

  // Seed the profile-backed defaults once the member's profile is available.
  useEffect(() => {
    if (user && !prefilled) {
      setResponses((current) => ({ ...prefillResponses(fields, user), ...current }));
      setPrefilled(true);
    }
  }, [user, fields, prefilled]);

  const eventEndDate = event.endDate || event.startDate;
  const isEventEnded = new Date(eventEndDate) < new Date();
  const isRegistrationClosed =
    !!event.registrationDeadline && new Date(event.registrationDeadline) < new Date();
  const canRegister = !isEventEnded && !isRegistrationClosed;

  const setValue = (id: string, value: RegAnswer) =>
    setResponses((current) => ({ ...current, [id]: value }));

  const toggleMulti = (id: string, option: string) => {
    setResponses((current) => {
      const arr = Array.isArray(current[id]) ? (current[id] as string[]) : [];
      const next = arr.includes(option) ? arr.filter((o) => o !== option) : [...arr, option];
      return { ...current, [id]: next };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      if (!guestEmail.trim()) {
        showError('Please enter your e-mail so we can confirm your place.');
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail.trim())) {
        showError('Please enter a valid e-mail address.');
        return;
      }
      if (!guestName.trim()) {
        showError('Please enter your name so we can confirm your place.');
        return;
      }
    }
    const clientErrors = validateResponses(fields, responses);
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      // Scroll to the first error so it is not missed on a long form.
      const firstId = fields.find((f) => clientErrors[f.id])?.id;
      if (firstId) document.getElementById(`field-${firstId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      await api.registerForEvent(
        event.id,
        responses,
        isAuthenticated ? undefined : { name: guestName.trim(), email: guestEmail.trim() }
      );
      setDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      const message =
        typeof error === "object" && error !== null && "message" in error
          ? String((error as { message?: unknown }).message)
          : "Registration failed. Please try again.";
      showError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-NZ", { day: "2-digit", month: "short", year: "numeric" });
  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString("en-NZ", { hour: "2-digit", minute: "2-digit", hour12: false });

  // Wait only for the auth check itself, so a member's details can pre-fill
  // before the form paints. Guests continue straight to the form.
  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#94A3B8]" />
      </div>
    );
  }

  return (
    <div className="sea-shore relative min-h-screen">
      {/* pt-28 clears the fixed navbar (72px) with room to spare — pt-16 was
          tucking "Back to event" half under the bar. */}
      <div className="relative mx-auto max-w-2xl px-6 pb-20 pt-28">
        <Link
          href={`/activities/events/${event.slug}`}
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#5B6B7C] hover:text-ppia-red"
        >
          <ArrowLeft size={16} />
          Back to event
        </Link>

        {done ? (
          <div className="chart-paper rounded-[5px] border border-[#DCE7F1] p-8 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#0B7A55]/12">
              <CheckCircle2 className="h-8 w-8 text-[#0B7A55]" />
            </div>
            <h1 className="text-2xl font-bold text-[#0F1B33]">You&apos;re registered!</h1>
            <p className="mt-2 text-[#5B6B7C]">
              We&apos;ve saved your spot for <span className="font-semibold">{event.title}</span>. A
              confirmation with your check-in code has been sent to you.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {/* "My registrations" only exists behind a login. */}
              {isAuthenticated ? (
                <Link
                  href="/dashboard/events"
                  className="rounded-[3px] bg-gradient-to-r from-ppia-red to-red-600 px-6 py-3 font-bold text-white transition-all hover:from-ppia-red-dark hover:to-red-700"
                >
                  My registrations
                </Link>
              ) : (
                <Link
                  href="/activities/events"
                  className="rounded-[3px] bg-gradient-to-r from-ppia-red to-red-600 px-6 py-3 font-bold text-white transition-all hover:from-ppia-red-dark hover:to-red-700"
                >
                  Browse more events
                </Link>
              )}
              <Link
                href={`/activities/events/${event.slug}`}
                className="rounded-[3px] border border-[#C3D2E0] px-6 py-3 font-semibold text-[#0F1B33] transition-colors hover:bg-white"
              >
                Back to event
              </Link>
            </div>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-[#0F1B33] md:text-3xl">Register for this event</h1>
            <p className="mt-1.5 text-lg font-semibold text-ppia-red">{event.title}</p>
            <div className="data-type mt-3 flex flex-wrap items-center gap-3 text-[12px] uppercase ink-muted">
              <span className="flex items-center gap-1.5">
                <CalendarClock size={12} className="text-ppia-red" /> {formatDate(event.startDate)} · {formatTime(event.startDate)}
              </span>
              {event.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin size={12} className="text-ppia-red" /> {event.location}
                </span>
              )}
            </div>

            <div aria-hidden="true" className="rope-rule my-6" />

            {!canRegister ? (
              <div className="chart-paper rounded-[5px] border border-[#DCE7F1] p-6 text-center">
                <p className="font-semibold text-[#0F1B33]">
                  {isEventEnded ? "This event has ended." : "Registration is closed."}
                </p>
                <p className="mt-1 text-sm text-[#5B6B7C]">
                  You can no longer register for this event.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Guests identify themselves; members are already known. */}
                {!isAuthenticated && (
                  <div className="chart-paper space-y-5 rounded-[5px] border border-[#DCE7F1] p-5">
                    <div>
                      <p className="text-sm font-semibold text-[#0F1B33]">Your contact details</p>
                      <p className="mt-1 text-[13px] text-[#5B6B7C]">
                        No account needed. Already a member?{' '}
                        <Link
                          href={`/login?redirect=${encodeURIComponent(registerHref)}`}
                          className="font-semibold text-ppia-red hover:underline"
                        >
                          Sign in
                        </Link>{' '}
                        to have this filled in for you.
                      </p>
                    </div>
                    {/* Only shown if an admin removed the "Full name" default
                        field — otherwise the answer to that field below is used,
                        so this box does not duplicate it. */}
                    {!nameField && (
                      <div>
                        <label
                          htmlFor="guest-name"
                          className="mb-1.5 block text-sm font-semibold text-[#0F1B33]"
                        >
                          Full name<span className="text-ppia-red"> *</span>
                        </label>
                        <input
                          id="guest-name"
                          type="text"
                          value={guestNameFallback}
                          onChange={(e) => setGuestNameFallback(e.target.value)}
                          className={FIELD_INPUT}
                          autoComplete="name"
                        />
                      </div>
                    )}
                    <div>
                      <label
                        htmlFor="guest-email"
                        className="mb-1.5 block text-sm font-semibold text-[#0F1B33]"
                      >
                        Email address<span className="text-ppia-red"> *</span>
                      </label>
                      <input
                        id="guest-email"
                        type="email"
                        value={guestEmail}
                        onChange={(e) => setGuestEmail(e.target.value)}
                        className={FIELD_INPUT}
                        autoComplete="email"
                      />
                      <p className="mt-1 text-xs text-[#5B6B7C]">
                        We send your confirmation and check-in code here.
                      </p>
                    </div>
                  </div>
                )}

                {fields.map((field) => {
                  const value = responses[field.id];
                  const err = errors[field.id];
                  const selected = Array.isArray(value) ? value : [];
                  return (
                    <div key={field.id} id={`field-${field.id}`}>
                      <label className="mb-1.5 block text-sm font-semibold text-[#0F1B33]">
                        {field.label}
                        {field.required && <span className="text-ppia-red"> *</span>}
                      </label>

                      {field.type === "short_text" && (
                        <input
                          type="text"
                          value={typeof value === "string" ? value : ""}
                          onChange={(e) => setValue(field.id, e.target.value)}
                          className={FIELD_INPUT}
                        />
                      )}

                      {field.type === "long_text" && (
                        <textarea
                          rows={4}
                          value={typeof value === "string" ? value : ""}
                          onChange={(e) => setValue(field.id, e.target.value)}
                          className={`${FIELD_INPUT} resize-y`}
                        />
                      )}

                      {field.type === "single_choice" && (
                        <div className="space-y-2">
                          {(field.options ?? []).map((opt) => (
                            <label key={opt} className="flex cursor-pointer items-center gap-2.5 text-sm text-[#334155]">
                              <input
                                type="radio"
                                name={field.id}
                                checked={value === opt}
                                onChange={() => setValue(field.id, opt)}
                                className="h-4 w-4 text-ppia-red focus:ring-ppia-red"
                              />
                              {opt}
                            </label>
                          ))}
                        </div>
                      )}

                      {field.type === "multiple_choice" && (
                        <div className="space-y-2">
                          {(field.options ?? []).map((opt) => (
                            <label key={opt} className="flex cursor-pointer items-center gap-2.5 text-sm text-[#334155]">
                              <input
                                type="checkbox"
                                checked={selected.includes(opt)}
                                onChange={() => toggleMulti(field.id, opt)}
                                className="h-4 w-4 rounded text-ppia-red focus:ring-ppia-red"
                              />
                              {opt}
                            </label>
                          ))}
                        </div>
                      )}

                      {err && <p className="mt-1 text-xs text-ppia-red">{err}</p>}
                    </div>
                  );
                })}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-[3px] bg-gradient-to-r from-ppia-red to-red-600 py-4 font-bold text-white shadow-lg transition-all hover:from-ppia-red-dark hover:to-red-700 disabled:opacity-70"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting...
                    </span>
                  ) : (
                    "Confirm Registration"
                  )}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
