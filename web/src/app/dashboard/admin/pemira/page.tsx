'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import { useToast } from '@/components/Toast';
import { Badge, Button, Pagination } from '@/components/ui';
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
import { cn } from '@/lib/utils';
import {
  BarChart3,
  ClipboardList,
  Plus,
  RefreshCw,
  Settings2,
  Users,
  Vote,
} from 'lucide-react';

interface AdminElection {
  id: string;
  title: string;
  description?: string;
  status: string;
  registrationStart: string;
  registrationEnd: string;
  campaignStart?: string;
  campaignEnd?: string;
  votingStart: string;
  votingEnd: string;
  _count?: { candidates?: number; votes?: number };
}

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'outline';

const STATUS_META: Record<string, { label: string; variant: BadgeVariant }> = {
  UPCOMING: { label: 'Upcoming', variant: 'outline' },
  REGISTRATION: { label: 'Registration', variant: 'warning' },
  CAMPAIGN: { label: 'Campaign', variant: 'primary' },
  VOTING: { label: 'Voting', variant: 'success' },
  CLOSED: { label: 'Closed', variant: 'default' },
  PUBLISHED: { label: 'Completed', variant: 'primary' },
};

/** Server-computed phases that count as in progress. */
const RUNNING_STATUSES = ['REGISTRATION', 'CAMPAIGN', 'VOTING'];

/** '' = all. The tile row also works as filter tabs. */
type ElectionFilter = '' | 'running' | 'upcoming' | 'finished';

const PAGE_SIZE = 10;

function statusMeta(status: string) {
  return STATUS_META[status] ?? { label: status, variant: 'default' as BadgeVariant };
}

