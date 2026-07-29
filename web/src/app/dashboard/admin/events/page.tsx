'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import { useToast } from '@/components/Toast';
import { useConfirm, ConfirmHost } from '@/hooks/useConfirm';
import { Badge, Button } from '@/components/ui';
import {
  AccessDenied,
  EmptyBlock,
  FilterSelect,
  IconAction,
  ListPageSkeleton,
  PageHeading,
  PageStack,
  ResetFiltersButton,
  RowActions,
  SearchField,
  SectionCard,
  StatTile,
  StatTileRow,
  TableShell,
  Td,
  Th,
  Toolbar,
  Tr,
} from '@/components/dashboard';
import { cn, formatDate, getImageUrl } from '@/lib/utils';
import {
  Calendar,
  CalendarClock,
  CalendarPlus,
  ExternalLink,
  Images,
  MapPin,
  Pencil,
  RefreshCw,
  Trash2,
  Users,
} from 'lucide-react';

/** Metadata dates read as log entries: 05 Mar 2025. */
const DATE_OPTS = {
  dateStyle: undefined,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
} as const;


interface DivisionRef {
  id: string;
  name: string;
  slug?: string;
  color?: string;
}

interface AdminEvent {
  id: string;
  title: string;
  slug: string;
  description: string;
  content?: Record<string, unknown> | string;
  imageUrl?: string;
  startDate: string;
  endDate?: string;
  location?: string;
  published: boolean;
  division?: DivisionRef;
  divisionId?: string;
  author?: { id: string; name: string };
  capacity?: number;
  isFree: boolean;
  registrationDeadline?: string;
  _count?: { registrations: number };
}

/** '' = all. Tile row doubles as the status filter, same as the members page. */
type EventFilter = '' | 'published' | 'draft' | 'upcoming' | 'past';

