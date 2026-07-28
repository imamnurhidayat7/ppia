'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import { useToast } from '@/components/Toast';
import { useConfirm, ConfirmHost } from '@/hooks/useConfirm';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { Badge, Button, Modal, ModalFooter, Pagination, Toggle } from '@/components/ui';
import {
  AccessDenied,
  EmptyBlock,
  Field,
  FilterSelect,
  FormGrid,
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
import { getPageEditorHref } from '@/lib/page-editor';
import {
  Eye,
  EyeOff,
  FileText,
  LayoutTemplate,
  Pencil,
  Plus,
  RefreshCw,
  Settings,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageAuthor {
  id: string;
  name: string;
  avatar?: string;
}

interface CmsPage {
  id: string;
  title: string;
  slug: string;
  content?: Record<string, unknown> | string | null;
  pageType: string;
  template: string;
  published: boolean;
  authorId?: string;
  User?: PageAuthor;
  author?: PageAuthor;
  createdAt: string;
  updatedAt: string;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const EMPTY_FORM = {
  title: '',
  slug: '',
  content: '',
  published: false,
  headerLabel: '',
  headerTitle: '',
  headerTitleAccent: '',
  headerDescription: '',
};

const PAGE_TYPE_LABEL: Record<string, string> = {
  custom: 'Custom',
  standard: 'Standard',
};

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-NZ', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function AdminPagesView() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showSuccess, showError } = useToast();
  const confirmCtx = useConfirm();

  const [pages, setPages] = useState<CmsPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | 'published' | 'draft'>('');
  const [typeFilter, setTypeFilter] = useState('');

  /**
   * The old "new page builder" route points here with ?create=1. The value is
   * read during state initialisation so there is no need to setState inside an effect.
   */
  const [formOpen, setFormOpen] = useState(searchParams.get('create') === '1');
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [slugTouched, setSlugTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // CMS pages are site content, so both Super Admin and Board can manage them.
  const canManage = user?.role === 'SUPER_ADMIN' || user?.role === 'BOARD';
  // Site configuration (menus, footer, colours) stays Super Admin only.
  const canManageSiteSettings = user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // Clear ?create=1 from the URL after the modal opens on the first render.
  useEffect(() => {
    if (searchParams.get('create') === '1') {
      router.replace('/dashboard/admin/pages');
    }
  }, [searchParams, router]);

  const fetchPages = useCallback(async () => {
    try {
      const res = (await api.getPagesAdmin({
        page: pagination.page,
        limit: pagination.limit,
      })) as {
        pages?: CmsPage[];
        pagination?: { page?: number; limit?: number; total?: number; totalPages?: number };
      };
      const list = res.pages ?? [];
      setPages(list);
      setPagination((prev) => ({
        page: res.pagination?.page ?? prev.page,
        limit: res.pagination?.limit ?? prev.limit,
        total: res.pagination?.total ?? list.length,
        totalPages:
          res.pagination?.totalPages ??
          Math.max(1, Math.ceil(list.length / (res.pagination?.limit ?? prev.limit))),
      }));
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      showError(err.response?.data?.error || err.message || 'Could not load the page list');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [pagination.page, pagination.limit, showError]);

  /* eslint-disable react-hooks/set-state-in-effect --
     fetchPages() only writes state after a network await (fetch-on-mount and
     when page/limit change); the linter cannot see past that call. */
  useEffect(() => {
    if (user && canManage) {
      fetchPages();
    }
  }, [user, canManage, fetchPages]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Non Super Admins and Board never trigger the fetch, so the skeleton does not wait for it.
  const showSkeleton = (isLoading || loading) && (isLoading || canManage);

  const counts = useMemo(() => {
    const published = pages.filter((page) => page.published).length;
    return { published, draft: pages.length - published };
  }, [pages]);

  const typeOptions = useMemo(() => {
    const types = new Set<string>();
    pages.forEach((page) => {
      if (page.pageType) types.add(page.pageType);
    });
    return Array.from(types).map((type) => ({
      value: type,
      label: PAGE_TYPE_LABEL[type] ?? type,
    }));
  }, [pages]);

  const filteredPages = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return pages.filter((page) => {
      if (statusFilter === 'published' && !page.published) return false;
      if (statusFilter === 'draft' && page.published) return false;
      if (typeFilter && page.pageType !== typeFilter) return false;
      if (!query) return true;
      return (
        page.title?.toLowerCase().includes(query) || page.slug?.toLowerCase().includes(query)
      );
    });
  }, [pages, searchQuery, statusFilter, typeFilter]);

  const hasFilters = Boolean(searchQuery || statusFilter || typeFilter);

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setTypeFilter('');
  };

  const openCreate = () => {
    setFormData(EMPTY_FORM);
    setSlugTouched(false);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setFormData(EMPTY_FORM);
    setSlugTouched(false);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    if (!formData.title.trim() || !formData.slug.trim()) {
      showError('Title and slug are required');
      return;
    }
    setSubmitting(true);
    try {
      /**
       * Content is stored as { raw, header } — `raw` holds the rich text body,
       * `header` holds the optional PageHeader metadata used by submenu pages
       * (for example /activities/events).
       */
      const hasHeader =
        formData.headerLabel.trim() ||
        formData.headerTitle.trim() ||
        formData.headerTitleAccent.trim() ||
        formData.headerDescription.trim();

      const content: Record<string, unknown> = { raw: formData.content };
      if (hasHeader) {
        content.header = {
          label: formData.headerLabel.trim() || undefined,
          title: formData.headerTitle.trim() || undefined,
          titleAccent: formData.headerTitleAccent.trim() || undefined,
          description: formData.headerDescription.trim() || undefined,
        };
      }

      const payload = {
        title: formData.title.trim(),
        slug: formData.slug.trim(),
        content,
        published: formData.published,
      };

      await api.createPage(payload);
      showSuccess('Page created — opening the editor');
      const newSlug = payload.slug;
      closeForm();
      // Hand off to the single editor so the new page content is completed there.
      router.push(`/dashboard/admin/canvas/${newSlug}`);
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      showError(err.response?.data?.error || err.message || 'Could not save the page');
      setSubmitting(false);
    }
  };

  const handleDelete = async (page: CmsPage) => {
    const ok = await confirmCtx.confirm({
      title: 'Delete page?',
      message: `${page.title} will be permanently deleted. This action cannot be undone.`,
      confirmLabel: 'Yes, delete',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await api.deletePage(page.id);
      showSuccess('Page deleted');
      await fetchPages();
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      showError(err.response?.data?.error || err.message || 'Could not delete the page');
    }
  };

  const handleTogglePublished = async (page: CmsPage) => {
    try {
      await api.updatePage(page.id, { published: !page.published });
      showSuccess(page.published ? 'Page moved to draft' : 'Page published');
      await fetchPages();
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      showError(err.response?.data?.error || err.message || 'Could not update the page');
    }
  };

  const handleTitleChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      title: value,
      slug: slugTouched ? prev.slug : slugify(value),
    }));
  };

  const handleSlugChange = (value: string) => {
    setSlugTouched(true);
    setFormData((prev) => ({ ...prev, slug: slugify(value) }));
  };

  if (showSkeleton) {
    return <ListPageSkeleton tiles={3} rows={6} />;
  }

  if (!canManage) {
    return (
      <AccessDenied
        message="Managing pages is limited to Super Admins and Board members."
        backHref="/dashboard"
      />
    );
  }

  // Clamped on render instead of corrected through a useEffect.
  const currentPage = Math.min(pagination.page, Math.max(1, pagination.totalPages));

  const tiles: { key: '' | 'published' | 'draft'; label: string; value: number; tone: 'slate' | 'emerald' | 'amber'; hint?: string }[] = [
    { key: '', label: 'Total pages', value: pagination.total, tone: 'slate' },
    { key: 'published', label: 'Published', value: counts.published, tone: 'emerald', hint: 'On this page' },
    { key: 'draft', label: 'Draft', value: counts.draft, tone: 'amber', hint: 'On this page' },
  ];

  return (
    <PageStack>
      <PageHeading
        eyebrow="Site content"
        title="Manage pages"
        description="Create and maintain static pages such as about us or contact."
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
                fetchPages();
              }}
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={openCreate}
            >
              New page
            </Button>
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
            hint={tile.hint}
            active={statusFilter === tile.key}
            onClick={() => setStatusFilter(tile.key)}
          />
        ))}
      </StatTileRow>

      <Toolbar>
        <SearchField
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search page title or slug…"
          ariaLabel="Search pages"
        />
        <FilterSelect
          value={typeFilter}
          onChange={setTypeFilter}
          placeholder="All types"
          ariaLabel="Filter page type"
          options={typeOptions}
        />
        {hasFilters && <ResetFiltersButton onClick={resetFilters} />}
      </Toolbar>

      {filteredPages.length === 0 ? (
        <SectionCard flush>
          {hasFilters ? (
            <EmptyBlock
              icon={FileText}
              title="No matching pages"
              description="Try changing the keywords or filters you are using."
              action={
                <Button variant="secondary" onClick={resetFilters}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyBlock
              icon={FileText}
              title="No pages yet"
              description="Create the first page, then complete its content in the editor."
              action={
                <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
                  New page
                </Button>
              }
            />
          )}
        </SectionCard>
      ) : (
        <TableShell
          head={
            <>
              <Th>Page</Th>
              <Th>Type</Th>
              <Th>Author</Th>
              <Th>Updated</Th>
              <Th>Status</Th>
              <Th align="right">Actions</Th>
            </>
          }
          footer={
            <div className="border-t border-slate-100 px-5 py-3 dark:border-slate-800">
              <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
                Showing {filteredPages.length} of {pagination.total} pages
              </p>
              <Pagination
                currentPage={currentPage}
                totalPages={pagination.totalPages}
                totalItems={pagination.total}
                itemsPerPage={pagination.limit}
                onPageChange={(nextPage) =>
                  setPagination((prev) => ({ ...prev, page: nextPage }))
                }
                showItemsPerPage
                onItemsPerPageChange={(limit) =>
                  setPagination((prev) => ({ ...prev, limit, page: 1 }))
                }
              />
            </div>
          }
        >
          {filteredPages.map((page) => {
            const author = page.author || page.User;
            return (
              <Tr key={page.id}>
                <Td>
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                        page.published
                          ? 'bg-[#0D1B33] text-white'
                          : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                      )}
                    >
                      <FileText className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <Link
                        href={getPageEditorHref(page)}
                        className="block truncate text-sm font-semibold text-slate-900 hover:underline dark:text-slate-100"
                      >
                        {page.title}
                      </Link>
                      <p className="truncate font-mono text-xs text-slate-400">/{page.slug}</p>
                    </div>
                  </div>
                </Td>
                <Td>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {PAGE_TYPE_LABEL[page.pageType] ?? page.pageType ?? '—'}
                  </span>
                </Td>
                <Td>
                  {author ? (
                    <span className="truncate">{author.name}</span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </Td>
                <Td>
                  <span className="whitespace-nowrap text-xs">{formatDate(page.updatedAt)}</span>
                </Td>
                <Td>
                  {page.published ? (
                    <Badge variant="success">Published</Badge>
                  ) : (
                    <Badge variant="warning">Draft</Badge>
                  )}
                </Td>
                <Td align="right">
                  <RowActions>
                    <IconAction
                      icon={Pencil}
                      label={`Edit ${page.title}`}
                      href={getPageEditorHref(page)}
                    />
                    <IconAction
                      icon={page.published ? Eye : EyeOff}
                      label={page.published ? `Unpublish ${page.title}` : `Publish ${page.title}`}
                      onClick={() => handleTogglePublished(page)}
                    />
                    <IconAction
                      icon={Trash2}
                      label={`Delete ${page.title}`}
                      tone="danger"
                      onClick={() => handleDelete(page)}
                    />
                  </RowActions>
                </Td>
              </Tr>
            );
          })}
        </TableShell>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard
          title="Homepage editor"
          description="Edit text, images, and section order directly on the real layout."
          icon={LayoutTemplate}
        >
          <Link href="/dashboard/admin/canvas">
            <Button variant="primary" size="sm" leftIcon={<Pencil className="h-4 w-4" />}>
              Open homepage editor
            </Button>
          </Link>
        </SectionCard>

        {canManageSiteSettings && (
          <SectionCard
            title="Menus and site settings"
            description="Navigation, header, footer, social links, and brand colours."
            icon={Settings}
          >
            <Link href="/dashboard/admin/landing-page">
              <Button variant="secondary" size="sm" leftIcon={<SlidersHorizontal className="h-4 w-4" />}>
                Open site settings
              </Button>
            </Link>
          </SectionCard>
        )}
      </div>

      <Modal
        isOpen={formOpen}
        onClose={closeForm}
        title="New page"
        description="Fill in the page identity, then continue completing its content in the editor."
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <FormGrid columns={2}>
            <Field label="Page title" htmlFor="page-title" required>
              <input
                id="page-title"
                type="text"
                required
                value={formData.title}
                onChange={(changeEvent) => handleTitleChange(changeEvent.target.value)}
                className="input-base"
                placeholder="About PPIA"
              />
            </Field>
            <Field
              label="Slug"
              htmlFor="page-slug"
              required
              hint="Filled automatically from the title and used as the page address."
            >
              <input
                id="page-slug"
                type="text"
                required
                value={formData.slug}
                onChange={(changeEvent) => handleSlugChange(changeEvent.target.value)}
                className="input-base font-mono"
                placeholder="about-ppia"
              />
            </Field>
          </FormGrid>

          <div className="space-y-4 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <div>
              <p className="font-display text-sm font-bold text-slate-900 dark:text-slate-50">
                Page header
              </p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Optional. Used by pages that show a header banner, for example activity submenus.
              </p>
            </div>
            <FormGrid columns={2}>
              <Field label="Label" htmlFor="page-header-label">
                <input
                  id="page-header-label"
                  type="text"
                  value={formData.headerLabel}
                  onChange={(changeEvent) =>
                    setFormData((prev) => ({ ...prev, headerLabel: changeEvent.target.value }))
                  }
                  className="input-base"
                  placeholder="Activities"
                />
              </Field>
              <Field label="Title" htmlFor="page-header-title">
                <input
                  id="page-header-title"
                  type="text"
                  value={formData.headerTitle}
                  onChange={(changeEvent) =>
                    setFormData((prev) => ({ ...prev, headerTitle: changeEvent.target.value }))
                  }
                  className="input-base"
                  placeholder="PPIA"
                />
              </Field>
              <Field label="Title accent" htmlFor="page-header-accent">
                <input
                  id="page-header-accent"
                  type="text"
                  value={formData.headerTitleAccent}
                  onChange={(changeEvent) =>
                    setFormData((prev) => ({ ...prev, headerTitleAccent: changeEvent.target.value }))
                  }
                  className="input-base"
                  placeholder="Events"
                />
              </Field>
              <Field label="Description" htmlFor="page-header-description">
                <input
                  id="page-header-description"
                  type="text"
                  value={formData.headerDescription}
                  onChange={(changeEvent) =>
                    setFormData((prev) => ({
                      ...prev,
                      headerDescription: changeEvent.target.value,
                    }))
                  }
                  className="input-base"
                  placeholder="Short description on the header banner"
                />
              </Field>
            </FormGrid>
          </div>

          <RichTextEditor
            label="Page content"
            value={formData.content}
            onChange={(value) => setFormData((prev) => ({ ...prev, content: value }))}
            placeholder="Write the page content here…"
          />

          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <Toggle
              id="page-published"
              label="Publish page"
              description="When enabled, the page appears on the public site right away."
              checked={formData.published}
              onChange={(changeEvent) =>
                setFormData((prev) => ({ ...prev, published: changeEvent.target.checked }))
              }
            />
          </div>

          <ModalFooter>
            <Button type="button" variant="secondary" onClick={closeForm}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={submitting}>
              Create page
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      <ConfirmHost ctx={confirmCtx} />
    </PageStack>
  );
}

export default function AdminPagesPage() {
  // useSearchParams needs a Suspense boundary on server-rendered routes.
  return (
    <Suspense fallback={<ListPageSkeleton tiles={3} rows={6} />}>
      <AdminPagesView />
    </Suspense>
  );
}
