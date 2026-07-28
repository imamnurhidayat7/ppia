'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import { useToast } from '@/components/Toast';
import { useConfirm, ConfirmHost } from '@/hooks/useConfirm';
import { Avatar, Badge, Button, Pagination } from '@/components/ui';
import {
  AccessDenied,
  EmptyBlock,
  ListPageSkeleton,
  PageHeading,
  PageStack,
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
  ResetFiltersButton,
} from '@/components/dashboard';
import { cn, formatDate } from '@/lib/utils';
import {
  CalendarClock,
  CheckCircle2,
  Download,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  ScanLine,
  Users,
  XCircle,
} from 'lucide-react';

type RegistrationStatus = 'REGISTERED' | 'CANCELLED' | 'WAITLISTED' | 'ATTENDED' | 'NO_SHOW';

interface Attendee {
  id: string;
  name: string;
  email: string;
  studentId?: string;
  university?: string;
  phone?: string;
  avatar?: string;
}

interface RegistrationRow {
  id: string;
  eventId: string;
  userId: string;
  status: RegistrationStatus;
  registeredAt: string;
  checkedInAt?: string;
  user?: Attendee;
  // Backend sometimes nests the attendee under a different key.
  attendee?: Attendee;
}

interface EventSummary {
  id: string;
  title: string;
  slug?: string;
  startDate: string;
  location?: string;
}

const STATUS_OPTIONS: RegistrationStatus[] = [
  'REGISTERED',
  'CANCELLED',
  'WAITLISTED',
  'ATTENDED',
  'NO_SHOW',
];

const STATUS_LABEL: Record<RegistrationStatus, string> = {
  REGISTERED: 'Registered',
  CANCELLED: 'Cancelled',
  WAITLISTED: 'Waitlisted',
  ATTENDED: 'Attended',
  NO_SHOW: 'No show',
};

const STATUS_VARIANT: Record<RegistrationStatus, 'primary' | 'success' | 'danger' | 'warning' | 'default'> = {
  REGISTERED: 'primary',
  CANCELLED: 'danger',
  WAITLISTED: 'warning',
  ATTENDED: 'success',
  NO_SHOW: 'default',
};

function attendeeOf(row: RegistrationRow): Attendee | undefined {
  return row.user || row.attendee;
}

