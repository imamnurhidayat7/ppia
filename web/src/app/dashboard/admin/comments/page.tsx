'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import type { Comment } from '@/lib/api-types';
import { useToast } from '@/components/Toast';
import { useConfirm, ConfirmHost } from '@/hooks/useConfirm';
import { Badge, Button, Pagination } from '@/components/ui';
import {
  AccessDenied,
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
import { cn, formatDate } from '@/lib/utils';
import {
  BookOpen,
  CalendarDays,
  Eye,
  EyeOff,
  FileText,
  Mail,
  MessageSquare,
  RefreshCw,
  SlidersHorizontal,
  Trash2,
  User as UserIcon,
} from 'lucide-react';

/** Metadata dates read as log entries: 05 Mar 2025. */
const DATE_OPTS = {
  dateStyle: undefined,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
} as const;


/**
 * Prisma returns the relations with capitalised keys (`User`, `Article`,
 * `Research`) while the shared `Comment` type uses the lowercase spelling, so
 * both shapes are accepted here.
 */
interface AdminComment extends Comment {
  User?: { id: string; name: string; avatar?: string; email?: string };
  Article?: { id: string; title: string; slug: string };
  Research?: { id: string; title: string; slug: string };
}

interface CommentStatsState {
  total: number;
  hidden: number;
  articleComments: number;
  last7Days: number;
}

type VisibilityFilter = '' | 'visible' | 'hidden';

const EMPTY_STATS: CommentStatsState = {
  total: 0,
  hidden: 0,
  articleComments: 0,
  last7Days: 0,
};

function authorOf(comment: AdminComment): { name: string; email: string } {
  return {
    name: comment.user?.name || comment.User?.name || comment.userName || 'Anonymous',
    email: comment.userEmail || comment.User?.email || '',
  };
}

function targetOf(comment: AdminComment) {
  const article = comment.article || comment.Article;
  if (article) return { kind: 'article' as const, title: article.title };
  const research = comment.research || comment.Research;
  if (research) return { kind: 'research' as const, title: research.title };
  return null;
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

export default function AdminCommentsPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const confirmCtx = useConfirm();

  const [comments, setComments] = useState<AdminComment[]>([]);
  const [stats, setStats] = useState<CommentStatsState>(EMPTY_STATS);
  const [totalItems, setTotalItems] = useState(0);
  const [serverPages, setServerPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>('');
  const [articleId, setArticleId] = useState('');
  const [researchId, setResearchId] = useState('');
  const [showIdFilters, setShowIdFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Comment moderation is site content, so Board can manage it too.
  const canManage = user?.role === 'SUPER_ADMIN' || user?.role === 'BOARD';

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // Debounced search: state is only written after the timer fires, not during render.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchData = useCallback(async () => {
    const params: {
      page: number;
      limit: number;
      articleId?: string;
      researchId?: string;
      hidden?: boolean;
    } = { page: currentPage, limit: itemsPerPage };

    if (articleId.trim()) params.articleId = articleId.trim();
    if (researchId.trim()) params.researchId = researchId.trim();
    if (visibilityFilter === 'visible') params.hidden = false;
    else if (visibilityFilter === 'hidden') params.hidden = true;

    const [commentsRes, statsRes] = await Promise.allSettled([
      api.getAllComments(params),
      api.getCommentStats(),
    ]);

    if (commentsRes.status === 'fulfilled') {
      const payload = commentsRes.value as {
        comments?: AdminComment[];
        pagination?: { total?: number; totalPages?: number };
      };
      const list = payload.comments ?? [];
      setComments(Array.isArray(list) ? list : []);
      setTotalItems(payload.pagination?.total ?? list.length);
      setServerPages(payload.pagination?.totalPages ?? 0);
    } else {
      const err = commentsRes.reason as {
        response?: { data?: { error?: string } };
        message?: string;
      };
      showError(err?.response?.data?.error || err?.message || 'Could not load comments');
    }

    if (statsRes.status === 'fulfilled') {
      // The endpoint wraps the numbers inside `stats`; the old version read them
      // from the root, so every card always showed 0.
      const payload = statsRes.value as { stats?: Partial<CommentStatsState> };
      setStats({ ...EMPTY_STATS, ...payload.stats });
    }

    setLoading(false);
    setRefreshing(false);
  }, [currentPage, itemsPerPage, articleId, researchId, visibilityFilter, showError]);

  /* eslint-disable react-hooks/set-state-in-effect --
     fetchData() only writes state after awaiting the network; the linter cannot
     see past the call. */
  useEffect(() => {
    if (user && canManage) {
      fetchData();
    }
  }, [user, canManage, fetchData]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Non-admins never trigger the fetch, so the skeleton must not wait on it.
  const showSkeleton = (isLoading || loading) && (isLoading || canManage);

  /**
   * Search still runs on the client because the comments endpoint does not yet
   * accept a search parameter, while admins need to search by name and email.
   */
  const visibleComments = useMemo(() => {
    if (!debouncedSearch) return comments;
    const query = debouncedSearch.toLowerCase();
    return comments.filter((comment) => {
      const author = authorOf(comment);
      return (
        author.name.toLowerCase().includes(query) ||
        author.email.toLowerCase().includes(query) ||
        comment.content?.toLowerCase().includes(query)
      );
    });
  }, [comments, debouncedSearch]);

  const totalPages = Math.max(
    1,
    serverPages > 0 ? serverPages : Math.ceil(visibleComments.length / itemsPerPage)
  );
  // Clamped at render time, not corrected via an effect.
  const page = Math.min(currentPage, totalPages);

  const hasFilters = Boolean(debouncedSearch || articleId || researchId || visibilityFilter);

  const resetFilters = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setArticleId('');
    setResearchId('');
    setVisibilityFilter('');
    setCurrentPage(1);
  };

  const handleToggleVisibility = async (comment: AdminComment) => {
    const nextHidden = !comment.isHidden;
    setTogglingIds((current) => new Set(current).add(comment.id));
    setComments((current) =>
      current.map((item) => (item.id === comment.id ? { ...item, isHidden: nextHidden } : item))
    );
    try {
      await api.toggleCommentVisibility(comment.id, nextHidden);
      showSuccess(nextHidden ? 'Comment hidden' : 'Comment shown');
      setStats((current) => ({
        ...current,
        hidden: Math.max(0, current.hidden + (nextHidden ? 1 : -1)),
      }));
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      setComments((current) =>
        current.map((item) =>
          item.id === comment.id ? { ...item, isHidden: comment.isHidden } : item
        )
      );
      showError(err.response?.data?.error || err.message || 'Could not change visibility');
    } finally {
      setTogglingIds((current) => {
        const next = new Set(current);
        next.delete(comment.id);
        return next;
      });
    }
  };

  const handleDelete = async (comment: AdminComment) => {
    const ok = await confirmCtx.confirm({
      title: 'Delete comment?',
      message: 'The comment and all its replies will be permanently deleted.',
      confirmLabel: 'Yes, delete',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await api.deleteComment(comment.id);
      showSuccess('Comment deleted');
      await fetchData();
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      showError(err.response?.data?.error || err.message || 'Could not delete comment');
    }
  };

  if (showSkeleton) {
    return <ListPageSkeleton tiles={4} rows={8} />;
  }

  if (!canManage) {
    return (
      <AccessDenied
        message="Only Super Admin and Board can moderate comments."
        backHref="/dashboard"
      />
    );
  }

  const tiles: { key: VisibilityFilter; label: string; value: number; tone: 'slate' | 'emerald' | 'amber' }[] = [
    { key: '', label: 'All comments', value: stats.total, tone: 'slate' },
    { key: 'visible', label: 'Visible', value: Math.max(0, stats.total - stats.hidden), tone: 'emerald' },
    { key: 'hidden', label: 'Hidden', value: stats.hidden, tone: 'amber' },
  ];

  return (
    <PageStack>
      <PageHeading
        title="Moderate comments"
        description={
          stats.total === 0
            ? 'No comments have come in yet.'
            : `${stats.total} comments • ${stats.last7Days} in the last 7 days`
        }
        icon={MessageSquare}
        backHref="/dashboard/admin"
        backLabel="Back to admin panel"
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<SlidersHorizontal className="h-4 w-4" />}
              onClick={() => setShowIdFilters((value) => !value)}
            >
              {showIdFilters ? 'Hide ID filters' : 'Filter by content'}
            </Button>
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
          </>
        }
      />

      <StatTileRow columns={4}>
        {tiles.map((tile) => (
          <StatTile
            key={tile.key || 'all'}
            label={tile.label}
            value={tile.value}
            tone={tile.tone}
            active={visibilityFilter === tile.key}
            onClick={() => {
              setVisibilityFilter(tile.key);
              setCurrentPage(1);
            }}
          />
        ))}
        <StatTile
          label="Last 7 days"
          value={stats.last7Days}
          tone="sky"
          icon={CalendarDays}
          hint={`${stats.articleComments} on articles`}
        />
      </StatTileRow>

      <Toolbar>
        <SearchField
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by name, email, or comment…"
          ariaLabel="Search comments"
        />
        {hasFilters && <ResetFiltersButton onClick={resetFilters} />}
      </Toolbar>

      {showIdFilters && (
        <SectionCard
          title="Filter by content"
          description="Paste an article or research ID to view only its comments."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Article ID" htmlFor="filter-article-id">
              <input
                id="filter-article-id"
                type="text"
                value={articleId}
                onChange={(event) => {
                  setArticleId(event.target.value);
                  setCurrentPage(1);
                }}
                placeholder="For example: clx1a2b3c…"
                className="input-base rounded-[4px] border-[#C3D2E0] dark:border-slate-700"
              />
            </Field>
            <Field label="Research ID" htmlFor="filter-research-id">
              <input
                id="filter-research-id"
                type="text"
                value={researchId}
                onChange={(event) => {
                  setResearchId(event.target.value);
                  setCurrentPage(1);
                }}
                placeholder="For example: clx4d5e6f…"
                className="input-base rounded-[4px] border-[#C3D2E0] dark:border-slate-700"
              />
            </Field>
          </div>
        </SectionCard>
      )}

      {visibleComments.length === 0 ? (
        <SectionCard flush>
          {hasFilters ? (
            <EmptyBlock
              icon={MessageSquare}
              title="No matching comments"
              description="Try a different keyword or filter."
              action={
                <Button variant="secondary" onClick={resetFilters}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyBlock
              icon={MessageSquare}
              title="No comments yet"
              description="Comments from article and research readers will appear here."
            />
          )}
        </SectionCard>
      ) : (
        <TableShell
          head={
            <>
              <Th>Author</Th>
              <Th>Comment</Th>
              <Th>Content</Th>
              <Th>Date</Th>
              <Th>Status</Th>
              <Th align="right">Actions</Th>
            </>
          }
          footer={
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={totalItems || visibleComments.length}
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
          {visibleComments.map((comment) => {
            const author = authorOf(comment);
            const target = targetOf(comment);
            const isToggling = togglingIds.has(comment.id);
            return (
              <Tr key={comment.id}>
                <Td>
                  <div className="flex items-center gap-3">
                    {/* Porthole frame instead of a tinted disc. */}
                    <span
                      aria-hidden="true"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#E8231A]"
                      style={{ boxShadow: 'inset 0 0 0 1px rgba(11,28,46,0.14), 0 0 0 4px rgba(11,28,46,0.05)' }}
                    >
                      <UserIcon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="max-w-[11rem] truncate font-semibold ink-strong">
                        {author.name}
                      </p>
                      {author.email && (
                        <p className="data-type flex max-w-[11rem] items-center gap-1 truncate text-[12px] ink-muted">
                          <Mail aria-hidden="true" className="h-3 w-3 shrink-0" />
                          {author.email}
                        </p>
                      )}
                    </div>
                  </div>
                </Td>
                <Td>
                  <p className="max-w-md ink-body" title={comment.content}>
                    {truncate(comment.content, 90)}
                  </p>
                </Td>
                <Td>
                  {target ? (
                    <Link
                      href={
                        target.kind === 'article'
                          ? '/dashboard/admin/articles'
                          : '/dashboard/admin/research'
                      }
                      className="inline-flex max-w-[12rem] items-center gap-1.5 hover:underline"
                      title={target.title}
                    >
                      {target.kind === 'article' ? (
                        <FileText className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                      ) : (
                        <BookOpen className="h-3.5 w-3.5 shrink-0 text-violet-500" />
                      )}
                      <span className="truncate">{target.title}</span>
                    </Link>
                  ) : (
                    <span className="ink-muted">—</span>
                  )}
                </Td>
                <Td>
                  <span className="data-type whitespace-nowrap text-[12px]">
                    {formatDate(comment.createdAt, DATE_OPTS)}
                  </span>
                </Td>
                <Td>
                  {comment.isHidden ? (
                    <Badge variant="warning" className="data-type uppercase">Hidden</Badge>
                  ) : (
                    <Badge variant="success" className="data-type uppercase">Visible</Badge>
                  )}
                </Td>
                <Td align="right">
                  <RowActions>
                    <IconAction
                      icon={comment.isHidden ? Eye : EyeOff}
                      label={
                        comment.isHidden
                          ? `Show ${author.name}'s comment`
                          : `Hide ${author.name}'s comment`
                      }
                      disabled={isToggling}
                      onClick={() => handleToggleVisibility(comment)}
                    />
                    <IconAction
                      icon={Trash2}
                      label={`Delete ${author.name}'s comment`}
                      tone="danger"
                      onClick={() => handleDelete(comment)}
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
