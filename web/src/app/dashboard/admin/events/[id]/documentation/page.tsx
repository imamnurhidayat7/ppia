'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import { useToast } from '@/components/Toast';
import { useConfirm, ConfirmHost } from '@/hooks/useConfirm';
import { Badge, Button, Input, Modal, ModalFooter, Select, Textarea } from '@/components/ui';
import {
  AccessDenied,
  EmptyBlock,
  IconAction,
  LoadingCards,
  PageHeading,
  PageStack,
  RowActions,
  SectionCard,
  StatTile,
  StatTileRow,
} from '@/components/dashboard';
import { formatDate, getImageUrl } from '@/lib/utils';
import {
  CalendarClock,
  ExternalLink,
  Image as ImageIcon,
  Images,
  Link as LinkIcon,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  Video,
} from 'lucide-react';

/** Metadata dates read as log entries: 05 Mar 2025. */
const DATE_OPTS = {
  dateStyle: undefined,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
} as const;


type DocType = 'PHOTO' | 'VIDEO' | 'LINK';

interface EventDocumentation {
  id: string;
  eventId: string;
  type: DocType;
  url: string;
  title?: string;
  description?: string;
  createdAt: string;
}

interface DocFormState {
  type: DocType;
  url: string;
  title: string;
  description: string;
}

interface EventSummary {
  id: string;
  title: string;
  slug?: string;
  startDate?: string;
  location?: string;
}

const EMPTY_FORM: DocFormState = { type: 'PHOTO', url: '', title: '', description: '' };

const DOC_TYPE_OPTIONS = [
  { value: 'PHOTO', label: 'Photo (image URL)' },
  { value: 'VIDEO', label: 'Video (YouTube or Vimeo URL)' },
  { value: 'LINK', label: 'Link (external source)' },
];

const TYPE_LABEL: Record<DocType, string> = {
  PHOTO: 'Photo',
  VIDEO: 'Video',
  LINK: 'Link',
};

