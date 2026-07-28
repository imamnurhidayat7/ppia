'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import { useToast } from '@/components/Toast';
import { useConfirm, ConfirmHost } from '@/hooks/useConfirm';
import { Button, Modal, ModalFooter } from '@/components/ui';
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
import { cn } from '@/lib/utils';
import { BookOpen, FileText, Pencil, Plus, RefreshCw, Tag as TagIcon, Trash2 } from 'lucide-react';

interface Tag {
  id: string;
  name: string;
  slug: string;
  color?: string;
  description?: string;
  _count?: {
    articles: number;
    researches: number;
  };
  createdAt: string;
  updatedAt: string;
}

const PRESET_COLORS = [
  '#E8231A',
  '#E87C1A',
  '#E8D31A',
  '#7CE81A',
  '#1AE85C',
  '#1AE8A5',
  '#1AC8E8',
  '#1A7CE8',
  '#5C1AE8',
  '#A51AE8',
  '#E81AC8',
  '#E81A5C',
  '#6B7280',
  '#1A2B4A',
];

const EMPTY_FORM = { name: '', description: '', color: PRESET_COLORS[0] };

export default function AdminTagsPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const confirmCtx = useConfirm();

  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Tags are part of site content, so Board can manage them too.
  const canManage = user?.role === 'SUPER_ADMIN' || user?.role === 'BOARD';

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  const fetchTags = useCallback(async () => {
    try {
      const response = await api.getTags();
      const payload = response as { tags?: Tag[] } | Tag[];
      setTags(Array.isArray(payload) ? payload : payload?.tags ?? []);
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      showError(err.response?.data?.error || err.message || 'Could not load tag data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showError]);

  /* eslint-disable react-hooks/set-state-in-effect --
     fetchTags() only writes state after awaiting the network; the linter cannot
     see past the call. */
  useEffect(() => {
    if (user && canManage) {
      fetchTags();
    }
  }, [user, canManage, fetchTags]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Non-admins never trigger the fetch, so the skeleton must not wait on it.
  const showSkeleton = (isLoading || loading) && (isLoading || canManage);

  const stats = useMemo(() => {
    return {
      total: tags.length,
      articles: tags.reduce((sum, tag) => sum + (tag._count?.articles || 0), 0),
      researches: tags.reduce((sum, tag) => sum + (tag._count?.researches || 0), 0),
      unused: tags.filter(
        (tag) => (tag._count?.articles || 0) + (tag._count?.researches || 0) === 0
      ).length,
    };
  }, [tags]);

  const filteredTags = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return tags;
    return tags.filter(
      (tag) =>
        tag.name.toLowerCase().includes(query) ||
        tag.slug.toLowerCase().includes(query) ||
        tag.description?.toLowerCase().includes(query)
    );
  }, [tags, searchQuery]);

  const openCreate = () => {
    setEditingTag(null);
    setFormData(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (tag: Tag) => {
    setEditingTag(tag);
    setFormData({
      name: tag.name,
      description: tag.description || '',
      color: tag.color || PRESET_COLORS[0],
    });
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingTag(null);
    setFormData(EMPTY_FORM);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        description: formData.description || undefined,
        color: formData.color,
      };
      if (editingTag) {
        await api.updateTag(editingTag.id, payload);
        showSuccess('Tag updated');
      } else {
        await api.createTag(payload);
        showSuccess('Tag created');
      }
      closeForm();
      await fetchTags();
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      showError(err.response?.data?.error || err.message || 'Could not save tag');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (tag: Tag) => {
    const ok = await confirmCtx.confirm({
      title: 'Delete tag?',
      message: `${tag.name} will be deleted and removed from all content that uses it.`,
      confirmLabel: 'Yes, delete',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await api.deleteTag(tag.id);
      showSuccess('Tag deleted');
      await fetchTags();
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      showError(err.response?.data?.error || err.message || 'Could not delete tag');
    }
  };

  if (showSkeleton) {
    return <ListPageSkeleton tiles={4} rows={6} />;
  }

  if (!canManage) {
    return (
      <AccessDenied
        message="Only Super Admin and Board can manage tags."
        backHref="/dashboard"
      />
    );
  }

  return (
    <PageStack>
      <PageHeading
        title="Manage tags"
        description={
          stats.total === 0
            ? 'No tags have been created yet.'
            : `${stats.total} tags used across ${stats.articles} articles and ${stats.researches} research items.`
        }
        icon={TagIcon}
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
                fetchTags();
              }}
            >
              Refresh
            </Button>
            <Button variant="primary" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
              New tag
            </Button>
          </>
        }
      />

      <StatTileRow columns={4}>
        <StatTile label="Total tags" value={stats.total} tone="slate" icon={TagIcon} />
        <StatTile label="Used in articles" value={stats.articles} tone="sky" icon={FileText} />
        <StatTile label="Used in research" value={stats.researches} tone="violet" icon={BookOpen} />
        <StatTile
          label="Unused"
          value={stats.unused}
          tone="amber"
          hint="Candidates for cleanup"
        />
      </StatTileRow>

      <Toolbar>
        <SearchField
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by tag name, slug, or description…"
          ariaLabel="Search tags"
        />
        {searchQuery && <ResetFiltersButton onClick={() => setSearchQuery('')} />}
      </Toolbar>

      {filteredTags.length === 0 ? (
        <SectionCard flush>
          {searchQuery ? (
            <EmptyBlock
              icon={TagIcon}
              title="No matching tags"
              description="Try a different search keyword."
              action={
                <Button variant="secondary" onClick={() => setSearchQuery('')}>
                  Clear search
                </Button>
              }
            />
          ) : (
            <EmptyBlock
              icon={TagIcon}
              title="No tags yet"
              description="Create the first tag to make articles and research easier to group."
              action={
                <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
                  New tag
                </Button>
              }
            />
          )}
        </SectionCard>
      ) : (
        <TableShell
          head={
            <>
              <Th>Tag</Th>
              <Th>Description</Th>
              <Th align="center">Articles</Th>
              <Th align="center">Research</Th>
              <Th>Colour</Th>
              <Th align="right">Actions</Th>
            </>
          }
          footer={
            <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
              Showing {filteredTags.length} of {stats.total} tags
            </div>
          }
        >
          {filteredTags.map((tag) => (
            <Tr key={tag.id}>
              <Td>
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${tag.color || '#6B7280'}20` }}
                  >
                    <TagIcon className="h-4 w-4" style={{ color: tag.color || '#6B7280' }} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900 dark:text-slate-100">
                      {tag.name}
                    </p>
                    <p className="truncate text-xs text-slate-400">/{tag.slug}</p>
                  </div>
                </div>
              </Td>
              <Td>
                {tag.description ? (
                  <span className="line-clamp-2 max-w-sm text-slate-600 dark:text-slate-300">
                    {tag.description}
                  </span>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </Td>
              <Td align="center">
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {tag._count?.articles ?? 0}
                </span>
              </Td>
              <Td align="center">
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {tag._count?.researches ?? 0}
                </span>
              </Td>
              <Td>
                <span className="inline-flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: tag.color || '#6B7280' }}
                  />
                  <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                    {tag.color || '—'}
                  </span>
                </span>
              </Td>
              <Td align="right">
                <RowActions>
                  <IconAction icon={Pencil} label={`Edit ${tag.name}`} onClick={() => openEdit(tag)} />
                  <IconAction
                    icon={Trash2}
                    label={`Delete ${tag.name}`}
                    tone="danger"
                    onClick={() => handleDelete(tag)}
                  />
                </RowActions>
              </Td>
            </Tr>
          ))}
        </TableShell>
      )}

      <Modal
        isOpen={formOpen}
        onClose={closeForm}
        title={editingTag ? 'Edit tag' : 'New tag'}
        description={
          editingTag ? editingTag.name : "The tag slug is generated automatically from its name."
        }
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Tag name" htmlFor="tag-name" required>
            <input
              id="tag-name"
              type="text"
              required
              value={formData.name}
              onChange={(event) => setFormData({ ...formData, name: event.target.value })}
              placeholder="For example: Scholarships"
              className="input-base"
            />
          </Field>

          <Field label="Description" htmlFor="tag-description">
            <textarea
              id="tag-description"
              rows={3}
              value={formData.description}
              onChange={(event) => setFormData({ ...formData, description: event.target.value })}
              placeholder="A short note on when this tag is used…"
              className="input-base resize-none"
            />
          </Field>

          <Field
            label="Colour"
            htmlFor="tag-color"
            hint="Pick a preset or enter your own hex code."
          >
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span
                  className="h-11 w-11 shrink-0 rounded-xl border border-slate-200 dark:border-slate-700"
                  style={{ backgroundColor: formData.color }}
                />
                <input
                  id="tag-color"
                  type="text"
                  value={formData.color}
                  onChange={(event) => setFormData({ ...formData, color: event.target.value })}
                  placeholder="#E8231A"
                  className="input-base font-mono"
                />
              </div>
              <div className="grid grid-cols-7 gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, color })}
                    aria-label={`Select ${color} colour`}
                    aria-pressed={formData.color === color}
                    className={cn(
                      'h-8 w-8 rounded-lg transition-transform hover:scale-110',
                      formData.color === color &&
                        'ring-2 ring-[#E8231A] ring-offset-2 dark:ring-offset-slate-900'
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </Field>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Preview
            </p>
            <span
              className="inline-flex rounded-full px-3 py-1 text-sm font-medium text-white"
              style={{ backgroundColor: formData.color }}
            >
              {formData.name || 'Tag name'}
            </span>
          </div>

          <ModalFooter>
            <Button type="button" variant="secondary" onClick={closeForm}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={saving}>
              {editingTag ? 'Save changes' : 'Create tag'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      <ConfirmHost ctx={confirmCtx} />
    </PageStack>
  );
}
