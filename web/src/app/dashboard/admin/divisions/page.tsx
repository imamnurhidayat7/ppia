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
import { cn } from '@/lib/utils';
import { Building2, Palette, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';

interface Division {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color?: string;
}

const COLORS: { name: string; value: string }[] = [
  { name: 'Red', value: '#E8231A' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Green', value: '#10B981' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Orange', value: '#F59E0B' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Indigo', value: '#6366F1' },
  { name: 'Teal', value: '#14B8A6' },
];

const EMPTY_FORM = { name: '', slug: '', description: '', color: '#E8231A' };

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

export default function AdminDivisionsPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const confirmCtx = useConfirm();

  const [divisions, setDivisions] = useState<Division[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editingDivision, setEditingDivision] = useState<Division | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Organisation structure is not site content, so only Super Admin can manage it.
  const canManage = user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  const fetchData = useCallback(async () => {
    try {
      const response = await api.getDivisions();
      const payload = response as { divisions?: Division[] } | Division[];
      setDivisions(Array.isArray(payload) ? payload : payload?.divisions ?? []);
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      showError(err.response?.data?.error || err.message || 'Could not load division data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showError]);

  /* eslint-disable react-hooks/set-state-in-effect --
     fetchData() only writes state after awaiting the network; the linter cannot
     see past the call. */
  useEffect(() => {
    if (user && canManage) {
      fetchData();
    }
  }, [user, canManage, fetchData]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Anyone but Super Admin never triggers the fetch, so the skeleton must not wait on it.
  const showSkeleton = (isLoading || loading) && (isLoading || canManage);

  const filteredDivisions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return divisions;
    return divisions.filter(
      (division) =>
        division.name.toLowerCase().includes(query) ||
        division.slug.toLowerCase().includes(query) ||
        division.description?.toLowerCase().includes(query)
    );
  }, [divisions, searchQuery]);

  const describedCount = useMemo(
    () => divisions.filter((division) => Boolean(division.description?.trim())).length,
    [divisions]
  );

  const openCreate = () => {
    setEditingDivision(null);
    setFormData(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (division: Division) => {
    setEditingDivision(division);
    setFormData({
      name: division.name,
      slug: division.slug,
      description: division.description || '',
      color: division.color || '#E8231A',
    });
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingDivision(null);
    setFormData(EMPTY_FORM);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (editingDivision) {
        await api.updateDivision(editingDivision.id, formData);
        showSuccess('Division updated');
      } else {
        await api.createDivision(formData);
        showSuccess('Division created');
      }
      closeForm();
      await fetchData();
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      showError(err.response?.data?.error || err.message || 'Could not save division');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (division: Division) => {
    const ok = await confirmCtx.confirm({
      title: 'Delete division?',
      message: `${division.name} will be permanently deleted. This action cannot be undone.`,
      confirmLabel: 'Yes, delete',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await api.deleteDivision(division.id);
      showSuccess('Division deleted');
      await fetchData();
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      showError(err.response?.data?.error || err.message || 'Could not delete division');
    }
  };

  if (showSkeleton) {
    return <ListPageSkeleton tiles={3} rows={5} />;
  }

  if (!canManage) {
    return (
      <AccessDenied
        message="Only Super Admin can manage divisions."
        backHref="/dashboard"
      />
    );
  }

  return (
    <PageStack>
      <PageHeading
        title="Manage divisions"
        description={
          divisions.length === 0
            ? 'No divisions have been created yet.'
            : `${divisions.length} divisions registered in the organisation structure.`
        }
        icon={Building2}
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
            <Button variant="primary" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
              New division
            </Button>
          </>
        }
      />

      <StatTileRow columns={3}>
        <StatTile label="Total divisions" value={divisions.length} tone="slate" icon={Building2} />
        <StatTile label="With description" value={describedCount} tone="emerald" />
        <StatTile
          label="Without description"
          value={divisions.length - describedCount}
          tone="amber"
          hint="Fill these in so they are easy to recognise"
        />
      </StatTileRow>

      <Toolbar>
        <SearchField
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by name, slug, or division description…"
          ariaLabel="Search divisions"
        />
        {searchQuery && <ResetFiltersButton onClick={() => setSearchQuery('')} />}
      </Toolbar>

      {filteredDivisions.length === 0 ? (
        <SectionCard flush>
          {searchQuery ? (
            <EmptyBlock
              icon={Building2}
              title="No matching divisions"
              description="Try a different search keyword."
              action={
                <Button variant="secondary" onClick={() => setSearchQuery('')}>
                  Clear search
                </Button>
              }
            />
          ) : (
            <EmptyBlock
              icon={Building2}
              title="No divisions yet"
              description="Create the first division to group members and content."
              action={
                <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
                  New division
                </Button>
              }
            />
          )}
        </SectionCard>
      ) : (
        <TableShell
          head={
            <>
              <Th>Division</Th>
              <Th>Slug</Th>
              <Th>Description</Th>
              <Th>Colour</Th>
              <Th align="right">Actions</Th>
            </>
          }
          footer={
            <div className="data-type border-t border-[#E7EFF7] px-5 py-3 text-[12px] ink-muted dark:border-slate-800">
              Showing {filteredDivisions.length} of {divisions.length} divisions
            </div>
          }
        >
          {filteredDivisions.map((division) => (
            <Tr key={division.id}>
              <Td>
                <div className="flex items-center gap-3">
                  <span
                    className="h-8 w-8 shrink-0 rounded-[4px]"
                    style={{ backgroundColor: `${division.color || '#6366F1'}25` }}
                  >
                    <span className="flex h-full w-full items-center justify-center">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: division.color || '#6366F1' }}
                      />
                    </span>
                  </span>
                  <span className="truncate font-semibold ink-strong">
                    {division.name}
                  </span>
                </div>
              </Td>
              <Td>
                <span className="data-type text-[12px] ink-muted">/{division.slug}</span>
              </Td>
              <Td>
                {division.description ? (
                  <span className="line-clamp-2 max-w-md ink-body">
                    {division.description}
                  </span>
                ) : (
                  <span className="ink-muted">—</span>
                )}
              </Td>
              <Td>
                <span className="data-type text-[12px] ink-muted">
                  {division.color || '—'}
                </span>
              </Td>
              <Td align="right">
                <RowActions>
                  <IconAction
                    icon={Pencil}
                    label={`Edit ${division.name}`}
                    onClick={() => openEdit(division)}
                  />
                  <IconAction
                    icon={Trash2}
                    label={`Delete ${division.name}`}
                    tone="danger"
                    onClick={() => handleDelete(division)}
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
        title={editingDivision ? 'Edit division' : 'New division'}
        description={
          editingDivision
            ? editingDivision.name
            : 'Divisions are used to group members, events, and content.'
        }
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormGrid columns={2}>
            <Field label="Division name" htmlFor="division-name" required>
              <input
                id="division-name"
                type="text"
                required
                value={formData.name}
                onChange={(event) =>
                  setFormData({
                    ...formData,
                    name: event.target.value,
                    slug: toSlug(event.target.value),
                  })
                }
                placeholder="For example: Public Relations"
                className="input-base rounded-[4px] border-[#C3D2E0] dark:border-slate-700"
              />
            </Field>
            <Field
              label="Slug"
              htmlFor="division-slug"
              required
              hint="Used in the division's public URL."
            >
              <input
                id="division-slug"
                type="text"
                required
                value={formData.slug}
                onChange={(event) => setFormData({ ...formData, slug: event.target.value })}
                placeholder="public-relations"
                className="input-base rounded-[4px] border-[#C3D2E0] dark:border-slate-700"
              />
            </Field>
          </FormGrid>

          <Field label="Description" htmlFor="division-description">
            <textarea
              id="division-description"
              rows={3}
              value={formData.description}
              onChange={(event) => setFormData({ ...formData, description: event.target.value })}
              placeholder="A summary of the division's responsibilities and scope…"
              className="input-base rounded-[4px] border-[#C3D2E0] dark:border-slate-700 resize-none"
            />
          </Field>

          <Field label="Label colour" hint="Used on division labels across the dashboard.">
            <div className="flex flex-wrap items-center gap-2">
              {COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, color: color.value })}
                  aria-label={`Select ${color.name} colour`}
                  aria-pressed={formData.color === color.value}
                  className={cn(
                    'h-8 w-8 rounded-full transition-transform',
                    formData.color === color.value &&
                      'scale-110 ring-2 ring-slate-400 ring-offset-2 dark:ring-offset-slate-900'
                  )}
                  style={{ backgroundColor: color.value }}
                />
              ))}
              <span className="ml-1 inline-flex items-center gap-1.5 text-[12px] ink-muted">
                <Palette className="h-3.5 w-3.5" />
                <span className="font-mono">{formData.color}</span>
              </span>
            </div>
          </Field>

          <ModalFooter>
            <Button type="button" variant="secondary" onClick={closeForm}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={saving}>
              {editingDivision ? 'Save changes' : 'Create division'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      <ConfirmHost ctx={confirmCtx} />
    </PageStack>
  );
}
