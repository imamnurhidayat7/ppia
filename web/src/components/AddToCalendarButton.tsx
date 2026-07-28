'use client';

/**
 * "Add to calendar" control.
 *
 * Two routes are offered because they work differently:
 *
 *   Download (.ics)   — served by the API, imports into Apple Calendar, Outlook
 *                       and anything else that reads iCalendar. The file is
 *                       generated server-side so the details always match the
 *                       database, even if this page was cached.
 *   Google Calendar   — Google does not import a local file from a click, so it
 *                       gets a pre-filled template URL instead.
 *
 * Subscribing to the whole programme is a separate control; see
 * `SubscribeToCalendarLink` below.
 */

import { useEffect, useRef, useState } from 'react';
import { CalendarPlus, Check, Download, ExternalLink, Rss } from 'lucide-react';
import { toPlainText } from '@/lib/sanitize-html';
import { API_ORIGIN as API_URL } from '@/lib/api-base';

export interface CalendarEventInput {
  slug: string;
  title: string;
  description?: string | null;
  location?: string | null;
  startDate: string;
  endDate?: string | null;
}

/** Events with no end time get a two-hour block, matching the API's .ics output. */
const DEFAULT_DURATION_MS = 2 * 60 * 60 * 1000;

/** Google expects compact UTC stamps: 20260214T210000Z. */
const toCompactUtc = (date: Date): string =>
  `${date.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;

const buildGoogleCalendarUrl = (event: CalendarEventInput): string => {
  const start = new Date(event.startDate);
  const end = event.endDate
    ? new Date(event.endDate)
    : new Date(start.getTime() + DEFAULT_DURATION_MS);

  // Descriptions are stored as HTML; Google shows this field as text.
  const details = [
    event.description ? toPlainText(event.description) : '',
    `${window.location.origin}/activities/events/${event.slug}`,
  ]
    .filter(Boolean)
    .join('\n\n');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${toCompactUtc(start)}/${toCompactUtc(end)}`,
    details,
    ...(event.location ? { location: event.location } : {}),
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

interface AddToCalendarButtonProps {
  event: CalendarEventInput;
  /** `full` stretches to the container width, matching adjacent CTA buttons. */
  variant?: 'full' | 'inline';
  className?: string;
}

export default function AddToCalendarButton({
  event,
  variant = 'full',
  className = '',
}: AddToCalendarButtonProps) {
  const [open, setOpen] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click and on Escape, so the menu never strands the user.
  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const icsUrl = `${API_URL}/api/events/slug/${encodeURIComponent(event.slug)}/calendar.ics`;
  const isFull = variant === 'full';

  return (
    <div ref={containerRef} className={`relative ${isFull ? 'w-full' : 'inline-block'} ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`${
          isFull ? 'w-full justify-center py-3.5' : 'px-4 py-2.5'
        } inline-flex items-center gap-2 rounded-2xl border-2 border-navy/10 bg-white font-semibold text-navy transition-all hover:border-ppia-red/30 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ppia-red focus-visible:ring-offset-2`}
      >
        <CalendarPlus size={18} className="text-ppia-red" />
        Add to calendar
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Add to calendar"
          className="absolute left-0 right-0 z-30 mt-2 min-w-[15rem] overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl"
        >
          <a
            href={icsUrl}
            // `download` is advisory here: the API already sends
            // Content-Disposition: attachment, which is what actually decides.
            download
            role="menuitem"
            onClick={() => {
              setDownloaded(true);
              setOpen(false);
            }}
            className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-navy transition-colors hover:bg-gray-50"
          >
            {downloaded ? (
              <Check size={16} className="text-green-600" />
            ) : (
              <Download size={16} className="text-gray-400" />
            )}
            <span>
              Apple, Outlook, other
              <span className="block text-xs font-normal text-gray-500">Downloads an .ics file</span>
            </span>
          </a>

          <a
            href={buildGoogleCalendarUrl(event)}
            target="_blank"
            rel="noopener noreferrer"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 border-t border-gray-100 px-4 py-3 text-sm font-medium text-navy transition-colors hover:bg-gray-50"
          >
            <ExternalLink size={16} className="text-gray-400" />
            <span>
              Google Calendar
              <span className="block text-xs font-normal text-gray-500">Opens a new tab</span>
            </span>
          </a>
        </div>
      )}
    </div>
  );
}

/**
 * Link to the whole-programme feed.
 *
 * Calendar apps that support subscriptions can be pointed at the same URL to
 * stay in sync as events are added.
 */
export function SubscribeToCalendarLink({ className = '' }: { className?: string }) {
  return (
    <a
      href={`${API_URL}/api/events/calendar.ics`}
      className={`inline-flex items-center gap-2 rounded-full border border-navy/10 bg-white px-4 py-2 text-sm font-semibold text-navy transition-all hover:border-ppia-red/30 hover:text-ppia-red ${className}`}
    >
      <Rss size={14} className="text-ppia-red" />
      Subscribe to the events calendar
    </a>
  );
}
