'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import { useToast } from '@/components/Toast';
import { Badge, Button, Pagination } from '@/components/ui';
import {
  AccessDenied,
  EmptyBlock,
  FilterSelect,
  ListPageSkeleton,
  PageHeading,
  PageStack,
  ResetFiltersButton,
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
import { cn, formatDate } from '@/lib/utils';
import {
  ArrowDownUp,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Download,
  ExternalLink,
  LayoutList,
  ListTree,
  MapPin,
  RefreshCw,
} from 'lucide-react';

/** Metadata dates read as log entries: 05 Mar 2025. */
const DATE_OPTS = {
  dateStyle: undefined,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
} as const;


type RegistrationStatus = 'REGISTERED' | 'CANCELLED' | 'WAITLISTED' | 'ATTENDED' | 'NO_SHOW';
type SortDirection = 'asc' | 'desc';
type GroupMode = 'flat' | 'grouped';

interface Attendee {
  id: string;
  name: string;
  email: string;
  studentId?: string;
  university?: string;
  phone?: string;
}

interface RegistrationRow {
  id: string;
  eventId: string;
  userId: string;
  status: RegistrationStatus;
  registeredAt: string;
  checkedInAt?: string;
  user?: Attendee;
  /** Prisma returns the relation with an uppercase name. */
  User?: Attendee;
  attendee?: Attendee;
}

interface MinimalEvent {
  id: string;
  title: string;
  slug: string;
  startDate: string;
  location?: string;
}

type RowWithEvent = RegistrationRow & { event: MinimalEvent };

const STATUS_LABEL: Record<RegistrationStatus, string> = {
  REGISTERED: 'Registered',
  ATTENDED: 'Attended',
  WAITLISTED: 'Waitlisted',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'No show',
};

const STATUS_VARIANT: Record<
  RegistrationStatus,
  'primary' | 'success' | 'warning' | 'danger' | 'default'
> = {
  REGISTERED: 'primary',
  ATTENDED: 'success',
  WAITLISTED: 'warning',
  CANCELLED: 'danger',
  NO_SHOW: 'default',
};

const STATUS_OPTIONS = (Object.keys(STATUS_LABEL) as RegistrationStatus[]).map((status) => ({
  value: status,
  label: STATUS_LABEL[status],
}));

/**
 * The attendee can arrive as `user`, `User` (the Prisma relation name), or
 * `attendee`; the old version only read the last two, so the attendee column
 * was always empty.
 */
function attendeeOf(row: RegistrationRow): Attendee | undefined {
  return row.user || row.User || row.attendee;
}

export default function GlobalRegistrationsPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const { showError, showSuccess } = useToast();

  const [events, setEvents] = useState<MinimalEvent[]>([]);
  const [registrationsByEvent, setRegistrationsByEvent] = useState<
    Record<string, RegistrationRow[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [groupMode, setGroupMode] = useState<GroupMode>('flat');
  const [collapsedEvents, setCollapsedEvents] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Attendee data is personal data, not site content, so only Super Admin can view it.
  const canView = user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  const fetchData = useCallback(async () => {
    try {
      const eventsRes = (await api.getEventsAdmin({ page: 1, limit: 100 })) as {
        events?: MinimalEvent[];
      };
      const list = eventsRes.events ?? [];
      setEvents(list);

      const results = await Promise.all(
        list.map(async (event) => {
          try {
            const response = (await api.getEventRegistrations(event.id)) as
              | { registrations?: RegistrationRow[] }
              | RegistrationRow[];
            const registrations = Array.isArray(response)
              ? response
              : response?.registrations ?? [];
            return { eventId: event.id, registrations };
          } catch {
            return { eventId: event.id, registrations: [] as RegistrationRow[] };
          }
        })
      );

      const next: Record<string, RegistrationRow[]> = {};
      results.forEach(({ eventId, registrations }) => {
        next[eventId] = registrations;
      });
      setRegistrationsByEvent(next);
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      showError(err.response?.data?.error || err.message || 'Could not load registration data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showError]);

  /* eslint-disable react-hooks/set-state-in-effect --
     fetchData() only writes state after awaiting the network; the linter cannot
     see past the call. */
  useEffect(() => {
    if (user && canView) {
      fetchData();
    }
  }, [user, canView, fetchData]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Anyone but Super Admin never triggers the fetch, so the skeleton must not wait on it.
  const showSkeleton = (isLoading || loading) && (isLoading || canView);

  const allRows = useMemo(() => {
    const rows: RowWithEvent[] = [];
    events.forEach((event) => {
      (registrationsByEvent[event.id] || []).forEach((registration) => {
        rows.push({ ...registration, event });
      });
    });
    return rows;
  }, [events, registrationsByEvent]);

  const counts = useMemo(() => {
    const result = {
      all: allRows.length,
      REGISTERED: 0,
      ATTENDED: 0,
      WAITLISTED: 0,
      CANCELLED: 0,
      NO_SHOW: 0,
    };
    allRows.forEach((row) => {
      if (row.status in result) result[row.status] += 1;
    });
    return result;
  }, [allRows]);

  const filteredRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const factor = sortDirection === 'desc' ? -1 : 1;
    return allRows
      .filter((row) => {
        if (statusFilter && row.status !== statusFilter) return false;
        if (!query) return true;
        const attendee = attendeeOf(row);
        return (
          row.event.title.toLowerCase().includes(query) ||
          attendee?.name?.toLowerCase().includes(query) ||
          attendee?.email?.toLowerCase().includes(query) ||
          attendee?.university?.toLowerCase().includes(query)
        );
      })
      .sort(
        (a, b) =>
          factor *
          (new Date(a.registeredAt).getTime() - new Date(b.registeredAt).getTime())
      );
  }, [allRows, searchQuery, statusFilter, sortDirection]);

  const groupedRows = useMemo(() => {
    const groups = new Map<string, RowWithEvent[]>();
    filteredRows.forEach((row) => {
      const existing = groups.get(row.event.id);
      if (existing) existing.push(row);
      else groups.set(row.event.id, [row]);
    });
    return Array.from(groups.values()).map((rows) => ({
      event: rows[0].event,
      registrations: rows,
    }));
  }, [filteredRows]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / itemsPerPage));
  // Clamped at render time so a filter that shrinks the result set never leaves an empty page.
  const page = Math.min(currentPage, totalPages);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return filteredRows.slice(start, start + itemsPerPage);
  }, [filteredRows, page, itemsPerPage]);

  const hasFilters = Boolean(searchQuery || statusFilter);

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setCurrentPage(1);
  };

  const toggleEventCollapse = (eventId: string) => {
    setCollapsedEvents((current) => {
      const next = new Set(current);
      if (next.has(eventId)) next.delete(eventId);
      else next.add(eventId);
      return next;
    });
  };

  /** Exports whatever the current filters show, not the whole table. */
  const exportCsv = () => {
    if (filteredRows.length === 0) {
      showError('No data to export');
      return;
    }
    const headers = ['Event', 'Name', 'Email', 'University', 'Status', 'Registered at'];
    const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const rows = filteredRows.map((row) => {
      const attendee = attendeeOf(row);
      return [
        row.event.title,
        attendee?.name || '',
        attendee?.email || '',
        attendee?.university || '',
        STATUS_LABEL[row.status],
        row.registeredAt,
      ]
        .map(escape)
        .join(',');
    });
    const csv = `${headers.map(escape).join(',')}\n${rows.join('\n')}`;
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `event-registrations-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showSuccess(`${filteredRows.length} rows exported`);
  };

  if (showSkeleton) {
    return <ListPageSkeleton tiles={4} rows={8} />;
  }

  if (!canView) {
    return (
      <AccessDenied
        message="Only Super Admin can view event registration data."
        backHref="/dashboard"
      />
    );
  }

  const tiles: {
    key: string;
    label: string;
    value: number;
    tone: 'slate' | 'sky' | 'emerald' | 'amber' | 'red';
  }[] = [
    { key: '', label: 'All registrations', value: counts.all, tone: 'slate' },
    { key: 'REGISTERED', label: 'Registered', value: counts.REGISTERED, tone: 'sky' },
    { key: 'ATTENDED', label: 'Attended', value: counts.ATTENDED, tone: 'emerald' },
    { key: 'WAITLISTED', label: 'Waitlisted', value: counts.WAITLISTED, tone: 'amber' },
    { key: 'CANCELLED', label: 'Cancelled', value: counts.CANCELLED, tone: 'red' },
  ];

  return (
    <PageStack>
      <PageHeading
        title="Event registrations"
        description={
          counts.all === 0
            ? `No registrations across ${events.length} events yet.`
            : `${counts.all} registrations across ${events.length} events • ${counts.ATTENDED} marked as attended`
        }
        icon={ClipboardList}
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
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Download className="h-4 w-4" />}
              onClick={exportCsv}
            >
              Export CSV
            </Button>
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
            onClick={() => {
              setStatusFilter(tile.key);
              setCurrentPage(1);
            }}
          />
        ))}
      </StatTileRow>

      <Toolbar>
        <SearchField
          value={searchQuery}
          onChange={(value) => {
            setSearchQuery(value);
            setCurrentPage(1);
          }}
          placeholder="Search by event name, attendee, email, or university…"
          ariaLabel="Search registrations"
        />
        <FilterSelect
          value={statusFilter}
          onChange={(value) => {
            setStatusFilter(value);
            setCurrentPage(1);
          }}
          placeholder="All statuses"
          ariaLabel="Filter by registration status"
          options={STATUS_OPTIONS}
        />
        <Button
          variant="secondary"
          size="md"
          leftIcon={<ArrowDownUp className="h-4 w-4" />}
          onClick={() => setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc')}
        >
          {sortDirection === 'desc' ? 'Newest first' : 'Oldest first'}
        </Button>
        <Button
          variant={groupMode === 'grouped' ? 'primary' : 'secondary'}
          size="md"
          leftIcon={
            groupMode === 'grouped' ? (
              <ListTree className="h-4 w-4" />
            ) : (
              <LayoutList className="h-4 w-4" />
            )
          }
          onClick={() => setGroupMode(groupMode === 'flat' ? 'grouped' : 'flat')}
        >
          {groupMode === 'grouped' ? 'By event' : 'Single list'}
        </Button>
        {hasFilters && <ResetFiltersButton onClick={resetFilters} />}
      </Toolbar>

      {filteredRows.length === 0 ? (
        <SectionCard flush>
          {hasFilters ? (
            <EmptyBlock
              icon={ClipboardList}
              title="No matching registrations"
              description="Try a different keyword or status filter."
              action={
                <Button variant="secondary" onClick={resetFilters}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyBlock
              icon={ClipboardList}
              title="No registrations yet"
              description="Attendee registrations from every event will collect here."
            />
          )}
        </SectionCard>
      ) : groupMode === 'flat' ? (
        <TableShell
          head={
            <>
              <Th>Event</Th>
              <Th>Attendee</Th>
              <Th>Status</Th>
              <Th>Registered at</Th>
            </>
          }
          footer={
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={filteredRows.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              showItemsPerPage
              itemsPerPageOptions={[25, 50, 100]}
              onItemsPerPageChange={(limit) => {
                setItemsPerPage(limit);
                setCurrentPage(1);
              }}
            />
          }
        >
          {paginatedRows.map((row) => {
            const attendee = attendeeOf(row);
            return (
              <Tr key={row.id}>
                <Td>
                  <Link
                    href={`/dashboard/admin/events/${row.event.id}/registrations`}
                    className="font-semibold ink-strong hover:underline"
                  >
                    {row.event.title}
                  </Link>
                  {row.event.location && (
                    <p className="mt-0.5 flex items-center gap-1 text-[12px] ink-muted">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{row.event.location}</span>
                    </p>
                  )}
                </Td>
                <Td>
                  <p className="font-medium ink-strong">
                    {attendee?.name || '—'}
                  </p>
                  <p className="text-[12px] ink-muted">
                    {attendee?.email || '—'}
                  </p>
                  {attendee?.university && (
                    <p className="text-[12px] ink-muted">{attendee.university}</p>
                  )}
                </Td>
                <Td>
                  <Badge variant={STATUS_VARIANT[row.status]} className="data-type uppercase">{STATUS_LABEL[row.status]}</Badge>
                </Td>
                <Td>
                  <span className="data-type flex items-center gap-1.5 whitespace-nowrap text-[12px]">
                    <CalendarClock className="h-3.5 w-3.5 ink-muted" />
                    {formatDate(row.registeredAt, DATE_OPTS)}
                  </span>
                </Td>
              </Tr>
            );
          })}
        </TableShell>
      ) : (
        <div className="space-y-4">
          {groupedRows.map(({ event, registrations }) => {
            const collapsed = collapsedEvents.has(event.id);
            return (
              <SectionCard key={event.id} flush>
                <button
                  type="button"
                  onClick={() => toggleEventCollapse(event.id)}
                  aria-expanded={!collapsed}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-[#F5FAFD] dark:hover:bg-slate-800/50"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    {collapsed ? (
                      <ChevronRight className="h-4 w-4 shrink-0 ink-muted" />
                    ) : (
                      <ChevronDown className="h-4 w-4 shrink-0 ink-muted" />
                    )}
                    <span className="min-w-0">
                      <span className="block truncate font-display text-base font-bold ink-strong">
                        {event.title}
                      </span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[12px] ink-muted">
                        <span className="inline-flex items-center gap-1">
                          <CalendarClock className="h-3 w-3" />
                          {formatDate(event.startDate, DATE_OPTS)}
                        </span>
                        {event.location && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {event.location}
                          </span>
                        )}
                      </span>
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <Badge variant="default" className="data-type uppercase">{registrations.length} registrations</Badge>
                    <Link
                      href={`/dashboard/admin/events/${event.id}/registrations`}
                      aria-label={`Open attendee details for ${event.title}`}
                      className="flex h-8 w-8 items-center justify-center rounded-[3px] ink-muted transition-colors hover:bg-[#EDF5FB] hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </span>
                </button>

                {!collapsed && (
                  <div className="overflow-x-auto border-t border-[#E7EFF7] dark:border-slate-800">
                    <table className="min-w-full">
                      <thead className="bg-[#F5FAFD] dark:bg-slate-800/50">
                        <tr>
                          <Th>Attendee</Th>
                          <Th>Email</Th>
                          <Th>Status</Th>
                          <Th>Registered at</Th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E7EFF7] dark:divide-slate-800">
                        {registrations.map((row) => {
                          const attendee = attendeeOf(row);
                          return (
                            <Tr key={row.id}>
                              <Td>{attendee?.name || '—'}</Td>
                              <Td>{attendee?.email || '—'}</Td>
                              <Td>
                                <Badge variant={STATUS_VARIANT[row.status]} className="data-type uppercase">
                                  {STATUS_LABEL[row.status]}
                                </Badge>
                              </Td>
                              <Td>{formatDate(row.registeredAt, DATE_OPTS)}</Td>
                            </Tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </SectionCard>
            );
          })}
        </div>
      )}
    </PageStack>
  );
}
