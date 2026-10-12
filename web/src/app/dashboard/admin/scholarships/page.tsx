'use client';

/**
 * Board management list for scholarships.
 *
 * Mirrors the research admin list: status tiles double as the stage filter and
 * one click publishes. Scholarships are board-managed content — only
 * SUPER_ADMIN and BOARD reach this screen, same as articles and research.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, GraduationCap, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import { useToast } from '@/components/Toast';
import { ConfirmHost, useConfirm } from '@/hooks/useConfirm';
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
import { cn, formatDate } from '@/lib/utils';
import {
  SCHOLARSHIP_TYPES,
  errorMessage,
  statusLabel,
  statusMeta,
  typeLabel,
  unwrapList,
  type Scholarship,
} from './_components/shared';

const DATE_OPTS = {
  dateStyle: undefined,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
} as const;

/** '' = all. The tile row doubles as the review stage filter. */
type StatusTab = '' | 'DRAFT' | 'PENDING_REVIEW' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'PUBLISHED';

const TILES: { key: StatusTab; label: string; tone: 'slate' | 'amber' | 'sky' | 'violet' | 'emerald' | 'red' }[] = [
  { key: '', label: 'All', tone: 'slate' },
  { key: 'PENDING_REVIEW', label: 'Pending review', tone: 'amber' },
  { key: 'UNDER_REVIEW', label: 'Under review', tone: 'sky' },
  { key: 'APPROVED', label: 'Approved', tone: 'violet' },
  { key: 'PUBLISHED', label: 'Published', tone: 'emerald' },
  { key: 'REJECTED', label: 'Rejected', tone: 'red' },
];

