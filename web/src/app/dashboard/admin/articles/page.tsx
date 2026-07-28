'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import { useToast } from '@/components/Toast';
import { ConfirmHost, useConfirm } from '@/hooks/useConfirm';
import { Badge, Button, Modal, Pagination, Tabs, TabsList, TabsTrigger } from '@/components/ui';
import {
  AccessDenied,
  DetailItem,
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
  Toolbar,
} from '@/components/dashboard';
import { cn, formatDate } from '@/lib/utils';
import { sanitizeHtml } from '@/lib/sanitize-html';
import {
  Eye,
  FileText,
  Heart,
  Newspaper,
  Plus,
  RefreshCw,
  Star,
  Tag as TagIcon,
} from 'lucide-react';
import { ArticleTable } from './_components/article-table';
import type { AdminArticle, DivisionRef } from './_components/shared';
import { errorMessage, unwrapList } from './_components/shared';

/** Matches the `category` column the API filters on. */
type ContentType = 'News' | 'Article';

/** '' = all. The tile row doubles as the status filter. */
type StatusTab = '' | 'published' | 'draft' | 'featured';

const TAB_LABEL: Record<Exclude<StatusTab, ''>, string> = {
  published: 'published',
  draft: 'draft',
  featured: 'featured',
};

const TYPE_COPY: Record<ContentType, { label: string; lower: string }> = {
  News: { label: 'News', lower: 'news item' },
  Article: { label: 'Article', lower: 'article' },
};