function formatDateShort(value?: string): string {
  if (!value) return '—';
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return '—';
  return new Date(value).toLocaleDateString('en-NZ', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function AdminPemiraPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const { showError } = useToast();

  const [elections, setElections] = useState<AdminElection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  /**
   * "Now" is captured when the data arrives, not on render, so phase checks
   * (voting in progress / already ended) do not shift mid-render.
   */
  const [nowTs, setNowTs] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [groupFilter, setGroupFilter] = useState<ElectionFilter>('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  // PEMIRA loads voter and candidate data, so Super Admin only.
  const canManage = user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  const fetchData = useCallback(async () => {
    try {
      const res = (await api.getElections()) as { elections?: AdminElection[] };
      setElections(res.elections ?? []);
      setNowTs(Date.now());
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      showError(err.response?.data?.error || err.message || 'Could not load elections');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showError]);

  /* eslint-disable react-hooks/set-state-in-effect --
     fetchData() only writes state after a network await (fetch-on-mount);
     the linter cannot see past that call. */
  useEffect(() => {
    if (user && canManage) {
      fetchData();
    }
  }, [user, canManage, fetchData]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Non Super Admins never trigger the fetch, so the skeleton does not wait for it.
  const showSkeleton = (isLoading || loading) && (isLoading || canManage);

  const counts = useMemo(() => {
    const result = { all: elections.length, running: 0, upcoming: 0, finished: 0, votes: 0 };
    elections.forEach((election) => {
      if (RUNNING_STATUSES.includes(election.status)) result.running += 1;
      else if (election.status === 'UPCOMING') result.upcoming += 1;
      else result.finished += 1;
      result.votes += election._count?.votes ?? 0;
    });
    return result;
  }, [elections]);

  const filteredElections = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return elections
      .filter((election) => {
        if (groupFilter === 'running' && !RUNNING_STATUSES.includes(election.status)) return false;
        if (groupFilter === 'upcoming' && election.status !== 'UPCOMING') return false;
        if (
          groupFilter === 'finished' &&
          (RUNNING_STATUSES.includes(election.status) || election.status === 'UPCOMING')
        ) {
          return false;
        }
        if (statusFilter && election.status !== statusFilter) return false;
        if (!query) return true;
        return (
          election.title.toLowerCase().includes(query) ||
          (election.description?.toLowerCase().includes(query) ?? false)
        );
      })
      .sort((a, b) => new Date(b.votingStart).getTime() - new Date(a.votingStart).getTime());
  }, [elections, searchQuery, groupFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredElections.length / PAGE_SIZE));
  // Clamped on render instead of corrected through a useEffect.
  const currentPage = Math.min(page, totalPages);
  const visibleElections = filteredElections.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const hasFilters = Boolean(searchQuery || groupFilter || statusFilter);

  const resetFilters = () => {
    setSearchQuery('');
    setGroupFilter('');
    setStatusFilter('');
    setPage(1);
  };

  if (showSkeleton) {
    return <ListPageSkeleton tiles={4} rows={6} />;
  }

  if (!canManage) {
    return (
      <AccessDenied
        message="Managing PEMIRA is limited to Super Admins."
        backHref="/dashboard"
      />
    );
  }

  const tiles: { key: ElectionFilter; label: string; value: number; tone: 'slate' | 'emerald' | 'sky' | 'violet' }[] = [
    { key: '', label: 'All elections', value: counts.all, tone: 'slate' },
    { key: 'running', label: 'In progress', value: counts.running, tone: 'emerald' },
    { key: 'upcoming', label: 'Upcoming', value: counts.upcoming, tone: 'sky' },
    { key: 'finished', label: 'Completed', value: counts.finished, tone: 'violet' },
  ];

  return (
    <PageStack>
      <PageHeading
        eyebrow="PEMIRA"
        title="Manage elections"
        description={
          counts.all === 0
            ? 'No elections have been created yet.'
            : `${counts.all} elections recorded • ${counts.running} in progress • ${counts.votes} votes cast`
        }
        icon={Vote}
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
            <Link href="/dashboard/admin/pemira/new">
              <Button variant="primary" size="sm" leftIcon={<Plus className="h-4 w-4" />}>
                New election
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
            active={groupFilter === tile.key}
            onClick={() => {
              setGroupFilter(tile.key);
              setPage(1);
            }}
          />
        ))}
        <StatTile
          label="Total votes"
          value={counts.votes}
          tone="red"
          icon={BarChart3}
          hint="All elections"
        />
      </StatTileRow>

      <Toolbar>
        <SearchField
          value={searchQuery}
          onChange={(value) => {
            setSearchQuery(value);
            setPage(1);
          }}
          placeholder="Search election title or description…"
          ariaLabel="Search elections"
        />
        <FilterSelect
          value={statusFilter}
          onChange={(value) => {
            setStatusFilter(value);
            setPage(1);
          }}
          placeholder="All statuses"
          ariaLabel="Filter election status"
          options={Object.entries(STATUS_META).map(([value, meta]) => ({
            value,
            label: meta.label,
          }))}
        />
        {hasFilters && <ResetFiltersButton onClick={resetFilters} />}
      </Toolbar>

      {filteredElections.length === 0 ? (
        <SectionCard flush>
          {hasFilters ? (
            <EmptyBlock
              icon={Vote}
              title="No matching elections"
              description="Try changing the keywords or filters you are using."
              action={
                <Button variant="secondary" onClick={resetFilters}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyBlock
              icon={Vote}
              title="No elections yet"
              description="Create the first election to start opening candidate registration."
              action={
                <Link href="/dashboard/admin/pemira/new">
                  <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />}>
                    New election
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
              <Th>Election</Th>
              <Th align="center">Candidates</Th>
              <Th align="center">Votes</Th>
              <Th>Voting window</Th>
              <Th>Status</Th>
              <Th align="right">Actions</Th>
            </>
          }
          footer={
            <div className="border-t border-[#E7EFF7] px-5 py-3 dark:border-slate-800">
              <p className="data-type mb-2 text-[12px] ink-muted">
                Showing {visibleElections.length} of {filteredElections.length} elections
              </p>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredElections.length}
                itemsPerPage={PAGE_SIZE}
                onPageChange={setPage}
              />
            </div>
          }
        >
          {visibleElections.map((election) => {
            const meta = statusMeta(election.status);
            const votingEndTs = new Date(election.votingEnd).getTime();
            const votingStartTs = new Date(election.votingStart).getTime();
            const votingLive =
              Number.isFinite(votingStartTs) &&
              Number.isFinite(votingEndTs) &&
              nowTs >= votingStartTs &&
              nowTs <= votingEndTs;
            const votingOver = Number.isFinite(votingEndTs) && nowTs > votingEndTs;
            return (
              <Tr key={election.id}>
                <Td>
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        // Porthole marker: a running election gets the filled
                        // brand disc, everything else only the ring.
                        'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                        RUNNING_STATUSES.includes(election.status)
                          ? 'bg-[#E8231A] text-white'
                          : 'ink-muted'
                      )}
                      style={{
                        boxShadow: RUNNING_STATUSES.includes(election.status)
                          ? 'inset 0 0 0 1px rgba(255,255,255,0.22), 0 0 0 4px rgba(232,35,26,0.12)'
                          : 'inset 0 0 0 1px rgba(11,28,46,0.14), 0 0 0 4px rgba(11,28,46,0.05)',
                      }}
                      aria-hidden="true"
                    >
                      <Vote className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <Link
                        href={`/dashboard/admin/pemira/${election.id}`}
                        className="block truncate text-sm font-semibold ink-strong hover:underline"
                      >
                        {election.title}
                      </Link>
                      {election.description && (
                        <p className="mt-0.5 line-clamp-1 max-w-sm text-[12px] ink-muted">
                          {election.description}
                        </p>
                      )}
                      <p className="data-type mt-0.5 text-[12px] ink-muted">
                        Registration {formatDateShort(election.registrationStart)} –{' '}
                        {formatDateShort(election.registrationEnd)}
                      </p>
                    </div>
                  </div>
                </Td>
                <Td align="center">
                  <span className="data-type font-semibold ink-strong">
                    {election._count?.candidates ?? 0}
                  </span>
                </Td>
                <Td align="center">
                  <span className="data-type font-semibold ink-strong">
                    {election._count?.votes ?? 0}
                  </span>
                </Td>
                <Td>
                  <span className="data-type whitespace-nowrap text-[12px]">
                    {formatDateShort(election.votingStart)} – {formatDateShort(election.votingEnd)}
                  </span>
                  <span className="mt-0.5 block text-[12px] ink-muted">
                    {votingLive
                      ? 'Voting is open'
                      : votingOver
                        ? 'Voting has ended'
                        : 'Voting has not opened yet'}
                  </span>
                </Td>
                <Td>
                  <Badge variant={meta.variant} className="data-type uppercase">{meta.label}</Badge>
                </Td>
                <Td align="right">
                  <RowActions>
                    <IconAction
                      icon={Settings2}
                      label={`Manage ${election.title}`}
                      href={`/dashboard/admin/pemira/${election.id}`}
                    />
                    <IconAction
                      icon={Users}
                      label={`Candidates for ${election.title}`}
                      href={`/dashboard/admin/pemira/${election.id}/candidates`}
                    />
                    <IconAction
                      icon={ClipboardList}
                      label={`Voter audit for ${election.title}`}
                      href={`/dashboard/admin/pemira/${election.id}/voters`}
                    />
                  </RowActions>
                </Td>
              </Tr>
            );
          })}
        </TableShell>
      )}
    </PageStack>
  );
}
