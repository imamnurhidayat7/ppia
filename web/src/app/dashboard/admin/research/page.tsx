'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import { Download, Eye, FlaskConical, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import type { ResearchListItem } from './_components/shared';
import {
  RESEARCH_TYPES,
  errorMessage,
  statusLabel,
  statusMeta,
  typeLabel,
  typeMeta,
  unwrapList,
} from './_components/shared';

/** Metadata dates read as log entries: 05 Mar 2025. */
const DATE_OPTS = {
  dateStyle: undefined,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
} as const;


/** '' = all. The tile row doubles as the review stage filter. */
type StatusTab = '' | 'DRAFT' | 'PENDING_REVIEW' | 'UNDER_REVIEW' | 'PUBLISHED';

const TILES: { key: StatusTab; label: string; tone: 'slate' | 'amber' | 'sky' | 'violet' | 'emerald' }[] = [
  { key: '', label: 'All research', tone: 'slate' },
  { key: 'DRAFT', label: 'Draft', tone: 'slate' },
  { key: 'PENDING_REVIEW', label: 'Pending review', tone: 'amber' },
  { key: 'UNDER_REVIEW', label: 'Under review', tone: 'sky' },
  { key: 'PUBLISHED', label: 'Published', tone: 'emerald' },
];

export default function AdminResearchPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const confirmCtx = useConfirm();

  const [items, setItems] = useState<ResearchListItem[]>([]);
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
      // The admin endpoint (drafts included) defaults to a limit of 10; without
      // this the client side counts only ever see the first page.
      const res = await api.getResearchAdmin({ limit: 1000 });
      setItems(unwrapList<ResearchListItem>(res, 'researches'));
    } catch (error) {
      showError(errorMessage(error, 'Could not load research data'));
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

  // Nobody outside the content roles triggers the fetch, so the skeleton must
  // not wait on it — they get the access-denied view instead.
  const showSkeleton = (isLoading || loading) && (isLoading || canManage);

  const counts = useMemo(() => {
    const byStatus: Record<string, number> = {};
    let views = 0;
    let downloads = 0;
    items.forEach((item) => {
      if (item.researchStatus) {
        byStatus[item.researchStatus] = (byStatus[item.researchStatus] || 0) + 1;
      }
      views += item.viewCount || 0;
      downloads += item.downloadCount || 0;
    });
    return { all: items.length, byStatus, views, downloads };
  }, [items]);

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return items
      .filter((item) => {
        if (statusTab && item.researchStatus !== statusTab) return false;
        if (typeFilter && item.researchType !== typeFilter) return false;
        if (publishFilter === 'published' && !item.published) return false;
        if (publishFilter === 'draft' && item.published) return false;
        if (!query) return true;
        return (
          item.title.toLowerCase().includes(query) ||
          item.slug?.toLowerCase().includes(query) ||
          item.mainAuthor?.name?.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [items, searchQuery, statusTab, typeFilter, publishFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / itemsPerPage));
  // Clamped rather than corrected in an effect, so a filter that shrinks the
  // result set can never leave the table on an empty page.
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

  const handleDelete = async (item: ResearchListItem) => {
    const ok = await confirmCtx.confirm({
      title: 'Delete research?',
      message: `${item.title} will be deleted permanently and cannot be restored.`,
      confirmLabel: 'Yes, delete',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await api.deleteResearch(item.id);
      showSuccess('Research deleted');
      await fetchData();
    } catch (error) {
      showError(errorMessage(error, 'Could not delete research'));
    }
  };

  if (showSkeleton) {
    return <ListPageSkeleton tiles={5} rows={6} />;
  }

  if (!canManage) {
    return (
      <AccessDenied
        message="Managing research is only for Super Admin and Board."
        backHref="/dashboard"
      />
    );
  }

  return (
    <PageStack>
      <PageHeading
        title="Manage research"
        description={
          counts.all === 0
            ? 'No research recorded yet.'
            : `${counts.all} research items recorded • ${counts.views.toLocaleString('en-NZ')} views • ${counts.downloads.toLocaleString('en-NZ')} downloads`
        }
        icon={FlaskConical}
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
            <Link href="/dashboard/admin/research/new">
              <Button variant="primary" size="sm" leftIcon={<Plus className="h-4 w-4" />}>
                New research
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
          placeholder="Search title, slug, or author…"
          ariaLabel="Search research"
        />
        <FilterSelect
          value={typeFilter}
          onChange={(value) => {
            setTypeFilter(value);
            setCurrentPage(1);
          }}
          placeholder="All types"
          ariaLabel="Filter by research type"
          options={RESEARCH_TYPES.map((type) => ({ value: type.value, label: type.label }))}
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
              icon={FlaskConical}
              title="No matching research"
              description={
                statusTab
                  ? `No research at the ${statusLabel(statusTab).toLowerCase()} stage matches this filter.`
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
              icon={FlaskConical}
              title="No research yet"
              description="Add the first research item so member publications are documented."
              action={
                <Link href="/dashboard/admin/research/new">
                  <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />}>
                    New research
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
              <Th>Research</Th>
              <Th>Type</Th>
              <Th>Stage</Th>
              <Th align="center">Stats</Th>
              <Th>Created</Th>
              <Th align="right">Actions</Th>
            </>
          }
          footer={
            <>
              <div className="data-type border-t border-[#E7EFF7] px-5 py-3 text-[12px] ink-muted dark:border-slate-800">
                Showing {paginatedItems.length} of {filteredItems.length} research items
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
            const TypeIcon = typeMeta(item.researchType)?.icon;
            const status = statusMeta(item.researchStatus);
            return (
              <Tr key={item.id}>
                <Td>
                  <Link
                    href={`/dashboard/admin/research/${item.id}`}
                    className="line-clamp-2 max-w-md text-sm font-semibold ink-strong hover:underline"
                  >
                    {item.title}
                  </Link>
                  <p className="data-type truncate text-[12px] ink-muted">/{item.slug}</p>
                  {item.mainAuthor?.name && (
                    <p className="mt-0.5 truncate text-[12px] ink-muted">
                      {item.mainAuthor.name}
                    </p>
                  )}
                </Td>
                <Td>
                  <span className="data-type inline-flex items-center gap-1.5 rounded-[3px] bg-violet-50 px-2.5 py-1 text-[12px] font-bold uppercase text-violet-700 dark:bg-violet-900/25 dark:text-violet-300">
                    {TypeIcon && <TypeIcon aria-hidden="true" className="h-3.5 w-3.5" />}
                    {typeLabel(item.researchType)}
                  </span>
                </Td>
                <Td>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant={status?.badge || 'default'} className="data-type uppercase">
                      {status?.label || statusLabel(item.researchStatus)}
                    </Badge>
                    {item.published ? (
                      <Badge variant="outline" className="data-type uppercase">Public</Badge>
                    ) : (
                      <Badge variant="warning" className="data-type uppercase">Unpublished</Badge>
                    )}
                  </div>
                </Td>
                <Td align="center">
                  <span className="data-type inline-flex items-center gap-3 text-[12px] ink-muted">
                    <span className="inline-flex items-center gap-1">
                      <Eye aria-hidden="true" className="h-3.5 w-3.5" />
                      {(item.viewCount || 0).toLocaleString('en-NZ')}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Download aria-hidden="true" className="h-3.5 w-3.5" />
                      {(item.downloadCount || 0).toLocaleString('en-NZ')}
                    </span>
                  </span>
                </Td>
                <Td>
                  <span className="data-type whitespace-nowrap text-[12px]">
                    {formatDate(item.createdAt, DATE_OPTS)}
                  </span>
                </Td>
                <Td align="right">
                  <RowActions>
                    <IconAction
                      icon={Eye}
                      label={`View detail of ${item.title}`}
                      href={`/dashboard/admin/research/${item.id}`}
                    />
                    <IconAction
                      icon={Pencil}
                      label={`Edit ${item.title}`}
                      href={`/dashboard/admin/research/${item.id}/edit`}
                    />
                    <IconAction
                      icon={Trash2}
                      label={`Delete research ${item.title}`}
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