const STATUS_LABEL: Record<Exclude<EventFilter, ''>, string> = {
  published: 'published',
  draft: 'draft',
  upcoming: 'upcoming',
  past: 'past',
};

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, '').trim();
}

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString('en-NZ', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Thumbnails come from arbitrary URLs (uploads or pasted links), so they are
 * served unoptimized and fall back to an icon when the file is missing.
 */
function EventThumb({ event }: { event: AdminEvent }) {
  const [failed, setFailed] = useState(false);
  const src = getImageUrl(event.imageUrl);

  if (!src || failed) {
    return (
      <span className="flex h-11 w-16 shrink-0 items-center justify-center rounded-[4px] bg-[#0D1B33] text-white/40">
        <Calendar className="h-4 w-4" />
      </span>
    );
  }
  return (
    <span className="relative h-11 w-16 shrink-0 overflow-hidden rounded-[4px] bg-[#0D1B33]">
      <Image
        src={src}
        alt=""
        fill
        unoptimized
        sizes="64px"
        className="object-cover"
        onError={() => setFailed(true)}
      />
    </span>
  );
}

export default function AdminEventsPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const confirmCtx = useConfirm();

  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [divisions, setDivisions] = useState<DivisionRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  /**
   * "Now" is captured when data arrives instead of during render, so the
   * upcoming/past split stays stable across renders.
   */
  const [nowTs, setNowTs] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<EventFilter>('');
  const [divisionFilter, setDivisionFilter] = useState('');

  const canManage = user?.role === 'SUPER_ADMIN' || user?.role === 'BOARD';
  // Attendees are personal data, not content — Super Admin only.
  const canSeeRegistrations = user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  const fetchData = useCallback(async () => {
    try {
      const [eventsRes, divisionsRes] = await Promise.all([
        api.getEventsAdmin(),
        api.getDivisions(),
      ]);
      const eventPayload = eventsRes as { events?: AdminEvent[] } | AdminEvent[];
      const divisionPayload = divisionsRes as { divisions?: DivisionRef[] } | DivisionRef[];
      setEvents(
        Array.isArray(eventPayload) ? eventPayload : eventPayload?.events ?? []
      );
      setDivisions(
        Array.isArray(divisionPayload) ? divisionPayload : divisionPayload?.divisions ?? []
      );
      setNowTs(Date.now());
    } catch (error) {
      const err = error as { message?: string };
      showError(err.message || 'Could not load event data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showError]);

  /* eslint-disable react-hooks/set-state-in-effect --
     fetchData() only writes state after awaiting the network, which is the
     intended fetch-on-mount; the linter cannot see past the call. */
  useEffect(() => {
    if (user && canManage) {
      fetchData();
    }
  }, [user, canManage, fetchData]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Non-admin never triggers the fetch, so the skeleton must not wait on it.
  const showSkeleton = (isLoading || loading) && (isLoading || canManage);

  const counts = useMemo(() => {
    const result = { all: events.length, published: 0, draft: 0, upcoming: 0, past: 0 };
    events.forEach((event) => {
      if (event.published) result.published += 1;
      else result.draft += 1;
      const start = new Date(event.startDate).getTime();
      if (Number.isFinite(start) && start >= nowTs) result.upcoming += 1;
      else result.past += 1;
    });
    return result;
  }, [events, nowTs]);

  const filteredEvents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return events
      .filter((event) => {
        const start = new Date(event.startDate).getTime();
        if (statusFilter === 'published' && !event.published) return false;
        if (statusFilter === 'draft' && event.published) return false;
        if (statusFilter === 'upcoming' && !(Number.isFinite(start) && start >= nowTs)) return false;
        if (statusFilter === 'past' && Number.isFinite(start) && start >= nowTs) return false;
        if (divisionFilter) {
          const divisionId = event.division?.id || event.divisionId || '';
          if (divisionFilter === 'NONE' ? Boolean(divisionId) : divisionId !== divisionFilter) {
            return false;
          }
        }
        if (!query) return true;
        return (
          event.title.toLowerCase().includes(query) ||
          event.slug?.toLowerCase().includes(query) ||
          event.location?.toLowerCase().includes(query) ||
          event.division?.name?.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }, [events, searchQuery, statusFilter, divisionFilter, nowTs]);

  const hasFilters = Boolean(searchQuery || statusFilter || divisionFilter);

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setDivisionFilter('');
  };

  const handleDelete = async (event: AdminEvent) => {
    const ok = await confirmCtx.confirm({
      title: 'Delete event?',
      message: `${event.title} will be permanently deleted along with its registrations and documentation.`,
      confirmLabel: 'Yes, delete',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await api.deleteEvent(event.id);
      showSuccess('Event deleted');
      await fetchData();
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      showError(err.response?.data?.error || err.message || 'Could not delete event');
    }
  };

  if (showSkeleton) {
    return <ListPageSkeleton tiles={5} rows={6} />;
  }

  if (!canManage) {
    return (
      <AccessDenied
        message="Only Super Admin and Board can manage events."
        backHref="/dashboard"
      />
    );
  }

  const tiles: { key: EventFilter; label: string; value: number; tone: 'slate' | 'emerald' | 'amber' | 'sky' | 'violet' }[] = [
    { key: '', label: 'All events', value: counts.all, tone: 'slate' },
    { key: 'published', label: 'Published', value: counts.published, tone: 'emerald' },
    { key: 'draft', label: 'Draft', value: counts.draft, tone: 'amber' },
    { key: 'upcoming', label: 'Upcoming', value: counts.upcoming, tone: 'sky' },
    { key: 'past', label: 'Past', value: counts.past, tone: 'violet' },
  ];

  return (
    <PageStack>
      <PageHeading
        title="Manage events"
        description={
          counts.all === 0
            ? 'No events have been created yet.'
            : `${counts.all} events recorded • ${counts.upcoming} upcoming • ${counts.draft} still in draft`
        }
        icon={Calendar}
        backHref="/dashboard/admin"
        backLabel="Back to admin panel"
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />}
              onClick={() => {
                setRefreshing(true);
                fetchData();
              }}
            >
              Refresh
            </Button>
            <Link href="/dashboard/admin/events/new">
              <Button variant="primary" size="sm" leftIcon={<CalendarPlus className="h-4 w-4" />}>
                New event
              </Button>
            </Link>
          </>
        }
      />

      <StatTileRow columns={5}>
        {tiles.map((tile) => (
          <StatTile
            key={tile.key || 'all'}
            label={tile.label}
            value={tile.value}
            tone={tile.tone}
            active={statusFilter === tile.key}
            onClick={() => setStatusFilter(tile.key)}
          />
        ))}
      </StatTileRow>

      <Toolbar>
        <SearchField
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by title, slug, location, or division…"
          ariaLabel="Search events"
        />
        <FilterSelect
          value={divisionFilter}
          onChange={setDivisionFilter}
          placeholder="All divisions"
          ariaLabel="Filter by division"
          options={[
            { value: 'NONE', label: 'No division' },
            ...divisions.map((division) => ({ value: division.id, label: division.name })),
          ]}
        />
        {hasFilters && <ResetFiltersButton onClick={resetFilters} />}
      </Toolbar>

      {filteredEvents.length === 0 ? (
        <SectionCard flush>
          {hasFilters ? (
            <EmptyBlock
              icon={Calendar}
              title="No matching events"
              description={
                statusFilter
                  ? `No ${STATUS_LABEL[statusFilter]} events match this filter.`
                  : 'Try a different keyword or filter.'
              }
              action={
                <Button variant="secondary" onClick={resetFilters}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyBlock
              icon={Calendar}
              title="No events yet"
              description="Create the first event so the activity schedule shows up on the site."
              action={
                <Link href="/dashboard/admin/events/new">
                  <Button variant="primary" leftIcon={<CalendarPlus className="h-4 w-4" />}>
                    New event
                  </Button>
                </Link>
              }
            />
          )}
        </SectionCard>
      ) : (
        <TableShell
          head={
            <>
              <Th>Event</Th>
              <Th>Schedule</Th>
              <Th>Location</Th>
              <Th>Division</Th>
              <Th align="center">Registrations</Th>
              <Th>Status</Th>
              <Th align="right">Actions</Th>
            </>
          }
          footer={
            <div className="data-type border-t border-[#E7EFF7] px-5 py-3 text-[12px] ink-muted dark:border-slate-800">
              Showing {filteredEvents.length} of {counts.all} events
            </div>
          }
        >
          {filteredEvents.map((event) => {
            const startTs = new Date(event.startDate).getTime();
            const isPast = Number.isFinite(startTs) && startTs < nowTs;
            const snippet = stripHtml(event.description || '');
            return (
              <Tr key={event.id}>
                <Td>
                  <div className="flex items-start gap-3">
                    <EventThumb event={event} />
                    <div className="min-w-0">
                      <Link
                        href={`/dashboard/admin/events/${event.id}/edit`}
                        className="block truncate text-sm font-semibold ink-strong hover:underline"
                      >
                        {event.title}
                      </Link>
                      <p className="data-type truncate text-[12px] ink-muted">/{event.slug}</p>
                      {snippet && (
                        <p className="mt-0.5 line-clamp-1 max-w-xs text-[12px] ink-muted">
                          {snippet}
                        </p>
                      )}
                    </div>
                  </div>
                </Td>
                <Td>
                  <span className="data-type flex items-center gap-1.5 whitespace-nowrap text-[12px]">
                    <CalendarClock className="h-3.5 w-3.5 text-[#E8231A]" />
                    {formatDate(event.startDate, DATE_OPTS)}
                  </span>
                  <span className="mt-0.5 block text-[12px] ink-muted">
                    {formatTime(event.startDate)}
                    {event.endDate ? ` – ${formatTime(event.endDate)}` : ''}
                  </span>
                </Td>
                <Td>
                  {event.location ? (
                    <span className="flex items-start gap-1.5">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 ink-muted" />
                      <span className="line-clamp-2 max-w-[10rem]">{event.location}</span>
                    </span>
                  ) : (
                    <span className="ink-muted">—</span>
                  )}
                </Td>
                <Td>
                  {event.division ? (
                    <span
                      className="data-type inline-flex rounded-[3px] px-2 py-1 text-[12px] font-bold uppercase"
                      style={{
                        backgroundColor: `${event.division.color || '#6366F1'}20`,
                        color: event.division.color || '#6366F1',
                      }}
                    >
                      {event.division.name}
                    </span>
                  ) : (
                    <span className="ink-muted">—</span>
                  )}
                </Td>
                <Td align="center">
                  <span className="data-type font-semibold ink-strong">
                    {event._count?.registrations ?? 0}
                  </span>
                  {event.capacity ? (
                    <span className="text-[12px] ink-muted"> / {event.capacity}</span>
                  ) : null}
                </Td>
                <Td>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {event.published ? (
                      <Badge variant="success" className="data-type uppercase">Published</Badge>
                    ) : (
                      <Badge variant="warning" className="data-type uppercase">Draft</Badge>
                    )}
                    {isPast ? (
                      <Badge variant="default" className="data-type uppercase">Past</Badge>
                    ) : (
                      <Badge variant="outline" className="data-type uppercase">Upcoming</Badge>
                    )}
                  </div>
                </Td>
                <Td align="right">
                  <RowActions>
                    <IconAction
                      icon={Pencil}
                      label={`Edit ${event.title}`}
                      href={`/dashboard/admin/events/${event.id}/edit`}
                    />
                    <IconAction
                      icon={Images}
                      label={`Documentation for ${event.title}`}
                      href={`/dashboard/admin/events/${event.id}/documentation`}
                    />
                    {canSeeRegistrations && (
                      <IconAction
                        icon={Users}
                        label={`Attendees for ${event.title}`}
                        href={`/dashboard/admin/events/${event.id}/registrations`}
                      />
                    )}
                    <IconAction
                      icon={ExternalLink}
                      label={`View public page for ${event.title}`}
                      href={`/activities/events/${event.slug}`}
                    />
                    <IconAction
                      icon={Trash2}
                      label={`Delete ${event.title}`}
                      tone="danger"
                      onClick={() => handleDelete(event)}
                    />
                  </RowActions>
                </Td>
              </Tr>
            );
          })}
        </TableShell>
      )}

      <ConfirmHost ctx={confirmCtx} />
    </PageStack>
  );
}
