'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import type { Media } from '@/lib/api-types';
import { useToast } from '@/components/Toast';
import { useConfirm, ConfirmHost } from '@/hooks/useConfirm';
import { Button, Modal, ModalFooter } from '@/components/ui';
import {
  AccessDenied,
  EmptyBlock,
  Field,
  IconAction,
  LoadingCards,
  PageHeading,
  PageStack,
  ResetFiltersButton,
  SearchField,
  SectionCard,
  StatTile,
  StatTileRow,
  Toolbar,
} from '@/components/dashboard';
import { cn, formatDate, getImageUrl } from '@/lib/utils';
import {
  FileText,
  FolderOpen,
  HardDrive,
  ImageIcon,
  Images,
  Pencil,
  RefreshCw,
  Trash2,
  Upload,
} from 'lucide-react';

/** Metadata dates read as log entries: 05 Mar 2025. */
const DATE_OPTS = {
  dateStyle: undefined,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
} as const;


interface MediaListResponse {
  media?: Media[];
  folders?: string[];
}

function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes)) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Uploads live on arbitrary URLs, so previews are unoptimized with a fallback. */
function MediaPreview({ item }: { item: Media }) {
  const [failed, setFailed] = useState(false);
  const src = getImageUrl(item.url);
  const isImage = item.mimetype?.startsWith('image/');

  if (!src || !isImage || failed) {
    return (
      <span className="flex h-full w-full items-center justify-center bg-[#EDF5FB] dark:bg-slate-800">
        <FileText className="h-7 w-7 ink-muted" />
      </span>
    );
  }
  return (
    <Image
      src={src}
      alt={item.altText || item.filename}
      fill
      unoptimized
      sizes="(max-width: 640px) 50vw, 240px"
      className="object-cover"
      onError={() => setFailed(true)}
    />
  );
}

