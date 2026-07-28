'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import { useToast } from '@/components/Toast';
import { AccessDenied, PageHeading, PageLoading, PageStack } from '@/components/dashboard';
import { FlaskConical } from 'lucide-react';
import { ResearchForm } from '../_components/research-form';
import type { DivisionRef, ResearchFormValues, TagRef } from '../_components/shared';
import {
  EMPTY_RESEARCH_FORM,
  buildResearchPayload,
  errorMessage,
  unwrapList,
} from '../_components/shared';

export default function NewResearchPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const { showError, showSuccess } = useToast();

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

  const fetchOptions = useCallback(async () => {
    try {
      const [divisionsRes, tagsRes] = await Promise.all([api.getDivisions(), api.getTags()]);
      setDivisions(unwrapList<DivisionRef>(divisionsRes, 'divisions'));
      setTags(unwrapList<TagRef>(tagsRes, 'tags'));
    } catch (error) {
      showError(errorMessage(error, 'Could not load divisions and tags'));
    } finally {
      setLoading(false);
    }
  }, [showError]);

  /* eslint-disable react-hooks/set-state-in-effect --
     fetchOptions() only writes state after awaiting the network, which is the
     intended fetch-on-mount; the linter cannot see past the call. */
  useEffect(() => {
    if (user && canManage) {
      fetchOptions();
    }
  }, [user, canManage, fetchOptions]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const result = (await api.createResearch(buildResearchPayload(formData))) as {
        research?: { id?: string };
      };
      showSuccess(
        formData.published ? 'Research created and published' : 'Research saved as a draft'
      );
      if (result?.research?.id) {
        router.push(`/dashboard/admin/research/${result.research.id}`);
      } else {
        router.push('/dashboard/admin/research');
      }
    } catch (error) {
      showError(errorMessage(error, 'Could not save research'));
      setSubmitting(false);
    }
  };

  const showSkeleton = (isLoading || loading) && (isLoading || canManage);

  if (showSkeleton) {
    return <PageLoading label="Preparing the form…" />;
  }

  if (!canManage) {
    return (
      <AccessDenied
        message="Creating research is only for Super Admin and Board."
        backHref="/dashboard"
      />
    );
  }

  return (
    <PageStack>
      <PageHeading
        eyebrow="Research"
        title="New research"
        description="Fill in the publication details, then save it as a draft or publish it right away."
        icon={FlaskConical}
        backHref="/dashboard/admin/research"
        backLabel="Back to research"
      />

      <ResearchForm
        values={formData}
        onChange={(patch) => setFormData((current) => ({ ...current, ...patch }))}
        onSubmit={handleSubmit}
        divisions={divisions}
        tags={tags}
        submitting={submitting}
        cancelHref="/dashboard/admin/research"
        submitLabel={formData.published ? 'Save and publish' : 'Save draft'}
        idPrefix="research"
        autoSlug
      />
    </PageStack>
  );
}