export default function AdminArticlesPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const confirmCtx = useConfirm();

  const [articles, setArticles] = useState<AdminArticle[]>([]);
  const [divisions, setDivisions] = useState<DivisionRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [contentType, setContentType] = useState<ContentType>('Article');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusTab, setStatusTab] = useState<StatusTab>('');
  const [divisionFilter, setDivisionFilter] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [selectedArticle, setSelectedArticle] = useState<AdminArticle | null>(null);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canManage = user?.role === 'SUPER_ADMIN' || user?.role === 'BOARD';

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  /**
   * Fetches every article without the search filter so the tile counts and tab
   * badges always show the true totals. Searching happens on the client.
   */
  const fetchData = useCallback(async () => {
    try {
      const [articlesRes, divisionsRes] = await Promise.all([
        api.getArticlesAdmin({
          status: 'all',
          // The endpoint defaults to a limit of 10; without this the tile counts
          // and the client side pagination only ever see the first page.
          limit: 1000,
        }),
        api.getDivisions(),
      ]);
      setArticles(unwrapList<AdminArticle>(articlesRes, 'articles'));
      setDivisions(unwrapList<DivisionRef>(divisionsRes, 'divisions'));
    } catch (error) {
      showError(errorMessage(error, 'Could not load content data'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showError]);

  // Fetch-on-mount plus fetch-on-search. State is only written inside
  // fetchData() after the network resolves, and the 400ms timer keeps typing
  // from firing one request per keystroke.
  useEffect(() => {
    if (!canManage) return;
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      fetchData();
    }, 400);
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [canManage, fetchData]);

  // Nobody outside the content roles triggers the fetch, so the skeleton must
  // not wait on it — they get the access-denied view instead.
  const showSkeleton = (isLoading || loading) && (isLoading || canManage);

  const typedArticles = useMemo(
    () => articles.filter((article) => article.category === contentType),
    [articles, contentType]
  );

  const counts = useMemo(() => {
    const result = { all: typedArticles.length, published: 0, draft: 0, featured: 0, views: 0 };
    typedArticles.forEach((article) => {
      if (article.published) result.published += 1;
      else result.draft += 1;
      if (article.isFeatured) result.featured += 1;
      result.views += article.views || 0;
    });
    return result;
  }, [typedArticles]);

  const categoryCounts = useMemo(() => {
    const result = { News: 0, Article: 0 };
    articles.forEach((article) => {
      if (article.category === 'News') result.News += 1;
      else if (article.category === 'Article') result.Article += 1;
    });
    return result;
  }, [articles]);

  const filteredArticles = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return typedArticles
      .filter((article) => {
        if (statusTab === 'published' && !article.published) return false;
        if (statusTab === 'draft' && article.published) return false;
        if (statusTab === 'featured' && !article.isFeatured) return false;
        if (divisionFilter) {
          const divisionId = article.division?.id || '';
          if (divisionFilter === 'NONE' ? Boolean(divisionId) : divisionId !== divisionFilter) {
            return false;
          }
        }
        if (!query) return true;
        return (
          article.title.toLowerCase().includes(query) ||
          article.slug?.toLowerCase().includes(query) ||
          article.excerpt?.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [typedArticles, searchQuery, statusTab, divisionFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredArticles.length / itemsPerPage));
  // Clamped rather than corrected in an effect, so a filter that shrinks the
  // result set can never leave the table on an empty page.
  const page = Math.min(currentPage, totalPages);

  const paginatedArticles = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return filteredArticles.slice(start, start + itemsPerPage);
  }, [filteredArticles, page, itemsPerPage]);

  const hasFilters = Boolean(searchQuery || statusTab || divisionFilter);

  const resetFilters = () => {
    setSearchQuery('');
    setStatusTab('');
    setDivisionFilter('');
    setCurrentPage(1);
  };

  const openDetail = async (article: AdminArticle) => {
    try {
      const res = await api.getArticle(article.id);
      const payload = res as { article?: AdminArticle };
      setSelectedArticle(payload.article ?? (res as AdminArticle));
    } catch (error) {
      showError(errorMessage(error, 'Could not load article detail'));
    }
  };

  const handleDelete = async (article: AdminArticle) => {
    const ok = await confirmCtx.confirm({
      title: 'Delete post?',
      message: `${article.title} will be deleted permanently and cannot be restored.`,
      confirmLabel: 'Yes, delete',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await api.deleteArticle(article.id);
      showSuccess('Post deleted');
      if (selectedArticle?.id === article.id) setSelectedArticle(null);
      await fetchData();
    } catch (error) {
      showError(errorMessage(error, 'Could not delete post'));
    }
  };

  if (showSkeleton) {
    return <ListPageSkeleton tiles={4} rows={6} />;
  }

  if (!canManage) {
    return (
      <AccessDenied
        message="Managing content is only for Super Admin and Board."
        backHref="/dashboard"
      />
    );
  }

  const copy = TYPE_COPY[contentType];

  const tiles: { key: StatusTab; label: string; value: number; tone: 'slate' | 'emerald' | 'amber' | 'violet' }[] = [
    { key: '', label: `All ${copy.lower}s`, value: counts.all, tone: 'slate' },
    { key: 'published', label: 'Published', value: counts.published, tone: 'emerald' },
    { key: 'draft', label: 'Draft', value: counts.draft, tone: 'amber' },
    { key: 'featured', label: 'Featured', value: counts.featured, tone: 'violet' },
  ];

  const detailContent =
    typeof selectedArticle?.content === 'string' ? selectedArticle.content : '';

  return (
    <PageStack>
      <PageHeading
        title="Manage content"
        description={
          counts.all === 0
            ? `No ${copy.lower}s yet.`
            : `${counts.all} ${copy.lower}s recorded • ${counts.published} published • ${counts.views.toLocaleString('en-NZ')} views`
        }
        icon={FileText}
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
            <Link href="/dashboard/admin/articles/new">
              <Button variant="primary" size="sm" leftIcon={<Plus className="h-4 w-4" />}>
                New post
              </Button>
            </Link>
          </>
        }
      />

      <Tabs
        value={contentType}
        onValueChange={(value) => {
          setContentType(value as ContentType);
          setSearchQuery('');
          setCurrentPage(1);
        }}
      >
        <TabsList>
          {(['Article', 'News'] as ContentType[]).map((type) => (
            <TabsTrigger key={type} value={type}>
              {TYPE_COPY[type].label}
              <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                {categoryCounts[type]}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <StatTileRow columns={4}>
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
          placeholder="Search title, slug, or excerpt…"
          ariaLabel="Search posts"
        />
        <FilterSelect
          value={divisionFilter}
          onChange={(value) => {
            setDivisionFilter(value);
            setCurrentPage(1);
          }}
          placeholder="All divisions"
          ariaLabel="Filter by division"
          options={[
            { value: 'NONE', label: 'No division' },
            ...divisions.map((division) => ({ value: division.id, label: division.name })),
          ]}
        />
        {hasFilters && <ResetFiltersButton onClick={resetFilters} />}
      </Toolbar>

      {filteredArticles.length === 0 ? (
        <SectionCard flush>
          {hasFilters ? (
            <EmptyBlock
              icon={FileText}
              title="No matching posts"
              description={
                statusTab
                  ? `No ${copy.lower}s with ${TAB_LABEL[statusTab]} status match this filter.`
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
              icon={FileText}
              title={`No ${copy.lower}s yet`}
              description={`Create the first ${copy.lower} so it shows on the site.`}
              action={
                <Link href="/dashboard/admin/articles/new">
                  <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />}>
                    New post
                  </Button>
                </Link>
              }
            />
          )}
        </SectionCard>
      ) : (
        <ArticleTable
          items={paginatedArticles}
          icon={contentType === 'News' ? Newspaper : FileText}
          showDivision
          editHref={(item) => `/dashboard/admin/articles/${item.id}/edit`}
          publicHref={(item) => `/activities/news-articles/${item.slug}`}
          onView={openDetail}
          onDelete={handleDelete}
          footer={
            <>
              <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                Showing {paginatedArticles.length} of {filteredArticles.length} {copy.lower}s
              </div>
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={filteredArticles.length}
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

      <Modal
        isOpen={Boolean(selectedArticle)}
        onClose={() => setSelectedArticle(null)}
        title={selectedArticle?.title || 'Post detail'}
        description={selectedArticle ? `/${selectedArticle.slug}` : undefined}
        // A post body needs a readable measure; `xl` (576px) squeezed it into a
        // narrow justified column.
        size="full"
      >
        {selectedArticle && (
          <div className="space-y-5">
            <StatTileRow columns={4}>
              <StatTile
                label="Views"
                value={selectedArticle.views || 0}
                tone="sky"
                icon={Eye}
              />
              <StatTile
                label="Likes"
                value={selectedArticle.likes || 0}
                tone="red"
                icon={Heart}
              />
              <StatTile
                label="Status"
                value={selectedArticle.published ? 'Published' : 'Draft'}
                tone={selectedArticle.published ? 'emerald' : 'amber'}
              />
              <StatTile
                label="Category"
                value={TYPE_COPY[(selectedArticle.category as ContentType) || 'Article'].label}
                tone="violet"
                icon={TagIcon}
              />
            </StatTileRow>

            <SectionCard title="Summary" icon={FileText}>
              <div className="grid gap-4 sm:grid-cols-2">
                <DetailItem
                  label="Author"
                  value={selectedArticle.author?.name || 'Admin'}
                />
                <DetailItem label="Created" value={formatDate(selectedArticle.createdAt)} />
                <DetailItem
                  label="Division"
                  value={selectedArticle.division?.name || '—'}
                />
                <DetailItem
                  label="Featured"
                  value={
                    selectedArticle.isFeatured ? (
                      <Badge variant="primary" className="gap-1">
                        <Star className="h-3 w-3" />
                        Yes
                      </Badge>
                    ) : (
                      'No'
                    )
                  }
                />
              </div>
            </SectionCard>

            <SectionCard title="Post content" icon={FileText}>
              {detailContent ? (
                <div
                  className="prose prose-sm max-w-none text-slate-600 dark:prose-invert dark:text-slate-300"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(detailContent) }}
                />
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No content to show yet.
                </p>
              )}
            </SectionCard>

            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="secondary" onClick={() => setSelectedArticle(null)}>
                Close
              </Button>
              <Link href={`/dashboard/admin/articles/${selectedArticle.id}/edit`}>
                <Button variant="primary">Edit post</Button>
              </Link>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmHost ctx={confirmCtx} />
    </PageStack>
  );
}