export default function AdminScholarshipsPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const confirmCtx = useConfirm();

  const [items, setItems] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusTab, setStatusTab] = useState<StatusTab>('');
  const [typeFilter, setTypeFilter] = useState('');
  const [publishFilter, setPublishFilter] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const canManage = user?.role === 'SUPER_ADMIN' || user?.role === 'BOARD';

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.getScholarshipsAdmin({ limit: 1000 });
      setItems(unwrapList<Scholarship>(res, 'scholarships'));
    } catch (error) {
      showError(errorMessage(error, 'Could not load scholarships'));
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

  const showSkeleton = (isLoading || loading) && (isLoading || canManage);

  const counts = useMemo(() => {
    const byStatus: Record<string, number> = {};
    items.forEach((item) => {
      if (item.status) {
        byStatus[item.status] = (byStatus[item.status] || 0) + 1;
      }
    });
    return { all: items.length, byStatus };
  }, [items]);

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return items
      .filter((item) => {
        if (statusTab && item.status !== statusTab) return false;
        if (typeFilter && item.type !== typeFilter) return false;
        if (publishFilter === 'published' && !item.published) return false;
        if (publishFilter === 'draft' && item.published) return false;
        if (!query) return true;
        return (
          item.name.toLowerCase().includes(query) ||
          item.slug?.toLowerCase().includes(query) ||
          item.submittedBy?.name?.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [items, searchQuery, statusTab, typeFilter, publishFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / itemsPerPage));
  const page = Math.min(currentPage, totalPages);

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, page, itemsPerPage]);

  const hasFilters = Boolean(searchQuery || statusTab || typeFilter || publishFilter);

  const resetFilters = () => {
    setSearchQuery('');
    setStatusTab('');
    setTypeFilter('');
    setPublishFilter('');
    setCurrentPage(1);
  };

  const handleApprove = async (item: Scholarship) => {
    const ok = await confirmCtx.confirm({
      title: 'Publish scholarship?',
      message: `${item.name} will go live on the public scholarship page.`,
      confirmLabel: 'Yes, publish',
    });
    if (!ok) return;
    try {
      await api.updateScholarship(item.id, { status: 'PUBLISHED' });
      showSuccess('Scholarship published');
      await fetchData();
    } catch (error) {
      showError(errorMessage(error, 'Could not publish scholarship'));
    }
  };

  const handleDelete = async (item: Scholarship) => {
    const ok = await confirmCtx.confirm({
      title: 'Delete scholarship?',
      message: `${item.name} will be deleted permanently and cannot be restored.`,
      confirmLabel: 'Yes, delete',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await api.deleteScholarship(item.id);
      showSuccess('Scholarship deleted');
      await fetchData();
    } catch (error) {
      showError(errorMessage(error, 'Could not delete scholarship'));
    }
  };

  if (showSkeleton) {
    return <ListPageSkeleton tiles={6} rows={6} />;
  }

  if (!canManage) {
    return (
      <AccessDenied
        message="Reviewing scholarships is only for Super Admin and Board."
        backHref="/dashboard"
      />
    );
  }

  return (
    <PageStack>
      <PageHeading
        title="Manage scholarships"
        description={
          counts.all === 0
            ? 'No scholarships recorded yet.'
            : `${counts.all} scholarships recorded • ${counts.byStatus.PUBLISHED ?? 0} published`
        }
        icon={GraduationCap}
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
            <Link href="/dashboard/admin/scholarships/new">
              <Button variant="primary" size="sm" leftIcon={<Plus className="h-4 w-4" />}>
                New scholarship
              </Button>
            </Link>
          </>
        }
      />

      <StatTileRow columns={5}>
        {TILES.map((tile) => (
          <StatTile
            key={tile.key || 'all'}
            label={tile.label}
            value={tile.key ? counts.byStatus[tile.key] ?? 0 : counts.all}
            tone={tile.tone}
            active={statusTab === tile.key}
            onClick={() => {
              setStatusTab(tile.key);
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
          placeholder="Search name, slug, or submitter…"
          ariaLabel="Search scholarships"
        />
        <FilterSelect
          value={typeFilter}
          onChange={(value) => {
            setTypeFilter(value);
            setCurrentPage(1);
          }}
          placeholder="All types"
          ariaLabel="Filter by scholarship type"
          options={SCHOLARSHIP_TYPES.map((type) => ({ value: type.value, label: type.label }))}
        />
        <FilterSelect
          value={publishFilter}
          onChange={(value) => {
            setPublishFilter(value);
            setCurrentPage(1);
          }}
          placeholder="All publishing states"
          ariaLabel="Filter by publishing state"
          className="lg:w-44"
          options={[
            { value: 'published', label: 'Published' },
            { value: 'draft', label: 'Unpublished' },
          ]}
        />
        {hasFilters && <ResetFiltersButton onClick={resetFilters} />}
      </Toolbar>

      {filteredItems.length === 0 ? (
        <SectionCard flush>
          {hasFilters ? (
            <EmptyBlock
              icon={GraduationCap}
              title="No matching scholarships"
              description={
                statusTab
                  ? `No scholarships at the ${statusLabel(statusTab).toLowerCase()} stage match this filter.`
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
              icon={GraduationCap}
              title="No scholarships yet"
              description="Add the first scholarship so members can find funding."
              action={
                <Link href="/dashboard/admin/scholarships/new">
                  <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />}>
                    New scholarship
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
              <Th>Scholarship</Th>
              <Th>Type</Th>
              <Th>Stage</Th>
              <Th>Updated</Th>
              <Th align="right">Actions</Th>
            </>
          }
          footer={
            <>
              <div className="data-type border-t border-[#E7EFF7] px-5 py-3 text-[12px] ink-muted dark:border-slate-800">
                Showing {paginatedItems.length} of {filteredItems.length} scholarships
              </div>
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={filteredItems.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                showItemsPerPage
                onItemsPerPageChange={(limit) => {
                  setItemsPerPage(limit);
                  setCurrentPage(1);
                }}
              />
            </>
          }
        >
          {paginatedItems.map((item) => {
            const status = statusMeta(item.status);
            return (
              <Tr key={item.id}>
                <Td>
                  <Link
                    href={`/dashboard/admin/scholarships/${item.id}/edit`}
                    className="line-clamp-2 max-w-md text-sm font-semibold ink-strong hover:underline"
                  >
                    {item.name}
                  </Link>
                  <p className="data-type truncate text-[12px] ink-muted">/{item.slug}</p>
                  {item.submittedBy?.name && (
                    <p className="mt-0.5 truncate text-[12px] ink-muted">{item.submittedBy.name}</p>
                  )}
                  {item.status === 'REJECTED' && item.reviewComments && (
                    <p className="mt-0.5 line-clamp-2 max-w-md text-[12px] text-danger-600 dark:text-danger-400">
                      Feedback: {item.reviewComments}
                    </p>
                  )}
                </Td>
                <Td>
                  <span className="data-type inline-flex items-center gap-1.5 rounded-[3px] bg-violet-50 px-2.5 py-1 text-[12px] font-bold uppercase text-violet-700 dark:bg-violet-900/25 dark:text-violet-300">
                    {typeLabel(item.type)}
                  </span>
                </Td>
                <Td>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant={status?.badge || 'default'} className="data-type uppercase">
                      {status?.label || statusLabel(item.status)}
                    </Badge>
                    {item.published ? (
                      <Badge variant="outline" className="data-type uppercase">Public</Badge>
                    ) : (
                      <Badge variant="warning" className="data-type uppercase">Unpublished</Badge>
                    )}
                  </div>
                </Td>
                <Td>
                  <span className="data-type whitespace-nowrap text-[12px]">
                    {formatDate(item.updatedAt, DATE_OPTS)}
                  </span>
                </Td>
                <Td align="right">
                  <RowActions>
                    {item.status !== 'PUBLISHED' && (
                      <IconAction
                        icon={Check}
                        label={`Publish ${item.name}`}
                        onClick={() => handleApprove(item)}
                      />
                    )}
                    <IconAction
                      icon={Pencil}
                      label={`Edit ${item.name}`}
                      href={`/dashboard/admin/scholarships/${item.id}/edit`}
                    />
                    <IconAction
                      icon={Trash2}
                      label={`Delete scholarship ${item.name}`}
                      tone="danger"
                      onClick={() => handleDelete(item)}
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