export default function MediaLibraryPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const confirmCtx = useConfirm();

  const [media, setMedia] = useState<Media[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolder, setSelectedFolder] = useState('');

  const [editingMedia, setEditingMedia] = useState<Media | null>(null);
  const [editData, setEditData] = useState({ altText: '', folder: '' });
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // The media library is site content, so Board can manage it too.
  const canManage = user?.role === 'SUPER_ADMIN' || user?.role === 'BOARD';

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  const fetchMedia = useCallback(async () => {
    try {
      const data = (await api.getMedia({
        folder: selectedFolder || undefined,
        search: searchQuery || undefined,
      })) as MediaListResponse;
      setMedia(data.media ?? []);
      setFolders(data.folders ?? []);
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      showError(err.response?.data?.error || err.message || 'Could not load media library');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedFolder, searchQuery, showError]);

  /* eslint-disable react-hooks/set-state-in-effect --
     fetchMedia() only writes state after awaiting the network; the linter cannot
     see past the call. */
  useEffect(() => {
    if (user && canManage) {
      fetchMedia();
    }
  }, [user, canManage, fetchMedia]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Non-admins never trigger the fetch, so the skeleton must not wait on it.
  const showSkeleton = (isLoading || loading) && (isLoading || canManage);

  const stats = useMemo(() => {
    const totalSize = media.reduce((sum, item) => sum + (item.size || 0), 0);
    return {
      total: media.length,
      images: media.filter((item) => item.mimetype?.startsWith('image/')).length,
      folders: folders.length,
      totalSize,
      missingAlt: media.filter((item) => !item.altText?.trim()).length,
    };
  }, [media, folders]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        await api.uploadImage(file);
      }
      showSuccess(files.length === 1 ? 'File uploaded' : `${files.length} files uploaded`);
      await fetchMedia();
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      showError(err.response?.data?.error || err.message || 'Could not upload files');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (item: Media) => {
    const ok = await confirmCtx.confirm({
      title: 'Delete file?',
      message: `${item.filename} will be permanently deleted, and its links will break in any content that uses it.`,
      confirmLabel: 'Yes, delete',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await api.deleteMedia(item.id);
      showSuccess('File deleted');
      await fetchMedia();
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      showError(err.response?.data?.error || err.message || 'Could not delete file');
    }
  };

  const openEdit = (item: Media) => {
    setEditingMedia(item);
    setEditData({ altText: item.altText || '', folder: item.folder || '' });
  };

  const handleSaveEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingMedia) return;
    setSaving(true);
    try {
      await api.updateMedia(editingMedia.id, editData);
      showSuccess('File details updated');
      setEditingMedia(null);
      await fetchMedia();
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      showError(err.response?.data?.error || err.message || 'Could not update file');
    } finally {
      setSaving(false);
    }
  };

  const hasFilters = Boolean(searchQuery || selectedFolder);

  if (showSkeleton) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-56 rounded skeleton" />
          <div className="h-4 w-72 rounded skeleton" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[0, 1, 2, 3].map((tile) => (
            <div key={tile} className="h-24 rounded-[5px] skeleton" />
          ))}
        </div>
        <div className="h-11 rounded-[4px] skeleton" />
        <LoadingCards count={8} columns={4} />
      </div>
    );
  }

  if (!canManage) {
    return (
      <AccessDenied
        message="Only Super Admin and Board can access the media library."
        backHref="/dashboard"
      />
    );
  }

  return (
    <PageStack>
      <PageHeading
        title="Media library"
        description={
          stats.total === 0
            ? 'No files have been uploaded yet.'
            : `${stats.total} files • ${formatFileSize(stats.totalSize)} used`
        }
        icon={Images}
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
                fetchMedia();
              }}
            >
              Refresh
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleUpload}
              accept="image/*"
              multiple
              className="hidden"
              aria-label="Select files to upload"
            />
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Upload className="h-4 w-4" />}
              isLoading={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              Upload files
            </Button>
          </>
        }
      />

      <StatTileRow columns={4}>
        <StatTile label="Total files" value={stats.total} tone="slate" icon={Images} />
        <StatTile label="Images" value={stats.images} tone="sky" icon={ImageIcon} />
        <StatTile label="Folders" value={stats.folders} tone="violet" icon={FolderOpen} />
        <StatTile
          label="Missing alt text"
          value={stats.missingAlt}
          tone="amber"
          hint="Needed for accessibility"
        />
      </StatTileRow>

      <Toolbar>
        <SearchField
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by file name or alt text…"
          ariaLabel="Search media files"
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedFolder('')}
            aria-pressed={!selectedFolder}
            className={cn(
              'rounded-[4px] px-3.5 py-2 text-sm font-semibold transition-colors',
              !selectedFolder
                ? 'bg-[#0D1B33] text-white'
                : 'chart-paper border border-[#DCE7F1] ink-body hover:border-[#C3D2E0] dark:border-slate-700'
            )}
          >
            All folders
          </button>
          {folders.map((folder) => (
            <button
              key={folder}
              type="button"
              onClick={() => setSelectedFolder(folder)}
              aria-pressed={selectedFolder === folder}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-[4px] px-3.5 py-2 text-sm font-semibold transition-colors',
                selectedFolder === folder
                  ? 'bg-[#0D1B33] text-white'
                  : 'chart-paper border border-[#DCE7F1] ink-body hover:border-[#C3D2E0] dark:border-slate-700'
              )}
            >
              <FolderOpen className="h-3.5 w-3.5" />
              {folder}
            </button>
          ))}
        </div>
        {hasFilters && (
          <ResetFiltersButton
            onClick={() => {
              setSearchQuery('');
              setSelectedFolder('');
            }}
          />
        )}
      </Toolbar>

      {media.length === 0 ? (
        <SectionCard flush>
          {hasFilters ? (
            <EmptyBlock
              icon={Images}
              title="No matching files"
              description="Try a different keyword or pick another folder."
              action={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedFolder('');
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyBlock
              icon={Images}
              title="The media library is empty"
              description="Upload images to use on articles, events, and site pages."
              action={
                <Button
                  variant="primary"
                  leftIcon={<Upload className="h-4 w-4" />}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Upload files
                </Button>
              }
            />
          )}
        </SectionCard>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {media.map((item) => (
            <article
              key={item.id}
              className="chart-paper group overflow-hidden rounded-[5px] border border-[#DCE7F1] transition-all hover:border-[#C3D2E0] hover:shadow-lg dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
            >
              <div className="relative aspect-square bg-[#EDF5FB] dark:bg-slate-800">
                <MediaPreview item={item} />
                <div className="absolute right-2 top-2 flex gap-1 rounded-[4px] bg-white/90 p-0.5 opacity-0 shadow-sm backdrop-blur transition-opacity group-hover:opacity-100 focus-within:opacity-100 dark:bg-slate-900/90">
                  <IconAction
                    icon={Pencil}
                    label={`Edit details for ${item.filename}`}
                    onClick={() => openEdit(item)}
                  />
                  <IconAction
                    icon={Trash2}
                    label={`Delete ${item.filename}`}
                    tone="danger"
                    onClick={() => handleDelete(item)}
                  />
                </div>
                {!item.altText?.trim() && (
                  <span className="absolute bottom-2 left-2 rounded-[3px] bg-amber-500/90 px-1.5 py-0.5 data-type text-[12px] font-bold uppercase text-white">
                    No alt
                  </span>
                )}
              </div>
              <div className="space-y-1 p-3">
                <p
                  className="truncate text-sm font-semibold ink-strong"
                  title={item.filename}
                >
                  {item.filename}
                </p>
                <p className="data-type flex items-center gap-1.5 text-[12px] ink-muted">
                  <HardDrive aria-hidden="true" className="h-3 w-3" />
                  {formatFileSize(item.size)}
                  {item.folder ? ` • ${item.folder}` : ''}
                </p>
                <p className="data-type text-[12px] ink-muted">
                  {formatDate(item.createdAt, DATE_OPTS)}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        isOpen={Boolean(editingMedia)}
        onClose={() => setEditingMedia(null)}
        title="Edit file details"
        description={editingMedia?.filename}
        size="lg"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          {editingMedia && (
            <div className="relative h-40 overflow-hidden rounded-[4px] bg-[#EDF5FB] dark:bg-slate-800">
              <MediaPreview item={editingMedia} />
            </div>
          )}

          <Field
            label="Alt text"
            htmlFor="media-alt"
            hint="A short description of the image for screen readers and SEO."
          >
            <input
              id="media-alt"
              type="text"
              value={editData.altText}
              onChange={(event) => setEditData({ ...editData, altText: event.target.value })}
              placeholder="For example: PPIA workshop attendees in discussion"
              className="input-base rounded-[4px] border-[#C3D2E0] dark:border-slate-700"
            />
          </Field>

          <Field label="Folder" htmlFor="media-folder" hint="Leave empty to store at the root.">
            <input
              id="media-folder"
              type="text"
              value={editData.folder}
              onChange={(event) => setEditData({ ...editData, folder: event.target.value })}
              placeholder="For example: events, articles"
              list="media-folder-options"
              className="input-base rounded-[4px] border-[#C3D2E0] dark:border-slate-700"
            />
            <datalist id="media-folder-options">
              {folders.map((folder) => (
                <option key={folder} value={folder} />
              ))}
            </datalist>
          </Field>

          <ModalFooter>
            <Button type="button" variant="secondary" onClick={() => setEditingMedia(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={saving}>
              Save changes
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      <ConfirmHost ctx={confirmCtx} />
    </PageStack>
  );
}
