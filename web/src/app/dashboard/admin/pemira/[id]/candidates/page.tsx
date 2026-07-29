'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import { useToast } from '@/components/Toast';
import { Badge, Button, Modal, ModalFooter, Pagination } from '@/components/ui';
import {
  AccessDenied,
  DetailItem,
  EmptyBlock,
  Field,
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
import { Check, Eye, MessageSquareWarning, RefreshCw, Users, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CandidateUser {
  id?: string;
  name: string;
  username?: string;
  email?: string;
}

interface AdminCandidate {
  id: string;
  status: string;
  vision?: string;
  mission?: string;
  experience?: string;
  program?: string;
  slogan?: string;
  rejectionReason?: string | null;
  approvedAt?: string | null;
  createdAt: string;
  user: CandidateUser;
}

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'outline';

const STATUS_META: Record<string, { label: string; variant: BadgeVariant }> = {
  PENDING: { label: 'Pending', variant: 'warning' },
  APPROVED: { label: 'Approved', variant: 'success' },
  REJECTED: { label: 'Rejected', variant: 'danger' },
  WITHDRAWN: { label: 'Withdrawn', variant: 'default' },
};

const MIN_REASON_LENGTH = 5;
const PAGE_SIZE = 10;

function formatDateTime(value?: string | null): string {
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

export default function AdminCandidatesPage() {
  const params = useParams<{ id: string }>();
  const electionId = params?.id ?? '';
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const { showError, showSuccess } = useToast();

  const [candidates, setCandidates] = useState<AdminCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const [detailCandidate, setDetailCandidate] = useState<AdminCandidate | null>(null);
  const [rejectCandidate, setRejectCandidate] = useState<AdminCandidate | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // PEMIRA is Super Admin only; the API enforces this as well.
  const canManage = user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  const fetchCandidates = useCallback(async () => {
    try {
      const res = (await api.getCandidates(electionId)) as { candidates?: AdminCandidate[] };
      setCandidates(res.candidates ?? []);
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      showError(err.response?.data?.error || err.message || 'Could not load candidates');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [electionId, showError]);

  /* eslint-disable react-hooks/set-state-in-effect --
     fetchCandidates() only writes state after a network await (fetch-on-mount);
     the linter cannot see past that call. */
  useEffect(() => {
    if (user && canManage && electionId) {
      fetchCandidates();
    }
  }, [user, canManage, electionId, fetchCandidates]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Non Super Admins never trigger the fetch, so the skeleton does not wait for it.
  const showSkeleton = (isLoading || loading) && (isLoading || canManage);

  const counts = useMemo(() => {
    const result: Record<string, number> = {
      all: candidates.length,
      PENDING: 0,
      APPROVED: 0,
      REJECTED: 0,
      WITHDRAWN: 0,
    };
    candidates.forEach((candidate) => {
      if (result[candidate.status] !== undefined) result[candidate.status] += 1;
    });
    return result;
  }, [candidates]);

  const filteredCandidates = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return candidates.filter((candidate) => {
      if (statusFilter && candidate.status !== statusFilter) return false;
      if (!query) return true;
      return (
        candidate.user.name.toLowerCase().includes(query) ||
        (candidate.user.username?.toLowerCase().includes(query) ?? false) ||
        (candidate.user.email?.toLowerCase().includes(query) ?? false) ||
        (candidate.slogan?.toLowerCase().includes(query) ?? false)
      );
    });
  }, [candidates, searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredCandidates.length / PAGE_SIZE));
  // Clamped on render instead of corrected through a useEffect.
  const currentPage = Math.min(page, totalPages);
  const visibleCandidates = filteredCandidates.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const hasFilters = Boolean(searchQuery || statusFilter);

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setPage(1);
  };

  const handleApprove = async (candidate: AdminCandidate) => {
    setProcessingId(candidate.id);
    try {
      await api.approveCandidate(candidate.id);
      setCandidates((prev) =>
        prev.map((item) =>
          item.id === candidate.id
            ? { ...item, status: 'APPROVED', rejectionReason: null }
            : item
        )
      );
      showSuccess(`${candidate.user.name} approved as a candidate`);
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      showError(err.response?.data?.error || err.message || 'Could not approve the candidate');
    } finally {
      setProcessingId(null);
    }
  };

  const openReject = (candidate: AdminCandidate) => {
    setRejectCandidate(candidate);
    setRejectReason('');
    setRejectError('');
  };

  const handleReject = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!rejectCandidate) return;
    const reason = rejectReason.trim();
    if (reason.length < MIN_REASON_LENGTH) {
      setRejectError(`The reason needs at least ${MIN_REASON_LENGTH} characters`);
      return;
    }
    setProcessingId(rejectCandidate.id);
    try {
      await api.rejectCandidate(rejectCandidate.id, reason);
      setCandidates((prev) =>
        prev.map((item) =>
          item.id === rejectCandidate.id
            ? { ...item, status: 'REJECTED', rejectionReason: reason }
            : item
        )
      );
      showSuccess('Candidate rejected');
      setRejectCandidate(null);
      setRejectReason('');
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      setRejectError(
        err.response?.data?.error || err.message || 'Could not reject the candidate'
      );
    } finally {
      setProcessingId(null);
    }
  };

  if (showSkeleton) {
    return <ListPageSkeleton tiles={5} rows={6} />;
  }

  if (!canManage) {
    return (
      <AccessDenied
        message="Managing PEMIRA candidates is limited to Super Admins."
        backHref="/dashboard"
      />
    );
  }

  const tiles: { key: string; label: string; value: number; tone: 'slate' | 'amber' | 'emerald' | 'red' | 'violet' }[] = [
    { key: '', label: 'All candidates', value: counts.all, tone: 'slate' },
    { key: 'PENDING', label: 'Pending', value: counts.PENDING, tone: 'amber' },
    { key: 'APPROVED', label: 'Approved', value: counts.APPROVED, tone: 'emerald' },
    { key: 'REJECTED', label: 'Rejected', value: counts.REJECTED, tone: 'red' },
    { key: 'WITHDRAWN', label: 'Withdrawn', value: counts.WITHDRAWN, tone: 'violet' },
  ];

  return (
    <PageStack>
      <PageHeading
        eyebrow="PEMIRA"
        title="Manage candidates"
        description={`${counts.PENDING} pending approval • ${counts.APPROVED} approved • ${counts.REJECTED} rejected`}
        icon={Users}
        backHref={`/dashboard/admin/pemira/${electionId}`}
        backLabel="Back to election"
        actions={
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />}
            onClick={() => {
              setRefreshing(true);
              fetchCandidates();
            }}
          >
            Refresh
          </Button>
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
              setPage(1);
            }}
          />
        ))}
      </StatTileRow>

      <Toolbar>
        <SearchField
          value={searchQuery}
          onChange={(value) => {
            setSearchQuery(value);
            setPage(1);
          }}
          placeholder="Search name, username, email, or slogan…"
          ariaLabel="Search candidates"
        />
        {hasFilters && <ResetFiltersButton onClick={resetFilters} />}
      </Toolbar>

      {filteredCandidates.length === 0 ? (
        <SectionCard flush>
          {hasFilters ? (
            <EmptyBlock
              icon={Users}
              title="No matching candidates"
              description="Try changing the keywords or the status filter you are using."
              action={
                <Button variant="secondary" onClick={resetFilters}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyBlock
              icon={Users}
              title="No candidates yet"
              description="Candidates appear here once members register during the registration phase."
            />
          )}
        </SectionCard>
      ) : (
        <TableShell
          head={
            <>
              <Th>Candidate</Th>
              <Th>Status</Th>
              <Th>Submitted</Th>
              <Th>Notes</Th>
              <Th align="right">Actions</Th>
            </>
          }
          footer={
            <div className="border-t border-[#E7EFF7] px-5 py-3 dark:border-slate-800">
              <p className="data-type mb-2 text-[12px] ink-muted">
                Showing {visibleCandidates.length} of {filteredCandidates.length} candidates
              </p>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredCandidates.length}
                itemsPerPage={PAGE_SIZE}
                onPageChange={setPage}
              />
            </div>
          }
        >
          {visibleCandidates.map((candidate) => {
            const meta = STATUS_META[candidate.status] ?? {
              label: candidate.status,
              variant: 'default' as BadgeVariant,
            };
            const busy = processingId === candidate.id;
            return (
              <Tr key={candidate.id}>
                <Td>
                  <div className="flex items-start gap-3">
                    <span aria-hidden="true" style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.22), 0 0 0 4px rgba(11,28,46,0.10)' }} className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0B1C2E] font-display text-sm font-black text-white">
                      {candidate.user.name.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold ink-strong">
                        {candidate.user.name}
                      </p>
                      <p className="truncate text-[12px] ink-muted">
                        {candidate.user.username ? `@${candidate.user.username}` : '—'}
                        {candidate.user.email ? ` • ${candidate.user.email}` : ''}
                      </p>
                      {candidate.slogan && (
                        <p className="mt-0.5 line-clamp-1 max-w-xs text-[12px] italic ink-muted">
                          &ldquo;{candidate.slogan}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>
                </Td>
                <Td>
                  <Badge variant={meta.variant} className="data-type uppercase">{meta.label}</Badge>
                </Td>
                <Td>
                  <span className="data-type whitespace-nowrap text-[12px]">
                    {formatDateTime(candidate.createdAt)}
                  </span>
                </Td>
                <Td>
                  {candidate.status === 'REJECTED' && candidate.rejectionReason ? (
                    <span className="line-clamp-2 max-w-xs text-[12px] text-danger-600 dark:text-rose-300">
                      {candidate.rejectionReason}
                    </span>
                  ) : candidate.status === 'APPROVED' && candidate.approvedAt ? (
                    <span className="text-[12px] ink-muted">
                      Approved {formatDateTime(candidate.approvedAt)}
                    </span>
                  ) : (
                    <span className="ink-muted">—</span>
                  )}
                </Td>
                <Td align="right">
                  <RowActions>
                    <IconAction
                      icon={Eye}
                      label={`View vision and mission for ${candidate.user.name}`}
                      onClick={() => setDetailCandidate(candidate)}
                    />
                    {candidate.status === 'PENDING' && (
                      <>
                        <IconAction
                          icon={Check}
                          label={`Approve ${candidate.user.name}`}
                          disabled={busy}
                          onClick={() => handleApprove(candidate)}
                        />
                        <IconAction
                          icon={X}
                          label={`Reject ${candidate.user.name}`}
                          tone="danger"
                          disabled={busy}
                          onClick={() => openReject(candidate)}
                        />
                      </>
                    )}
                  </RowActions>
                </Td>
              </Tr>
            );
          })}
        </TableShell>
      )}

      <Modal
        isOpen={Boolean(detailCandidate)}
        onClose={() => setDetailCandidate(null)}
        title="Candidate detail"
        description={detailCandidate?.user.name}
        size="lg"
      >
        {detailCandidate && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DetailItem
                label="Status"
                value={STATUS_META[detailCandidate.status]?.label ?? detailCandidate.status}
              />
              <DetailItem label="Submitted" value={formatDateTime(detailCandidate.createdAt)} />
            </div>

            {detailCandidate.slogan && (
              <DetailItem label="Slogan" value={detailCandidate.slogan} />
            )}
            <DetailItem label="Vision" value={detailCandidate.vision} />
            <DetailItem label="Mission" value={detailCandidate.mission} />
            {detailCandidate.experience && (
              <DetailItem label="Experience" value={detailCandidate.experience} />
            )}
            {detailCandidate.program && (
              <DetailItem label="Programme" value={detailCandidate.program} />
            )}
            {detailCandidate.status === 'REJECTED' && detailCandidate.rejectionReason && (
              <div className="rounded-[4px] border border-rose-200 bg-rose-50 p-4 dark:border-rose-500/30 dark:bg-rose-500/10">
                <p className="data-type text-[12px] font-bold uppercase text-rose-700 dark:text-rose-300">
                  Rejection reason
                </p>
                <p className="mt-1 text-sm text-rose-700 dark:text-rose-200">
                  {detailCandidate.rejectionReason}
                </p>
              </div>
            )}

            <ModalFooter>
              <Button variant="secondary" onClick={() => setDetailCandidate(null)}>
                Close
              </Button>
            </ModalFooter>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={Boolean(rejectCandidate)}
        onClose={() => setRejectCandidate(null)}
        title="Reject candidate"
        description={rejectCandidate?.user.name}
        size="md"
      >
        <form onSubmit={handleReject} className="space-y-4">
          <Field
            label="Rejection reason"
            htmlFor="reject-reason"
            required
            error={rejectError || undefined}
            hint={`At least ${MIN_REASON_LENGTH} characters. Currently ${rejectReason.trim().length} characters.`}
          >
            <textarea
              id="reject-reason"
              rows={4}
              value={rejectReason}
              onChange={(changeEvent) => {
                setRejectReason(changeEvent.target.value);
                setRejectError('');
              }}
              className="input-base rounded-[4px] border-[#C3D2E0] dark:border-slate-700 resize-none"
              placeholder="For example: the vision and mission are not specific enough, active membership requirements are not met…"
            />
          </Field>

          <div className="flex items-start gap-2 rounded-[4px] border border-amber-200 bg-amber-50 p-3 dark:border-amber-500/30 dark:bg-amber-500/10">
            <MessageSquareWarning className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="text-[12px] text-amber-700 dark:text-amber-200">
              This reason is shown to the candidate and they can register again.
            </p>
          </div>

          <ModalFooter>
            <Button type="button" variant="secondary" onClick={() => setRejectCandidate(null)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              isLoading={processingId === rejectCandidate?.id}
              disabled={rejectReason.trim().length < MIN_REASON_LENGTH}
            >
              Reject candidate
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </PageStack>
  );
}
