'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Calendar, CalendarCheck, CalendarClock, Clock, MapPin, Users } from 'lucide-react';
import api from '@/lib/api';
import { getImageUrl } from '@/lib/utils';
import { Badge } from '@/components/ui';
import {
  EmptyBlock,
  LoadingCards,
  PageHeading,
  PageStack,
  ResetFiltersButton,
  SearchField,
  SectionCard,
  StatTile,
  StatTileRow,
  Toolbar,
} from '@/components/dashboard';

interface EventItem {
  id: string;
  slug?: string;
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

interface EventsApiResponse {
  events?: EventItem[];
}

type TimeFilter = 'all' | 'upcoming' | 'past';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, '').trim();
}

function formatEventDate(value: string): string {
  return new Date(value).toLocaleDateString('en-NZ', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatEventTime(value: string): string {
  return new Date(value).toLocaleTimeString('en-NZ', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function DashboardEventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  /**
   * "Upcoming" is measured against the moment the list was fetched. Keeping the
   * cutoff in state rather than calling Date.now() while rendering keeps render
   * pure, which React Compiler requires.
   */
  const [fetchedAt, setFetchedAt] = useState(0);

  const fetchEvents = useCallback(async () => {
    try {
      const res = (await api.getEvents({ limit: 50 })) as EventsApiResponse;
      setEvents(Array.isArray(res.events) ? res.events : []);
      setFetchedAt(Date.now());
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect --
     fetchEvents() only writes state after awaiting the network request; the
     linter cannot see past the await. */
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const counts = useMemo(() => {
    const upcoming = events.filter(
      (event) => new Date(event.startDate).getTime() >= fetchedAt
    ).length;
    return { all: events.length, upcoming, past: events.length - upcoming };
  }, [events, fetchedAt]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return events
      .filter((event) => {
        const isUpcoming = new Date(event.startDate).getTime() >= fetchedAt;
        if (timeFilter === 'upcoming' && !isUpcoming) return false;
        if (timeFilter === 'past' && isUpcoming) return false;
        if (!query) return true;
        return (
          event.title.toLowerCase().includes(query) ||
          (event.location || '').toLowerCase().includes(query) ||
          stripHtml(event.description || '')
            .toLowerCase()
            .includes(query)
        );
      })
      .sort((a, b) => {
        const aStart = new Date(a.startDate).getTime();
        const bStart = new Date(b.startDate).getTime();
        const aUpcoming = aStart >= fetchedAt;
        const bUpcoming = bStart >= fetchedAt;
        // Upcoming first (soonest at the top), then past events newest first.
        if (aUpcoming !== bUpcoming) return aUpcoming ? -1 : 1;
        return aUpcoming ? aStart - bStart : bStart - aStart;
      });
  }, [events, search, timeFilter, fetchedAt]);

  const hasFilters = timeFilter !== 'all' || search.trim().length > 0;

  const resetFilters = () => {
    setTimeFilter('all');
    setSearch('');
  };

  return (
    <PageStack>
      <PageHeading
        eyebrow="Community calendar"
        title="Events"
        description="Activities and gatherings hosted by PPIA Auckland."
        icon={Calendar}
      />

      <StatTileRow columns={3}>
        <StatTile
          label="All events"
          value={counts.all}
          tone="slate"
          icon={Calendar}
          active={timeFilter === 'all'}
          onClick={() => setTimeFilter('all')}
        />
        <StatTile
          label="Upcoming"
          value={counts.upcoming}
          tone="red"
          icon={CalendarCheck}
          active={timeFilter === 'upcoming'}
          onClick={() => setTimeFilter('upcoming')}
        />
        <StatTile
          label="Past"
          value={counts.past}
          tone="sky"
          icon={CalendarClock}
          active={timeFilter === 'past'}
          onClick={() => setTimeFilter('past')}
        />
      </StatTileRow>

      <Toolbar>
        <SearchField
          value={search}
          onChange={setSearch}
          placeholder="Search by title, location, or description…"
          ariaLabel="Search events"
        />
        {hasFilters && <ResetFiltersButton onClick={resetFilters} />}
      </Toolbar>

      {loading ? (
        <LoadingCards count={6} columns={3} />
      ) : filtered.length === 0 ? (
        <SectionCard flush>
          <EmptyBlock
            icon={Calendar}
            title={hasFilters ? 'No matching events' : 'No events yet'}
            description={
              hasFilters
                ? 'Try another keyword or clear the filters to see the whole calendar.'
                : 'The community calendar will appear here once events are published.'
            }
          />
        </SectionCard>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((event) => {
            const image = getImageUrl(event.imageUrl);
            const description = stripHtml(event.description || '');
            const start = new Date(event.startDate);
            return (
              <Link
                key={event.id}
                href={`/dashboard/events/${event.slug || slugify(event.title)}`}
                className="group block h-full"
              >
                <SectionCard
                  flush
                  bodyClassName="flex h-full flex-col"
                  className="h-full transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg dark:hover:border-slate-700"
                >
                  <div className="relative h-40 overflow-hidden bg-slate-100 dark:bg-slate-800">
                    {image ? (
                      <Image
                        src={image}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Calendar className="h-10 w-10 text-slate-300 dark:text-slate-600" />
                      </div>
                    )}
                    <span className="absolute left-3 top-3 flex h-12 w-12 flex-col items-center justify-center rounded-xl bg-[#0D1B33] text-white shadow-lg">
                      <span className="text-[10px] font-semibold uppercase leading-none">
                        {start.toLocaleDateString('en-NZ', { month: 'short' })}
                      </span>
                      <span className="font-display text-lg font-black leading-none">
                        {start.getDate()}
                      </span>
                    </span>
                    <span className="absolute right-3 top-3">
                      <Badge variant={event.isFree ? 'success' : 'warning'}>
                        {event.isFree ? 'Free' : 'Paid'}
                      </Badge>
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="line-clamp-2 font-display text-base font-bold leading-snug text-slate-900 transition-colors group-hover:text-[#E8231A] dark:text-slate-50">
                      {event.title}
                    </h3>
                    {description && (
                      <p className="mb-4 mt-2 line-clamp-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                        {description}
                      </p>
                    )}
                    <dl className="mt-auto space-y-1.5 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <dt className="sr-only">Time</dt>
                        <dd>
                          {formatEventDate(event.startDate)} • {formatEventTime(event.startDate)}
                        </dd>
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <dt className="sr-only">Location</dt>
                          <dd className="line-clamp-1">{event.location}</dd>
                        </div>
                      )}
                      {event.capacity && (
                        <div className="flex items-center gap-2">
                          <Users className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <dt className="sr-only">Capacity</dt>
                          <dd>{event.capacity} attendees</dd>
                        </div>
                      )}
                    </dl>
                  </div>
                </SectionCard>
              </Link>
            );
          })}
        </div>
      )}
    </PageStack>
  );
}
