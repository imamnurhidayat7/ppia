'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import { useToast } from '@/components/Toast';
import { AccessDenied, PageHeading, PageLoading, PageStack } from '@/components/dashboard';
import { FlaskConical } from 'lucide-react';
import { ResearchForm } from '../../_components/research-form';
import type {
  DivisionRef,
  ResearchDetail,
  ResearchFormValues,
  TagRef,
} from '../../_components/shared';
import {
  EMPTY_RESEARCH_FORM,
  buildResearchPayload,
  errorMessage,
  unwrapList,
} from '../../_components/shared';

/** A date input value needs the YYYY-MM-DD format. */
function toDateInputValue(value?: string): string {
  if (!value) return '';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().split('T')[0];
}

/**
 * Some older records store `authors` as JSON, so it is still parsed into a
 * comma separated list of names exactly like the previous version did.
 */
function authorsToText(raw?: string): string {
  if (!raw) return '';
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .map((entry) => (entry as { name?: string })?.name || '')
        .filter(Boolean)
        .join(', ');
    }
    return raw;
  } catch {
    return raw;
  }
}

export default function EditResearchPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const { showError, showSuccess } = useToast();
  const params = useParams();
  const id = params.id as string;

  const [divisions, setDivisions] = useState<DivisionRef[]>([]);
  const [tags, setTags] = useState<TagRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<ResearchFormValues>(EMPTY_RESEARCH_FORM);

  const canManage = user?.role === 'SUPER_ADMIN' || user?.role === 'BOARD';

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  const fetchData = useCallback(async () => {
    try {
      const [researchRes, divisionsRes, tagsRes] = await Promise.all([
        api.getResearchAdminById(id),
        api.getDivisions(),
        api.getTags(),
      ]);
      const payload = researchRes as { research?: ResearchDetail };
      const research = payload.research ?? (researchRes as ResearchDetail);

      setFormData({
        title: research.title || '',
        titleIndonesian: research.titleIndonesian || '',
        slug: research.slug || '',
        abstract: research.abstract || '',
        abstractIndonesian: research.abstractIndonesian || '',
        researchType: research.researchType || 'RESEARCH_PROJECT',
        researchStatus: research.researchStatus || 'DRAFT',
        authors: authorsToText(research.authors),
        publicationDate: toDateInputValue(research.publicationDate),
        venue: research.venue || '',
        doi: research.doi || '',
        url: research.url || '',
        keywords: research.keywords || '',
        citationFormat: research.citationFormat || 'APA',
        pdfUrl: research.pdfUrl || '',
        imageUrl: research.imageUrl || '',
        divisionId: research.division?.id || '',
        published: research.published || false,
        metaTitle: research.metaTitle || '',
        metaDescription: research.metaDescription || '',
        metaKeywords: research.metaKeywords || '',
        scheduledPublishAt: toDateInputValue(research.scheduledPublishAt),
        selectedTags: research.tags?.map((tag) => tag.id) || [],
      });
      setDivisions(unwrapList<DivisionRef>(divisionsRes, 'divisions'));
      setTags(unwrapList<TagRef>(tagsRes, 'tags'));
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await api.updateResearch(id, buildResearchPayload(formData));
      showSuccess('Research changes saved');
      router.push(`/dashboard/admin/research/${id}`);
    } catch (error) {
      showError(errorMessage(error, 'Could not save research'));
      setSubmitting(false);
    }
  };

  const showSkeleton = (isLoading || loading) && (isLoading || canManage);

  if (showSkeleton) {
    return <PageLoading label="Loading research…" />;
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
        eyebrow="Research"
        title="Edit research"
        description={formData.title || 'Update the details of existing research.'}
        icon={FlaskConical}
        backHref={`/dashboard/admin/research/${id}`}
        backLabel="Back to research detail"
      />

      <ResearchForm
        values={formData}
        onChange={(patch) => setFormData((current) => ({ ...current, ...patch }))}
        onSubmit={handleSubmit}
        divisions={divisions}
        tags={tags}
        submitting={submitting}
        cancelHref={`/dashboard/admin/research/${id}`}
        submitLabel="Save changes"
        idPrefix="research"
      />
    </PageStack>
  );
}
