'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Calendar,
  CalendarClock,
  CheckCircle2,
  Clock,
  Hourglass,
  MapPin,
  Ticket,
  Users,
  XCircle,
} from 'lucide-react';
import Image from 'next/image';
import api from '@/lib/api';
import { useToast } from '@/components/Toast';
import { useConfirm, ConfirmHost } from '@/hooks/useConfirm';
import { cn, getImageUrl } from '@/lib/utils';
import { Badge, Button } from '@/components/ui';
import AddToCalendarButton from '@/components/AddToCalendarButton';
import {
  DetailItem,
  EmptyBlock,
  PageHeading,
  PageLoading,
  PageStack,
  SectionCard,
} from '@/components/dashboard';
import { sanitizeHtml } from '@/lib/sanitize-html';

interface EventDetail {
  id: string;
  slug: string;
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  location?: string;
  imageUrl?: string;
  capacity?: number;
  isFree?: boolean;
  registrationDeadline?: string;
}

interface EventResponse {
  event?: EventDetail;
  id?: string;
}

interface MyRegistration {
  id: string;
  status: string;
  checkInCode?: string;
  Event?: { id?: string };
}

/**
 * Typography for CMS-authored bodies. The project has no typography plugin, so
 * element styles are declared explicitly here.
 */
const RICH_TEXT_CLASS = cn(
  'max-w-none text-sm leading-relaxed ink-body',
  '[&_p]:my-3 [&_strong]:font-bold [&_em]:italic',
  '[&_h1]:font-display [&_h1]:text-2xl [&_h1]:font-black [&_h1]:mt-6 [&_h1]:mb-2',
  '[&_h2]:font-display [&_h2]:text-xl [&_h2]:font-black [&_h2]:mt-6 [&_h2]:mb-2',
  '[&_h3]:font-display [&_h3]:text-lg [&_h3]:font-bold [&_h3]:mt-5 [&_h3]:mb-2',
  '[&_h1]:text-slate-900 [&_h2]:text-slate-900 [&_h3]:text-slate-900',
  'dark:[&_h1]:text-slate-50 dark:[&_h2]:text-slate-50 dark:[&_h3]:text-slate-50',
  '[&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6',
  '[&_a]:text-[#E8231A] [&_a]:underline',
  '[&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:border-[#E8231A] [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-slate-500',
  '[&_img]:rounded-[5px]'
);

