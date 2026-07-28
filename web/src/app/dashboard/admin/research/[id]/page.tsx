'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import { useToast } from '@/components/Toast';
import { ConfirmHost, useConfirm } from '@/hooks/useConfirm';
import { Badge, Button } from '@/components/ui';
import {
  AccessDenied,
  DetailItem,
  EmptyBlock,
  PageHeading,
  PageLoading,
  PageStack,
  SectionCard,
  StatTile,
  StatTileRow,
} from '@/components/dashboard';
import { formatDate } from '@/lib/utils';
import { sanitizeHtml } from '@/lib/sanitize-html';
import {
  BookMarked,
  Calendar,
  Check,
  Copy,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  FlaskConical,
  Hash,
  Layers,
  Link as LinkIcon,
  Pencil,
  Quote,
  Search,
  Tags,
  Trash2,
  User,
} from 'lucide-react';
import type { ResearchDetail } from '../_components/shared';
import { errorMessage, statusLabel, statusMeta, typeLabel, typeMeta } from '../_components/shared';

export default function AdminResearchDetailPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { showSuccess, showError } = useToast();
  const confirmCtx = useConfirm();

  const [research, setResearch] = useState<ResearchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const canManage = user?.role === 'SUPER_ADMIN' || user?.role === 'BOARD';

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.getResearchAdminById(id);
      const payload = res as { research?: ResearchDetail };
      setResearch(payload.research ?? (res as ResearchDetail));
    } catch (error) {
      showError(errorMessage(error, 'Could not load research'));
    } finally {
      setLoading(false);
    }
  }, [id, showError]);

  /* eslint-disable react-hooks/set-state-in-effect --
     fetchData() only writes state after awaiting the network, which is the
     intended fetch-on-mount; the linter cannot see past the call. */
  useEffect(() => {
    if (user && canManage) {
      fetchData();
    }
  }, [user, canManage, fetchData]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handlePublishToggle = async () => {
    if (!research) return;
    setBusy(true);
    try {
      await api.updateResearch(research.id, { published: !research.published });
      setResearch({ ...research, published: !research.published });
      showSuccess(research.published ? 'Research unpublished' : 'Research published');
    } catch (error) {
      showError(errorMessage(error, 'Could not update the publishing status'));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!research) return;
    const ok = await confirmCtx.confirm({
      title: 'Delete research?',
      message: `${research.title} will be deleted permanently and cannot be restored.`,
      confirmLabel: 'Yes, delete',
      variant: 'danger',
    });
    if (!ok) return;
    setBusy(true);
    try {
      await api.deleteResearch(id);
      showSuccess('Research deleted');
      router.push('/dashboard/admin/research');
    } catch (error) {
      showError(errorMessage(error, 'Could not delete research'));
      setBusy(false);
    }
  };

  const copyCitation = async (citation: string) => {
    try {
      await navigator.clipboard.writeText(citation);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showError('The browser blocked clipboard access');
    }
  };

  const showSkeleton = (isLoading || loading) && (isLoading || canManage);

  if (showSkeleton) {
    return <PageLoading label="Loading research…" />;
  }

  if (!canManage) {
    return (
      <AccessDenied
        message="Research detail is only for Super Admin and Board."
        backHref="/dashboard"
      />
    );
  }

  if (!research) {
    return (
      <PageStack>
        <PageHeading
          title="Research not found"
          description="The record may have been deleted or is not published yet."
          icon={FlaskConical}
          backHref="/dashboard/admin/research"
          backLabel="Back to research"
        />
        <SectionCard flush>
          <EmptyBlock
            icon={FlaskConical}
            title="Research unavailable"
            description="Try opening it again from the research list."
            action={
              <Link href="/dashboard/admin/research">
                <Button variant="primary">Go to research list</Button>
              </Link>
            }
          />
        </SectionCard>
      </PageStack>
    );
  }

  const TypeIcon = typeMeta(research.researchType)?.icon;
  const status = statusMeta(research.researchStatus);
  const keywords = research.keywords
    ? research.keywords
        .split(',')
        .map((keyword) => keyword.trim())
        .filter(Boolean)
    : [];

  return (
    <PageStack>
      <PageHeading
        eyebrow={typeLabel(research.researchType)}
        title={research.title}
        description={`Created ${formatDate(research.createdAt)} • Updated ${formatDate(research.updatedAt)}`}
        icon={FlaskConical}
        backHref="/dashboard/admin/research"
        backLabel="Back to research"
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              disabled={busy}
              leftIcon={
                research.published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />
              }
              onClick={handlePublishToggle}
            >
              {research.published ? 'Unpublish' : 'Publish'}
            </Button>
            <Link
              href={`/activities/research-corner/${research.slug}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="secondary" size="sm" leftIcon={<ExternalLink className="h-4 w-4" />}>
                View public page
              </Button>
            </Link>
            <Link href={`/dashboard/admin/research/${id}/edit`}>
              <Button variant="primary" size="sm" leftIcon={<Pencil className="h-4 w-4" />}>
                Edit
              </Button>
            </Link>
            <Button
              variant="danger"
              size="sm"
              disabled={busy}
              leftIcon={<Trash2 className="h-4 w-4" />}
              onClick={handleDelete}
            >
              Delete
            </Button>
          </>
        }
      />

      <StatTileRow columns={4}>
        <StatTile label="Views" value={research.viewCount || 0} tone="sky" icon={Eye} />
        <StatTile label="Downloads" value={research.downloadCount || 0} tone="red" icon={Download} />
        <StatTile
          label="Publishing"
          value={research.published ? 'Published' : 'Draft'}
          tone={research.published ? 'emerald' : 'amber'}
        />
        <StatTile
          label="Stage"
          value={statusLabel(research.researchStatus)}
          tone="violet"
          icon={Layers}
        />
      </StatTileRow>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SectionCard title="Title" icon={FileText}>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {research.title}
              </p>
              {research.titleIndonesian && (
                <p className="text-sm italic text-slate-500 dark:text-slate-400">
                  {research.titleIndonesian}
                </p>
              )}
              <p className="text-xs text-slate-400">/{research.slug}</p>
            </div>
          </SectionCard>

          <SectionCard
            title="Abstract"
            description="The main summary shown on the public page."
            icon={BookMarked}
          >
            {research.abstract ? (
              <div
                className="prose prose-sm max-w-none text-slate-600 dark:prose-invert dark:text-slate-300"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(research.abstract) }}
              />
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">No abstract yet.</p>
            )}
          </SectionCard>

          {research.abstractIndonesian && (
            <SectionCard title="Indonesian abstract" icon={BookMarked}>
              <div
                className="prose prose-sm max-w-none text-slate-600 dark:prose-invert dark:text-slate-300"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(research.abstractIndonesian) }}
              />
            </SectionCard>
          )}

          <SectionCard
            title="Academic details"
            description="Publication identity and file links."
            icon={Layers}
            footer={
              research.pdfUrl ? (
                <a
                  href={research.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#E8231A] hover:underline"
                >
                  <Download className="h-4 w-4" />
                  Download the PDF file
                </a>
              ) : undefined
            }
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <DetailItem
                label="Research type"
                icon={TypeIcon}
                value={typeLabel(research.researchType)}
              />
              <DetailItem
                label="Stage"
                icon={Layers}
                value={
                  <Badge variant={status?.badge || 'default'}>
                    {statusLabel(research.researchStatus)}
                  </Badge>
                }
              />
              <DetailItem
                label="DOI"
                icon={Hash}
                value={
                  research.doi ? (
                    <a
                      href={`https://doi.org/${research.doi}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 break-all text-[#E8231A] hover:underline"
                    >
                      {research.doi}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    ''
                  )
                }
              />
              <DetailItem label="Venue" icon={BookMarked} value={research.venue || ''} />
              <DetailItem
                label="Publication date"
                icon={Calendar}
                value={research.publicationDate ? formatDate(research.publicationDate) : ''}
              />
              <DetailItem label="Division" icon={Tags} value={research.division?.name || ''} />
              <DetailItem
                label="Source link"
                icon={LinkIcon}
                className="sm:col-span-2"
                value={
                  research.url ? (
                    <a
                      href={research.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 break-all text-[#E8231A] hover:underline"
                    >
                      {research.url}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    ''
                  )
                }
              />
              <DetailItem
                label="Keywords"
                icon={Tags}
                className="sm:col-span-2"
                value={
                  keywords.length > 0 ? (
                    <span className="flex flex-wrap gap-2">
                      {keywords.map((keyword) => (
                        <span
                          key={keyword}
                          className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                        >
                          {keyword}
                        </span>
                      ))}
                    </span>
                  ) : (
                    ''
                  )
                }
              />
            </div>
          </SectionCard>

          {research.citationFormat && (
            <SectionCard
              title="Citation"
              description="The citation style chosen for this research."
              icon={Quote}
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={
                    copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />
                  }
                  onClick={() => copyCitation(research.citationFormat || '')}
                >
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              }
            >
              <p className="rounded-xl bg-slate-50 p-4 text-sm italic text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                {research.citationFormat}
              </p>
            </SectionCard>
          )}

          {research.tags && research.tags.length > 0 && (
            <SectionCard title="Tags" icon={Tags}>
              <div className="flex flex-wrap gap-2">
                {research.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="rounded-full px-3 py-1.5 text-xs font-medium"
                    style={{
                      backgroundColor: `${tag.color || '#6366F1'}20`,
                      color: tag.color || '#6366F1',
                    }}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            </SectionCard>
          )}
        </div>

        <div className="space-y-6">
          <SectionCard title="Author" icon={User}>
            {research.mainAuthor?.name ? (
              <DetailItem
                label="Lead author"
                icon={User}
                value={
                  <>
                    {research.mainAuthor.name}
                    {research.division?.name && (
                      <span className="mt-0.5 block text-xs font-normal text-slate-500 dark:text-slate-400">
                        {research.division.name}
                      </span>
                    )}
                  </>
                }
              />
            ) : research.authors ? (
              <DetailItem label="Author list" icon={User} value={research.authors} />
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No authors recorded yet.
              </p>
            )}
          </SectionCard>

          {research.scheduledPublishAt && (
            <SectionCard title="Scheduled publish date" icon={Calendar}>
              <DetailItem
                label="Scheduled"
                icon={Calendar}
                value={formatDate(research.scheduledPublishAt)}
              />
            </SectionCard>
          )}

          {(research.metaTitle || research.metaDescription || research.metaKeywords) && (
            <SectionCard title="SEO metadata" icon={Search}>
              <div className="space-y-4">
                <DetailItem label="Meta title" value={research.metaTitle || ''} />
                <DetailItem label="Meta description" value={research.metaDescription || ''} />
                <DetailItem label="Meta keywords" value={research.metaKeywords || ''} />
              </div>
            </SectionCard>
          )}
        </div>
      </div>

      <ConfirmHost ctx={confirmCtx} />
    </PageStack>
  );
}
