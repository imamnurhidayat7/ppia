'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Calendar, CalendarClock, Clock, MapPin, Ticket, Users } from 'lucide-react';
import Image from 'next/image';
import api from '@/lib/api';
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

/**
 * Typography for CMS-authored bodies. The project has no typography plugin, so
 * element styles are declared explicitly here.
 */
const RICH_TEXT_CLASS = cn(
  'max-w-none text-sm leading-relaxed text-slate-700 dark:text-slate-300',
  '[&_p]:my-3 [&_strong]:font-bold [&_em]:italic',
  '[&_h1]:font-display [&_h1]:text-2xl [&_h1]:font-black [&_h1]:mt-6 [&_h1]:mb-2',
  '[&_h2]:font-display [&_h2]:text-xl [&_h2]:font-black [&_h2]:mt-6 [&_h2]:mb-2',
  '[&_h3]:font-display [&_h3]:text-lg [&_h3]:font-bold [&_h3]:mt-5 [&_h3]:mb-2',
  '[&_h1]:text-slate-900 [&_h2]:text-slate-900 [&_h3]:text-slate-900',
  'dark:[&_h1]:text-slate-50 dark:[&_h2]:text-slate-50 dark:[&_h3]:text-slate-50',
  '[&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6',
  '[&_a]:text-[#E8231A] [&_a]:underline',
  '[&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:border-[#E8231A] [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-slate-500',
  '[&_img]:rounded-xl'
);

function formatFullDate(value: string): string {
  return new Date(value).toLocaleDateString('en-NZ', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
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

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      if (res.event) {
        setEvent(res.event);
      } else if (res.id) {
        setEvent(res as unknown as EventDetail);
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

  /* eslint-disable react-hooks/set-state-in-effect --
     fetchEvent() only writes state after awaiting the network request; the
     linter cannot see past the await. */
  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);
  /* eslint-enable react-hooks/set-state-in-effect */

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
              <div className="relative h-56 w-full overflow-hidden bg-slate-100 sm:h-72 lg:h-96 dark:bg-slate-800">
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
              <p className="text-sm italic text-slate-400">No event description yet.</p>
            )}
          </SectionCard>
        </div>

        <SectionCard title="Details" description="Time and place" className="lg:sticky lg:top-6">
          <div className="space-y-5">
            <DetailItem
              label="Date"
              value={formatFullDate(event.startDate)}
              icon={Calendar}
            />
            <DetailItem label="Starts" value={formatTime(event.startDate)} icon={Clock} />
            {event.endDate && (
              <DetailItem
                label="Ends"
                value={`${formatFullDate(event.endDate)} • ${formatTime(event.endDate)}`}
                icon={Clock}
              />
            )}
            {event.location && (
              <DetailItem label="Location" value={event.location} icon={MapPin} />
            )}
            {event.capacity && (
              <DetailItem label="Capacity" value={`${event.capacity} attendees`} icon={Users} />
            )}
            {event.registrationDeadline && (
              <DetailItem
                label="Registration deadline"
                value={formatFullDate(event.registrationDeadline)}
                icon={CalendarClock}
              />
            )}

            <div className="border-t border-slate-100 pt-5 dark:border-slate-800">
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
    </PageStack>
  );
}
