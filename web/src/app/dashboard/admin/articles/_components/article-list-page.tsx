'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import { Plus, RefreshCw } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/Toast';
import { ConfirmHost, useConfirm } from '@/hooks/useConfirm';
import { Button, Pagination } from '@/components/ui';
import {
  AccessDenied,
  EmptyBlock,
  ListPageSkeleton,
  PageHeading,
  PageStack,
  ResetFiltersButton,
  SearchField,
  SectionCard,
  StatTile,
  StatTileRow,
  Toolbar,
} from '@/components/dashboard';
import { cn } from '@/lib/utils';
import { ArticleTable } from './article-table';
import type { AdminArticle } from './shared';
import { errorMessage } from './shared';

/** '' = all. The tile row doubles as the status filter. */
type StatusTab = '' | 'published' | 'draft';

interface ArticleListPageProps {
  eyebrow?: string;
  title: string;
  icon: LucideIcon;
  /** Singular lowercase noun used across the copy, e.g. 'news item'. */
  noun: string;
  newHref: string;
  newLabel: string;
  editHref: (item: AdminArticle) => string;
  publicHref?: (item: AdminArticle) => string;
  /** Receives the debounced search term; ignore it for endpoints that filter locally. */
  fetchItems: (search: string) => Promise<AdminArticle[]>;
  deleteItem: (item: AdminArticle) => Promise<void>;
  deniedMessage: string;
  emptyTitle: string;
  emptyDescription: string;
  searchPlaceholder: string;
}

/**
 * The list half of `articles/news` and `articles/research`: same tiles, toolbar,
 * table and pagination, only the data source and the copy change.
 */
export function ArticleListPage({
  eyebrow,
  title,
  icon,
  noun,
  newHref,
  newLabel,
  editHref,
  publicHref,
  fetchItems,
  deleteItem,
  deniedMessage,
  emptyTitle,
  emptyDescription,
  searchPlaceholder,
}: ArticleListPageProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const confirmCtx = useConfirm();

  const [items, setItems] = useState<AdminArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusTab, setStatusTab] = useState<StatusTab>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canManage = user?.role === 'SUPER_ADMIN' || user?.role === 'BOARD';

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  const loadItems = useCallback(async () => {
    try {
      setItems(await fetchItems(searchQuery));
    } catch (error) {
      showError(errorMessage(error, `Could not load ${noun} data`));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchItems, searchQuery, noun, showError]);

  // Fetch-on-mount plus fetch-on-search. State is only written inside
  // loadItems() after the network resolves, and the 400ms timer keeps typing
  // from firing one request per keystroke.
  useEffect(() => {
    if (!canManage) return;
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      loadItems();
    }, 400);
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [canManage, loadItems]);

  // Nobody outside the content roles triggers the fetch, so the skeleton must
  // not wait on it — they get the access-denied view instead.
  const showSkeleton = (isLoading || loading) && (isLoading || canManage);

  const counts = useMemo(() => {
    const result = { all: items.length, published: 0, draft: 0, views: 0 };
    items.forEach((item) => {
      if (item.published) result.published += 1;
      else result.draft += 1;
      result.views += item.views || 0;
    });
    return result;
  }, [items]);

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return items
      .filter((item) => {
        if (statusTab === 'published' && !item.published) return false;
        if (statusTab === 'draft' && item.published) return false;
        if (!query) return true;
        return (
          item.title.toLowerCase().includes(query) ||
          item.slug?.toLowerCase().includes(query) ||
          item.excerpt?.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [items, searchQuery, statusTab]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / itemsPerPage));
  // Clamped rather than corrected in an effect, so a filter that shrinks the
  // result set can never leave the table on an empty page.
  const page = Math.min(currentPage, totalPages);

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, page, itemsPerPage]);

  const hasFilters = Boolean(searchQuery || statusTab);

  const resetFilters = () => {
    setSearchQuery('');
    setStatusTab('');
    setCurrentPage(1);
  };

  const handleDelete = async (item: AdminArticle) => {
    const ok = await confirmCtx.confirm({
      title: `Delete ${noun}?`,
      message: `${item.title} will be deleted permanently and cannot be restored.`,
      confirmLabel: 'Yes, delete',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await deleteItem(item);
      showSuccess(`${noun.charAt(0).toUpperCase()}${noun.slice(1)} deleted`);
      await loadItems();
    } catch (error) {
      showError(errorMessage(error, `Could not delete ${noun}`));
    }
  };

  if (showSkeleton) {
    return <ListPageSkeleton tiles={3} rows={6} />;
  }

  if (!canManage) {
    return <AccessDenied message={deniedMessage} backHref="/dashboard" />;
  }

  const tiles: { key: StatusTab; label: string; value: number; tone: 'slate' | 'emerald' | 'amber' }[] = [
    { key: '', label: `All ${noun}s`, value: counts.all, tone: 'slate' },
    { key: 'published', label: 'Published', value: counts.published, tone: 'emerald' },
    { key: 'draft', label: 'Draft', value: counts.draft, tone: 'amber' },
  ];

  return (
    <PageStack>
      <PageHeading
        eyebrow={eyebrow}
        title={title}
        description={
          counts.all === 0
            ? `No ${noun}s yet.`
            : `${counts.all} ${noun}s recorded • ${counts.published} published • ${counts.views.toLocaleString('en-NZ')} views`
        }
        icon={icon}
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
                loadItems();
              }}
            >
              Refresh
            </Button>
            <Link href={newHref}>
              <Button variant="primary" size="sm" leftIcon={<Plus className="h-4 w-4" />}>
                {newLabel}
              </Button>
            </Link>
          </>
        }
      />

      <StatTileRow columns={3}>
        {tiles.map((tile) => (
          <StatTile
            key={tile.key || 'all'}
            label={tile.label}
            value={tile.value}
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
          placeholder={searchPlaceholder}
          ariaLabel={`Search ${noun}s`}
        />
        {hasFilters && <ResetFiltersButton onClick={resetFilters} />}
      </Toolbar>

      {filteredItems.length === 0 ? (
        <SectionCard flush>
          {hasFilters ? (
            <EmptyBlock
              icon={icon}
              title={`No matching ${noun}s`}
              description="Try a different keyword or filter."
              action={
                <Button variant="secondary" onClick={resetFilters}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyBlock
              icon={icon}
              title={emptyTitle}
              description={emptyDescription}
              action={
                <Link href={newHref}>
                  <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />}>
                    {newLabel}
                  </Button>
                </Link>
              }
            />
          )}
        </SectionCard>
      ) : (
        <ArticleTable
          items={paginatedItems}
          icon={icon}
          noun={noun}
          editHref={editHref}
          publicHref={publicHref}
          onDelete={handleDelete}
          footer={
            <>
              <div className="data-type border-t border-[#E7EFF7] px-5 py-3 text-[12px] ink-muted dark:border-slate-800">
                Showing {paginatedItems.length} of {filteredItems.length} {noun}s
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
        />
      )}

      <ConfirmHost ctx={confirmCtx} />
    </PageStack>
  );
}
