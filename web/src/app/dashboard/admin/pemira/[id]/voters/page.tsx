'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import { useToast } from '@/components/Toast';
import { Button, Pagination } from '@/components/ui';
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
import { ClipboardList, Clock, RefreshCw, UserCheck, Users, Vote } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoterRef {
  id?: string;
  name: string;
  email?: string;
}

interface VoteRecord {
  id: string;
  votedAt: string;
  voter: VoterRef;
  candidate: { id?: string; user: { id?: string; name: string } };
}

const PAGE_SIZE = 20;

function formatDateTime(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-NZ', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminVotersPage() {
  const params = useParams<{ id: string }>();
  const electionId = params?.id ?? '';
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const { showError } = useToast();

  const [votes, setVotes] = useState<VoteRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [candidateFilter, setCandidateFilter] = useState('');
  const [page, setPage] = useState(1);

  // Voter data is private, so Super Admin only.
  const canManage = user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  const fetchVotes = useCallback(async () => {
    try {
      const res = (await api.getElectionVoters(electionId)) as { votes?: VoteRecord[] };
      setVotes(res.votes ?? []);
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      showError(err.response?.data?.error || err.message || 'Could not load voter data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [electionId, showError]);

  /* eslint-disable react-hooks/set-state-in-effect --
     fetchVotes() only writes state after a network await (fetch-on-mount);
     the linter cannot see past that call. */
  useEffect(() => {
    if (user && canManage && electionId) {
      fetchVotes();
    }
  }, [user, canManage, electionId, fetchVotes]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Non Super Admins never trigger the fetch, so the skeleton does not wait for it.
  const showSkeleton = (isLoading || loading) && (isLoading || canManage);

  const candidateOptions = useMemo(() => {
    const seen = new Map<string, string>();
    votes.forEach((vote) => {
      const name = vote.candidate.user.name;
      if (!seen.has(name)) seen.set(name, name);
    });
    return Array.from(seen.values()).map((name) => ({ value: name, label: name }));
  }, [votes]);

  const stats = useMemo(() => {
    const voters = new Set<string>();
    let latest = 0;
    votes.forEach((vote) => {
      voters.add(vote.voter.id || vote.voter.email || vote.voter.name);
      const ts = new Date(vote.votedAt).getTime();
      if (Number.isFinite(ts) && ts > latest) latest = ts;
    });
    return {
      total: votes.length,
      uniqueVoters: voters.size,
      candidates: candidateOptions.length,
      latest,
    };
  }, [votes, candidateOptions]);

  const filteredVotes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return votes
      .filter((vote) => {
        if (candidateFilter && vote.candidate.user.name !== candidateFilter) return false;
        if (!query) return true;
        return (
          vote.voter.name.toLowerCase().includes(query) ||
          (vote.voter.email?.toLowerCase().includes(query) ?? false) ||
          vote.candidate.user.name.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => new Date(b.votedAt).getTime() - new Date(a.votedAt).getTime());
  }, [votes, searchQuery, candidateFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredVotes.length / PAGE_SIZE));
  // Clamped on render instead of corrected through a useEffect.
  const currentPage = Math.min(page, totalPages);
  const visibleVotes = filteredVotes.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const hasFilters = Boolean(searchQuery || candidateFilter);

  const resetFilters = () => {
    setSearchQuery('');
    setCandidateFilter('');
    setPage(1);
  };

  if (showSkeleton) {
    return <ListPageSkeleton tiles={4} rows={8} />;
  }

  if (!canManage) {
    return (
      <AccessDenied
        message="PEMIRA voter audit is limited to Super Admins."
        backHref="/dashboard"
      />
    );
  }

  return (
    <PageStack>
      <PageHeading
        eyebrow="PEMIRA"
        title="Voter audit"
        description={
          stats.total === 0
            ? 'No votes have been cast yet.'
            : `${stats.total} votes cast from ${stats.uniqueVoters} voters.`
        }
        icon={ClipboardList}
        backHref={`/dashboard/admin/pemira/${electionId}`}
        backLabel="Back to election"
        actions={
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />}
            onClick={() => {
              setRefreshing(true);
              fetchVotes();
            }}
          >
            Refresh
          </Button>
        }
      />

      <StatTileRow columns={4}>
        <StatTile label="Votes cast" value={stats.total} tone="red" icon={Vote} />
        <StatTile label="Unique voters" value={stats.uniqueVoters} tone="sky" icon={UserCheck} />
        <StatTile label="Candidates voted for" value={stats.candidates} tone="violet" icon={Users} />
        <StatTile
          label="Last vote"
          value={stats.latest ? formatDateTime(new Date(stats.latest).toISOString()) : '—'}
          tone="amber"
          icon={Clock}
        />
      </StatTileRow>

      <Toolbar>
        <SearchField
          value={searchQuery}
          onChange={(value) => {
            setSearchQuery(value);
            setPage(1);
          }}
          placeholder="Search voter name, email, or candidate…"
          ariaLabel="Search voters"
        />
        <FilterSelect
          value={candidateFilter}
          onChange={(value) => {
            setCandidateFilter(value);
            setPage(1);
          }}
          placeholder="All candidates"
          ariaLabel="Filter by candidate voted for"
          options={candidateOptions}
        />
        {hasFilters && <ResetFiltersButton onClick={resetFilters} />}
      </Toolbar>

      {filteredVotes.length === 0 ? (
        <SectionCard flush>
          {hasFilters ? (
            <EmptyBlock
              icon={ClipboardList}
              title="No matching votes"
              description="Try changing the keywords or the candidate filter you are using."
              action={
                <Button variant="secondary" onClick={resetFilters}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyBlock
              icon={Vote}
              title="No votes yet"
              description="This list fills automatically once members start voting during the voting phase."
            />
          )}
        </SectionCard>
      ) : (
        <TableShell
          head={
            <>
              <Th>Voter</Th>
              <Th>Email</Th>
              <Th>Voted for</Th>
              <Th>Time</Th>
            </>
          }
          footer={
            <div className="border-t border-[#E7EFF7] px-5 py-3 dark:border-slate-800">
              <p className="data-type mb-2 text-[12px] ink-muted">
                Showing {visibleVotes.length} of {filteredVotes.length} votes
              </p>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredVotes.length}
                itemsPerPage={PAGE_SIZE}
                onPageChange={setPage}
              />
            </div>
          }
        >
          {visibleVotes.map((vote) => (
            <Tr key={vote.id}>
              <Td>
                <div className="flex items-center gap-3">
                  <span aria-hidden="true" style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.22), 0 0 0 4px rgba(11,28,46,0.10)' }} className="data-type flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0B1C2E] text-[12px] font-bold text-white">
                    {vote.voter.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="truncate font-medium ink-strong">
                    {vote.voter.name}
                  </span>
                </div>
              </Td>
              <Td>
                <span className="ink-muted">{vote.voter.email || '—'}</span>
              </Td>
              <Td>
                <span className="font-semibold text-[#E8231A]">{vote.candidate.user.name}</span>
              </Td>
              <Td>
                <span className="data-type whitespace-nowrap text-[12px] ink-muted">
                  {formatDateTime(vote.votedAt)}
                </span>
              </Td>
            </Tr>
          ))}
        </TableShell>
      )}
    </PageStack>
  );
}