/** Log-entry form: 05 Mar 2025. */
function formatFullDate(value: string): string {
  return new Date(value).toLocaleDateString('en-NZ', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString('en-NZ', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function DashboardEventDetailPage() {
  const params = useParams();
  const slug = typeof params.slug === 'string' ? params.slug : undefined;
  const { showError, showSuccess } = useToast();
  const confirmCtx = useConfirm();

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [myRegistration, setMyRegistration] = useState<MyRegistration | null>(null);
  const [cancelling, setCancelling] = useState(false);
  /** Captured once the event loads, so "has this started?" stays stable during render. */
  const [nowTs, setNowTs] = useState(0);

  const fetchEvent = useCallback(async () => {
    if (!slug) return;
    try {
      // Try by slug first, fall back to treating the segment as an id.
      let res: EventResponse;
      try {
        res = (await api.getEventBySlug(slug)) as EventResponse;
      } catch {
        res = (await api.getEvent(slug)) as EventResponse;
      }
      const found = res.event ?? (res.id ? (res as unknown as EventDetail) : undefined);
      if (found) {
        setEvent(found);
        setNowTs(Date.now());
      } else {
        setError('Event not found');
      }
    } catch (err) {
      console.error('Failed to fetch event:', err);
      setError('Event not found');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  /**
   * This member's own registration for this event, if any — the same call the
   * dashboard home page already makes, filtered down to one event. It is what
   * decides whether the sidebar offers "Register" or shows the member's status.
   */
  const loadMyRegistration = useCallback(async (eventId: string) => {
    try {
      const res = (await api.getMyRegistrations()) as { registrations?: MyRegistration[] };
      const mine = (res.registrations ?? []).find(
        (r) => r.Event?.id === eventId && r.status !== 'CANCELLED'
      );
      setMyRegistration(mine ?? null);
    } catch (err) {
      // Not fatal to the page — registering will still surface its own error.
      console.error('Failed to fetch my registration:', err);
    }
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect --
     fetchEvent() only writes state after awaiting the network request; the
     linter cannot see past the await. */
  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /* eslint-disable react-hooks/set-state-in-effect --
     loadMyRegistration() only writes state after awaiting the network
     request; the linter cannot see past the await. */
  useEffect(() => {
    if (event?.id) loadMyRegistration(event.id);
  }, [event?.id, loadMyRegistration]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // nowTs is captured once the event loads (see fetchEvent), so these read a
  // fixed value rather than calling Date.now() during render. Cheap enough to
  // recompute on every render, so no memoization is needed.
  const eventEndDate = event?.endDate || event?.startDate;
  const isEventEnded = !!eventEndDate && !!nowTs && new Date(eventEndDate).getTime() < nowTs;
  const isRegistrationClosed =
    !!event?.registrationDeadline &&
    !!nowTs &&
    new Date(event.registrationDeadline).getTime() < nowTs;
  const canRegister = !isEventEnded && !isRegistrationClosed;

  const handleCancel = async () => {
    if (!myRegistration) return;
    const ok = await confirmCtx.confirm({
      title: 'Cancel your registration?',
      message: 'You can register again later if there is still room.',
      confirmLabel: 'Yes, cancel',
      variant: 'danger',
    });
    if (!ok) return;
    setCancelling(true);
    try {
      await api.cancelRegistration(myRegistration.id);
      showSuccess('Registration cancelled');
      setMyRegistration(null);
    } catch (err) {
      const error = err as { response?: { data?: { error?: string } }; message?: string };
      showError(error.response?.data?.error || error.message || 'Could not cancel your registration');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return <PageLoading label="Loading event…" />;
  }

  if (error || !event) {
    return (
      <PageStack>
        <PageHeading title="Event" backHref="/dashboard/events" backLabel="Back to all events" />
        <SectionCard flush>
          <EmptyBlock
            icon={Calendar}
            title="Event not found"
            description="The link may have changed, or the event has been removed."
            action={
              <Link href="/dashboard/events">
                <Button variant="primary">Go to all events</Button>
              </Link>
            }
          />
        </SectionCard>
      </PageStack>
    );
  }

  const bannerImageUrl = getImageUrl(event.imageUrl);
  const hasHtmlDescription = Boolean(
    event.description && /<[a-z][\s\S]*>/i.test(event.description)
  );

  return (
    <PageStack>
      <PageHeading
        eyebrow="Community calendar"
        title={event.title}
        icon={Calendar}
        backHref="/dashboard/events"
        backLabel="Back to all events"
        actions={
          <Badge variant={event.isFree ? 'success' : 'warning'} size="md">
            {event.isFree ? 'Free' : 'Paid'}
          </Badge>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {bannerImageUrl && (
            <SectionCard flush>
              <div className="relative h-56 w-full overflow-hidden bg-[#EDF5FB] sm:h-72 lg:h-96 dark:bg-slate-800">
                {/* Above the fold and the largest image here, so it loads eagerly. */}
                <Image
                  src={bannerImageUrl}
                  alt=""
                  fill
                  priority
                  sizes="(min-width: 1024px) 66vw, 100vw"
                  className="object-cover"
                />
              </div>
            </SectionCard>
          )}

          <SectionCard title="About this event" icon={Ticket}>
            {event.description ? (
              <div className={RICH_TEXT_CLASS}>
                {hasHtmlDescription ? (
                  <div
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(event.description) }}
                  />
                ) : (
                  <p>{event.description}</p>
                )}
              </div>
            ) : (
              <p className="text-sm italic ink-muted">No event description yet.</p>
            )}
          </SectionCard>
        </div>

        <SectionCard title="Details" description="Time and place" className="lg:sticky lg:top-6">
          <div className="space-y-5">
            {/* Times, counts and deadlines are readings, so they are set in the
                data face inside the shared detail row. */}
            <DetailItem
              label="Date"
              value={<span className="data-type">{formatFullDate(event.startDate)}</span>}
              icon={Calendar}
            />
            <DetailItem
              label="Starts"
              value={<span className="data-type">{formatTime(event.startDate)}</span>}
              icon={Clock}
            />
            {event.endDate && (
              <DetailItem
                label="Ends"
                value={
                  <span className="data-type">
                    {formatFullDate(event.endDate)} • {formatTime(event.endDate)}
                  </span>
                }
                icon={Clock}
              />
            )}
            {event.location && (
              <DetailItem label="Location" value={event.location} icon={MapPin} />
            )}
            {event.capacity && (
              <DetailItem
                label="Capacity"
                value={<span className="data-type">{event.capacity} attendees</span>}
                icon={Users}
              />
            )}
            {event.registrationDeadline && (
              <DetailItem
                label="Registration deadline"
                value={
                  <span className="data-type">{formatFullDate(event.registrationDeadline)}</span>
                }
                icon={CalendarClock}
              />
            )}

            {/*
              Registration action: this page used to stop at "Add to
              calendar", with no way to actually register. The form itself
              (name, university, education level, major) lives on the public
              route so members and guests share one implementation; this is
              the state and the door into it.
            */}
            <div className="border-t border-[#DCE7F1] pt-5 dark:border-slate-800">
              {myRegistration ? (
                <div
                  className={cn(
                    'flex items-start gap-3 rounded-[5px] border px-4 py-3.5',
                    myRegistration.status === 'WAITLISTED'
                      ? 'border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30'
                      : 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/30'
                  )}
                >
                  {myRegistration.status === 'WAITLISTED' ? (
                    <Hourglass className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  ) : (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        'text-sm font-semibold',
                        myRegistration.status === 'WAITLISTED'
                          ? 'text-amber-800 dark:text-amber-200'
                          : 'text-emerald-800 dark:text-emerald-200'
                      )}
                    >
                      {myRegistration.status === 'WAITLISTED'
                        ? "You're on the waitlist"
                        : "You're registered"}
                    </p>
                    {myRegistration.checkInCode && myRegistration.status !== 'WAITLISTED' && (
                      <p className="mt-1 text-xs ink-muted">
                        Check-in code:{' '}
                        <span className="data-type font-bold ink-strong">
                          {myRegistration.checkInCode}
                        </span>
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={handleCancel}
                      disabled={cancelling}
                      className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[#C41E16] transition-colors hover:text-[#E8231A] disabled:opacity-60"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      {cancelling ? 'Cancelling…' : 'Cancel registration'}
                    </button>
                  </div>
                </div>
              ) : canRegister ? (
                <Link href={`/activities/events/${event.slug}/register`} className="block">
                  <Button variant="primary" className="w-full">
                    Register for this event
                  </Button>
                </Link>
              ) : (
                <div className="data-type w-full rounded-[5px] border border-[#DCE7F1] bg-white/60 py-3 text-center text-[12px] font-bold uppercase ink-muted dark:border-slate-800 dark:bg-slate-900/40">
                  {isEventEnded ? 'Event ended' : 'Registration closed'}
                </div>
              )}
            </div>

            <div className="border-t border-[#DCE7F1] pt-5 dark:border-slate-800">
              <AddToCalendarButton
                event={{
                  slug: event.slug,
                  title: event.title,
                  description: event.description,
                  location: event.location,
                  startDate: event.startDate,
                  endDate: event.endDate,
                }}
              />
            </div>
          </div>
        </SectionCard>
      </div>

      <ConfirmHost ctx={confirmCtx} />
    </PageStack>
  );
}