function csvValue(value: unknown): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function exportCsv(rows: RegistrationRow[], eventTitle: string) {
  const headers = ['Name', 'Email', 'University', 'Status', 'Registered at', 'Check-in time'];
  const lines = rows.map((row) => {
    const attendee = attendeeOf(row);
    return [
      attendee?.name || '',
      attendee?.email || '',
      attendee?.university || '',
      STATUS_LABEL[row.status],
      row.registeredAt,
      row.checkedInAt || '',
    ]
      .map(csvValue)
      .join(',');
  });
  const csv = `${headers.map(csvValue).join(',')}\n${lines.join('\n')}`;
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeTitle = eventTitle.replace(/[^a-z0-9-_]+/gi, '_').slice(0, 60);
  link.href = url;
  link.download = `attendees-${safeTitle || 'event'}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function EventRegistrationsPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const eventId = params?.id as string | undefined;
  const { showSuccess, showError } = useToast();
  const confirmCtx = useConfirm();

  const [event, setEvent] = useState<EventSummary | null>(null);
  const [registrations, setRegistrations] = useState<RegistrationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyRow, setBusyRow] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<RegistrationStatus | ''>('');
  const [currentPage, setCurrentPage] = useState(1);
  /** Door check-in by code. */
  const [code, setCode] = useState('');
  const [codeBusy, setCodeBusy] = useState(false);
  const [codeMessage, setCodeMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Attendee data is not site content, so only Super Admin can view it.
  const canView = user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  const fetchData = useCallback(async () => {
    if (!eventId) return;
    try {
      const [eventRes, regsRes] = await Promise.all([
        api.getEvent(eventId),
        api.getEventRegistrations(eventId),
      ]);
      const detail = (eventRes.event || eventRes) as EventSummary;
      setEvent({
        id: detail.id,
        title: detail.title,
        slug: detail.slug,
        startDate: detail.startDate,
        location: detail.location,
      });
      const payload = regsRes as { registrations?: RegistrationRow[] } | RegistrationRow[];
      const list = Array.isArray(payload) ? payload : payload?.registrations ?? [];
      setRegistrations(Array.isArray(list) ? list : []);
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      showError(err.response?.data?.error || err.message || 'Could not load attendee data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [eventId, showError]);

  /* eslint-disable react-hooks/set-state-in-effect --
     fetchData() only writes state after awaiting the network, which is the
     intended fetch-on-mount; the linter cannot see past the call. */
  useEffect(() => {
    if (user && canView && eventId) {
      fetchData();
    }
  }, [user, canView, eventId, fetchData]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Anyone but Super Admin never triggers the fetch, so the skeleton must not wait on it.
  const showSkeleton = (isLoading || loading) && (isLoading || canView);

  const counts = useMemo(() => {
    const result = {
      all: registrations.length,
      REGISTERED: 0,
      CANCELLED: 0,
      WAITLISTED: 0,
      ATTENDED: 0,
      NO_SHOW: 0,
    };
    registrations.forEach((row) => {
      result[row.status] += 1;
    });
    return result;
  }, [registrations]);

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return registrations.filter((row) => {
      if (statusFilter && row.status !== statusFilter) return false;
      if (!query) return true;
      const attendee = attendeeOf(row);
      return (
        attendee?.name?.toLowerCase().includes(query) ||
        attendee?.email?.toLowerCase().includes(query) ||
        attendee?.university?.toLowerCase().includes(query) ||
        STATUS_LABEL[row.status].toLowerCase().includes(query)
      );
    });
  }, [registrations, searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  // Clamped instead of corrected in an effect, so a filter that shrinks the
  // result set can never leave the table on an empty page.
  const page = Math.min(currentPage, totalPages);

  const paginated = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, page, itemsPerPage]);

  const hasFilters = Boolean(searchQuery || statusFilter);

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setCurrentPage(1);
  };

  /**
   * Check in from a typed code.
   *
   * The message stays inline next to the field rather than in a toast: whoever
   * is on the door needs to read the outcome while looking at the attendee, and
   * a toast that has already faded is no help.
   */
  const handleCodeCheckIn = async (event: React.FormEvent) => {
    event.preventDefault();
    const value = code.trim();
    if (!value || codeBusy || !eventId) return;

    setCodeBusy(true);
    setCodeMessage(null);
    try {
      const result = await api.checkInByCode(eventId, value);
      setCodeMessage({ ok: true, text: result.message });
      setCode('');
      await fetchData();
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      setCodeMessage({
        ok: false,
        text: err.response?.data?.error || err.message || 'Could not check in',
      });
    } finally {
      setCodeBusy(false);
    }
  };

  const handleCheckIn = async (row: RegistrationRow) => {
    setBusyRow(row.id);
    try {
      await api.checkInAttendee(row.id);
      showSuccess(`${attendeeOf(row)?.name || 'Attendee'} marked as attended`);
      await fetchData();
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      showError(err.response?.data?.error || err.message || 'Could not check in');
    } finally {
      setBusyRow(null);
    }
  };

  const handleStatusChange = async (row: RegistrationRow, status: RegistrationStatus) => {
    setBusyRow(row.id);
    try {
      await api.updateRegistrationStatus(row.id, status);
      showSuccess(`Status changed to ${STATUS_LABEL[status].toLowerCase()}`);
      await fetchData();
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      showError(err.response?.data?.error || err.message || 'Could not update status');
    } finally {
      setBusyRow(null);
    }
  };

  const handleCancel = async (row: RegistrationRow) => {
    const ok = await confirmCtx.confirm({
      title: 'Cancel registration?',
      message: `The registration for ${attendeeOf(row)?.name || 'this attendee'} will be marked as cancelled.`,
      confirmLabel: 'Yes, cancel',
      variant: 'danger',
    });
    if (!ok) return;
    setBusyRow(row.id);
    try {
      await api.updateRegistrationStatus(row.id, 'CANCELLED');
      showSuccess('Registration cancelled');
      await fetchData();
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      showError(err.response?.data?.error || err.message || 'Could not cancel registration');
    } finally {
      setBusyRow(null);
    }
  };

  if (showSkeleton) {
    return <ListPageSkeleton tiles={5} rows={8} />;
  }

  if (!canView) {
    return (
      <AccessDenied
        title="Access denied"
        message="Only Super Admin can open event attendee data."
        backHref="/dashboard/admin/events"
        backLabel="Back to events"
      />
    );
  }

  const tiles: { key: RegistrationStatus | ''; label: string; value: number; tone: 'slate' | 'sky' | 'emerald' | 'red' | 'amber' }[] = [
    { key: '', label: 'All', value: counts.all, tone: 'slate' },
    { key: 'REGISTERED', label: 'Registered', value: counts.REGISTERED, tone: 'sky' },
    { key: 'ATTENDED', label: 'Attended', value: counts.ATTENDED, tone: 'emerald' },
    { key: 'CANCELLED', label: 'Cancelled', value: counts.CANCELLED, tone: 'red' },
    { key: 'NO_SHOW', label: 'No show', value: counts.NO_SHOW, tone: 'amber' },
  ];

  return (
    <PageStack>
      <PageHeading
        eyebrow="Event attendees"
        title={event?.title || 'Event attendees'}
        description="Manage registrations, change statuses, and record attendance."
        icon={Users}
        backHref="/dashboard/admin/events"
        backLabel="Back to events"
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
              disabled={filtered.length === 0}
              onClick={() => exportCsv(filtered, event?.title || 'event')}
            >
              Export CSV
            </Button>
          </>
        }
      />

      {event && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <CalendarClock className="h-4 w-4 text-[#E8231A]" />
            {formatDate(event.startDate)}
          </span>
          {event.location && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-slate-400" />
              {event.location}
            </span>
          )}
          {event.slug && (
            <Link
              href={`/activities/events/${event.slug}`}
              className="font-semibold text-[#E8231A] hover:underline"
            >
              View event page
            </Link>
          )}
        </div>
      )}

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
          placeholder="Search by name, email, university, or status…"
          ariaLabel="Search attendees"
        />
        {hasFilters && <ResetFiltersButton onClick={resetFilters} />}
      </Toolbar>

      {/* Door check-in. Faster and less error-prone than finding a name in the
          list, which matters when there is a queue and two people share a name. */}
      <SectionCard
        title="Check in by code"
        description="Ask the attendee for the six-character code on their dashboard."
        icon={ScanLine}
      >
        <form onSubmit={handleCodeCheckIn} className="flex flex-wrap items-start gap-3">
          <div className="min-w-[12rem] flex-1">
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="e.g. 4KM7QD"
              aria-label="Check-in code"
              maxLength={12}
              autoComplete="off"
              spellCheck={false}
              className="input-base font-mono uppercase tracking-widest"
            />
            {codeMessage && (
              <p
                className={cn(
                  'mt-1.5 text-xs',
                  codeMessage.ok
                    ? 'text-success-600 dark:text-success-400'
                    : 'text-danger-600 dark:text-danger-400'
                )}
              >
                {codeMessage.text}
              </p>
            )}
          </div>
          <Button type="submit" variant="primary" disabled={codeBusy || code.trim().length === 0}>
            {codeBusy ? 'Checking in…' : 'Check in'}
          </Button>
        </form>
      </SectionCard>

      {filtered.length === 0 ? (
        <SectionCard flush>
          <EmptyBlock
            icon={Users}
            title={hasFilters ? 'No matching attendees' : 'No registrations yet'}
            description={
              hasFilters
                ? 'Try a different keyword or pick another status.'
                : 'Attendees will show up here once they register through the event page.'
            }
            action={
              hasFilters ? (
                <Button variant="secondary" onClick={resetFilters}>
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        </SectionCard>
      ) : (
        <TableShell
          head={
            <>
              <Th>Attendee</Th>
              <Th>Contact</Th>
              <Th>Status</Th>
              <Th>Registered at</Th>
              <Th>Check-in</Th>
              <Th align="right">Actions</Th>
            </>
          }
          footer={
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={filtered.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              showItemsPerPage
              onItemsPerPageChange={(limit) => {
                setItemsPerPage(limit);
                setCurrentPage(1);
              }}
            />
          }
        >
          {paginated.map((row) => {
            const attendee = attendeeOf(row);
            const busy = busyRow === row.id;
            return (
              <Tr key={row.id}>
                <Td>
                  <div className="flex items-center gap-3">
                    <Avatar src={attendee?.avatar} name={attendee?.name || '?'} size="md" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {attendee?.name || 'No name'}
                      </p>
                      {attendee?.university && (
                        <p className="flex items-center gap-1 truncate text-xs text-slate-500 dark:text-slate-400">
                          <GraduationCap className="h-3 w-3 shrink-0" />
                          {attendee.university}
                        </p>
                      )}
                    </div>
                  </div>
                </Td>
                <Td>
                  <span className="flex items-center gap-1.5 truncate">
                    <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    {attendee?.email || '—'}
                  </span>
                  {attendee?.phone && (
                    <span className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <Phone className="h-3 w-3 shrink-0" />
                      {attendee.phone}
                    </span>
                  )}
                </Td>
                <Td>
                  <Badge variant={STATUS_VARIANT[row.status]}>{STATUS_LABEL[row.status]}</Badge>
                </Td>
                <Td>
                  <span className="whitespace-nowrap text-slate-600 dark:text-slate-300">
                    {formatDate(row.registeredAt)}
                  </span>
                </Td>
                <Td>
                  {row.checkedInAt ? (
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {formatDate(row.checkedInAt)}
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </Td>
                <Td align="right">
                  <RowActions>
                    {row.status !== 'ATTENDED' && (
                      <Button
                        size="xs"
                        variant="success"
                        leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
                        disabled={busy}
                        onClick={() => handleCheckIn(row)}
                      >
                        Check-in
                      </Button>
                    )}
                    <select
                      value={row.status}
                      onChange={(changeEvent) =>
                        handleStatusChange(row, changeEvent.target.value as RegistrationStatus)
                      }
                      disabled={busy}
                      aria-label={`Change status for ${attendee?.name || 'attendee'}`}
                      className="input-base w-40"
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {STATUS_LABEL[status]}
                        </option>
                      ))}
                    </select>
                    {row.status !== 'CANCELLED' && row.status !== 'ATTENDED' && (
                      <Button
                        size="xs"
                        variant="secondary"
                        leftIcon={<XCircle className="h-3.5 w-3.5" />}
                        disabled={busy}
                        onClick={() => handleCancel(row)}
                      >
                        Cancel registration
                      </Button>
                    )}
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