/** Turns a watch/share URL into an embeddable one; other URLs pass through. */
const toEmbedUrl = (url: string): string => {
  const ytWatch = url.match(/^https?:\/\/(?:www\.)?youtube\.com\/watch\?v=([\w-]{6,})/);
  if (ytWatch) return `https://www.youtube.com/embed/${ytWatch[1]}`;
  const ytShort = url.match(/^https?:\/\/youtu\.be\/([\w-]{6,})/);
  if (ytShort) return `https://www.youtube.com/embed/${ytShort[1]}`;
  const vimeo = url.match(/^https?:\/\/(?:www\.)?vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return url;
};

/**
 * Photos point at arbitrary URLs (uploads or pasted links), so they render
 * unoptimized and degrade to a placeholder when the file is gone.
 */
function DocPhoto({ url, alt }: { url: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  const src = getImageUrl(url) || url;

  if (failed) {
    return (
      <div className="flex h-44 items-center justify-center bg-[#EDF5FB] dark:bg-slate-800">
        <ImageIcon className="h-8 w-8 ink-muted" />
      </div>
    );
  }
  return (
    <div className="relative h-44 bg-[#EDF5FB] dark:bg-slate-800">
      <Image
        src={src}
        alt={alt}
        fill
        unoptimized
        sizes="(min-width: 1024px) 320px, 100vw"
        className="object-cover"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

export default function EventDocumentationPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const eventId = params?.id as string | undefined;
  const { showError, showSuccess } = useToast();
  const confirmCtx = useConfirm();

  const [event, setEvent] = useState<EventSummary | null>(null);
  const [docs, setDocs] = useState<EventDocumentation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState<EventDocumentation | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<DocFormState>(EMPTY_FORM);

  const canManage = user?.role === 'SUPER_ADMIN' || user?.role === 'BOARD';

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  const fetchData = useCallback(async () => {
    if (!eventId) return;
    try {
      const [eventRes, docsRes] = await Promise.all([
        api.getEvent(eventId),
        api.getEventDocumentation(eventId),
      ]);
      const detail = (eventRes.event || eventRes) as EventSummary;
      setEvent({
        id: detail.id,
        title: detail.title,
        slug: detail.slug,
        startDate: detail.startDate,
        location: detail.location,
      });
      const payload = docsRes as { documentation?: EventDocumentation[] } | EventDocumentation[];
      const list = Array.isArray(payload) ? payload : payload?.documentation ?? [];
      setDocs(Array.isArray(list) ? list : []);
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      showError(err.response?.data?.error || err.message || 'Could not load documentation');
    } finally {
      setLoading(false);
    }
  }, [eventId, showError]);

  /* eslint-disable react-hooks/set-state-in-effect --
     fetchData() only writes state after awaiting the network, which is the
     intended fetch-on-mount; the linter cannot see past the call. */
  useEffect(() => {
    if (user && canManage && eventId) {
      fetchData();
    }
  }, [user, canManage, eventId, fetchData]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const showSkeleton = (isLoading || loading) && (isLoading || canManage);

  const typeCounts = useMemo(
    () => ({
      PHOTO: docs.filter((doc) => doc.type === 'PHOTO').length,
      VIDEO: docs.filter((doc) => doc.type === 'VIDEO').length,
      LINK: docs.filter((doc) => doc.type === 'LINK').length,
    }),
    [docs]
  );

  const openCreate = () => {
    setEditingDoc(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (doc: EventDocumentation) => {
    setEditingDoc(doc);
    setForm({
      type: doc.type,
      url: doc.url,
      title: doc.title || '',
      description: doc.description || '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingDoc(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = async (submitEvent: React.FormEvent) => {
    submitEvent.preventDefault();
    if (!form.url.trim()) {
      showError('URL is required');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        type: form.type,
        url: form.url.trim(),
        title: form.title.trim() || undefined,
        description: form.description.trim() || undefined,
      };
      if (editingDoc) {
        await api.updateEventDocumentation(editingDoc.id, payload);
        showSuccess('Documentation updated');
      } else if (eventId) {
        await api.addEventDocumentation({ eventId, ...payload });
        showSuccess('Documentation added');
      }
      await fetchData();
      closeModal();
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      showError(err.response?.data?.error || err.message || 'Could not save documentation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (doc: EventDocumentation) => {
    const ok = await confirmCtx.confirm({
      title: 'Delete documentation?',
      message: `${doc.title || TYPE_LABEL[doc.type]} will be permanently deleted from the event documentation.`,
      confirmLabel: 'Yes, delete',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await api.deleteEventDocumentation(doc.id);
      showSuccess('Documentation deleted');
      await fetchData();
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      showError(err.response?.data?.error || err.message || 'Could not delete documentation');
    }
  };

  if (showSkeleton) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-64 rounded skeleton" />
          <div className="h-4 w-48 rounded skeleton" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((tile) => (
            <div key={tile} className="h-24 rounded-[5px] skeleton" />
          ))}
        </div>
        <LoadingCards count={6} columns={3} />
      </div>
    );
  }

  if (!canManage) {
    return (
      <AccessDenied
        message="Only Super Admin and Board can manage event documentation."
        backHref="/dashboard"
      />
    );
  }

  const urlLabel =
    form.type === 'LINK'
      ? 'Link URL'
      : form.type === 'VIDEO'
        ? 'Video URL (YouTube or Vimeo)'
        : 'Image URL';

  return (
    <PageStack>
      <PageHeading
        eyebrow="Event documentation"
        title={event?.title || 'Event documentation'}
        description="Collect photos, videos, and coverage links from this activity."
        icon={Images}
        backHref="/dashboard/admin/events"
        backLabel="Back to events"
        actions={
          <Button variant="primary" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
            Add documentation
          </Button>
        }
      />

      {event && (event.startDate || event.location || event.slug) && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm ink-muted">
          {event.startDate && (
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock className="h-4 w-4 text-[#E8231A]" />
              {formatDate(event.startDate, DATE_OPTS)}
            </span>
          )}
          {event.location && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4 ink-muted" />
              {event.location}
            </span>
          )}
          {event.slug && (
            <Link
              href={`/activities/events/${event.slug}`}
              className="font-semibold text-[#E8231A] hover:underline"
            >
              View event page
            </Link>
          )}
        </div>
      )}

      <StatTileRow columns={3}>
        <StatTile label="Photos" value={typeCounts.PHOTO} tone="sky" icon={ImageIcon} />
        <StatTile label="Video" value={typeCounts.VIDEO} tone="violet" icon={Video} />
        <StatTile label="Links" value={typeCounts.LINK} tone="emerald" icon={LinkIcon} />
      </StatTileRow>

      {docs.length === 0 ? (
        <SectionCard flush>
          <EmptyBlock
            icon={Images}
            title="No documentation yet"
            description="Add photos, videos, or links so this activity is documented."
            action={
              <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
                Add the first item
              </Button>
            }
          />
        </SectionCard>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {docs.map((doc) => (
            <article
              key={doc.id}
              className="chart-paper overflow-hidden rounded-[5px] border border-[#DCE7F1] dark:border-slate-800"
            >
              {doc.type === 'PHOTO' && <DocPhoto url={doc.url} alt={doc.title || 'Documentation photo'} />}
              {doc.type === 'VIDEO' && (
                <div className="relative h-44 bg-black">
                  <iframe
                    src={toEmbedUrl(doc.url)}
                    title={doc.title || 'Documentation video'}
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )}
              {doc.type === 'LINK' && (
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-32 items-center justify-center bg-[#F5FAFD] transition-colors hover:bg-[#EDF5FB] dark:bg-slate-800/60 dark:hover:bg-slate-800"
                >
                  <span className="px-4 text-center">
                    <LinkIcon className="mx-auto mb-2 h-8 w-8 ink-muted" />
                    <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#E8231A]">
                      <ExternalLink className="h-3 w-3" />
                      Open link
                    </span>
                  </span>
                </a>
              )}

              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold ink-strong">
                      {doc.title || 'Untitled'}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge variant="default" className="data-type uppercase">{TYPE_LABEL[doc.type]}</Badge>
                      <span className="text-[12px] ink-muted">
                        Added {formatDate(doc.createdAt, DATE_OPTS)}
                      </span>
                    </div>
                  </div>
                  <RowActions>
                    <IconAction
                      icon={Pencil}
                      label={`Edit ${doc.title || TYPE_LABEL[doc.type]}`}
                      onClick={() => openEdit(doc)}
                    />
                    <IconAction
                      icon={Trash2}
                      label={`Delete ${doc.title || TYPE_LABEL[doc.type]}`}
                      tone="danger"
                      onClick={() => handleDelete(doc)}
                    />
                  </RowActions>
                </div>
                {doc.description && (
                  <p className="mt-2 line-clamp-2 text-sm ink-muted">
                    {doc.description}
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editingDoc ? 'Edit documentation' : 'Add documentation'}
        description={
          editingDoc
            ? 'Update the details of this documentation item.'
            : 'Add a photo, video, or link for this event.'
        }
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            id="doc-type"
            label="Type"
            value={form.type}
            onChange={(changeEvent) =>
              setForm({ ...form, type: changeEvent.target.value as DocType })
            }
            options={DOC_TYPE_OPTIONS}
            placeholder=""
          />
          <Input
            id="doc-url"
            label={urlLabel}
            type="url"
            required
            value={form.url}
            onChange={(changeEvent) => setForm({ ...form, url: changeEvent.target.value })}
            placeholder="https://…"
          />
          <Input
            id="doc-title"
            label="Title (optional)"
            value={form.title}
            onChange={(changeEvent) => setForm({ ...form, title: changeEvent.target.value })}
            placeholder="For example: Panel discussion session"
          />
          <Textarea
            id="doc-description"
            label="Description (optional)"
            value={form.description}
            onChange={(changeEvent) => setForm({ ...form, description: changeEvent.target.value })}
            placeholder="Add a short bit of context…"
            rows={3}
          />
          <ModalFooter>
            <Button type="button" variant="secondary" onClick={closeModal} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={submitting}>
              {editingDoc ? 'Save changes' : 'Add documentation'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      <ConfirmHost ctx={confirmCtx} />
    </PageStack>
  );
}
