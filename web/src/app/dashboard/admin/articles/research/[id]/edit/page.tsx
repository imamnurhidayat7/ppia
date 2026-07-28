'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import { useToast } from '@/components/Toast';
import { AccessDenied, PageHeading, PageLoading, PageStack } from '@/components/dashboard';
import { BookOpen } from 'lucide-react';
import { ArticleForm } from '../../../_components/article-form';
import type {
  AdminArticle,
  ArticleFormValues,
  DivisionRef,
  TagRef,
} from '../../../_components/shared';
import { EMPTY_ARTICLE_FORM, errorMessage, unwrapList } from '../../../_components/shared';

/** Research keeps its summary in `abstract`, not in `excerpt`. */
interface ResearchDetail extends AdminArticle {
  abstract?: string;
}

export default function EditResearchCornerPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const { showError, showSuccess } = useToast();
  const params = useParams();
  const id = params.id as string;

  const [divisions, setDivisions] = useState<DivisionRef[]>([]);
  const [tags, setTags] = useState<TagRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<ArticleFormValues>(EMPTY_ARTICLE_FORM);

  const canManage = user?.role === 'SUPER_ADMIN' || user?.role === 'BOARD';

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  const fetchData = useCallback(async () => {
    try {
      const [divisionsRes, tagsRes, researchRes] = await Promise.all([
        api.getDivisions(),
        api.getTags(),
        api.getResearchAdminById(id),
      ]);
      setDivisions(unwrapList<DivisionRef>(divisionsRes, 'divisions'));
      setTags(unwrapList<TagRef>(tagsRes, 'tags'));

      const payload = researchRes as { research?: ResearchDetail };
      const research = payload.research ?? (researchRes as ResearchDetail);

      setFormData({
        title: research.title || '',
        slug: research.slug || '',
        excerpt: research.excerpt || research.abstract || '',
        content: typeof research.content === 'string' ? research.content : '',
        imageUrl: research.imageUrl || '',
        divisionId: research.division?.id || research.divisionId || '',
        published: research.published || false,
        isFeatured: research.isFeatured || false,
        featuredOrder: research.featuredOrder || 0,
        metaTitle: research.metaTitle || '',
        metaDescription: research.metaDescription || '',
        metaKeywords: research.metaKeywords || '',
        selectedTags: research.tags?.map((tag) => tag.id) || [],
      });
    } catch (error) {
      showError(errorMessage(error, 'Could not load research'));
      router.push('/dashboard/admin/articles/research');
    } finally {
      setLoading(false);
    }
  }, [id, router, showError]);

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
    setSubmitting(true);
    try {
      const data = {
        title: formData.title,
        slug: formData.slug,
        excerpt: formData.excerpt,
        content: formData.content || {},
        imageUrl: formData.imageUrl,
        divisionId: formData.divisionId || undefined,
        published: formData.published,
        isFeatured: formData.isFeatured,
        featuredOrder: formData.featuredOrder,
        metaTitle: formData.metaTitle,
        metaDescription: formData.metaDescription,
        metaKeywords: formData.metaKeywords,
        tags: formData.selectedTags,
        // The create page stores the excerpt in `abstract`; without this the
        // abstract would never change. Only sent when it has content, so a long
        // abstract written in the full research form is never wiped.
        ...(formData.excerpt ? { abstract: formData.excerpt } : {}),
      };

      await api.updateResearch(id, data);
      showSuccess('Research changes saved');
      router.push('/dashboard/admin/articles/research');
    } catch (error) {
      showError(errorMessage(error, 'Could not update research'));
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
        eyebrow="Research corner"
        title="Edit research"
        description={formData.title || 'Update the details of an existing research item.'}
        icon={BookOpen}
        backHref="/dashboard/admin/articles/research"
        backLabel="Back to research"
      />

      <ArticleForm
        values={formData}
        onChange={(patch) => setFormData((current) => ({ ...current, ...patch }))}
        onSubmit={handleSubmit}
        divisions={divisions}
        tags={tags}
        submitting={submitting}
        cancelHref="/dashboard/admin/articles/research"
        submitLabel="Save changes"
        idPrefix="research"
        noun="research item"
        excerptLabel="Short abstract"
        excerptHint="Used as the research abstract and as the excerpt in the list."
        contentTitle="Research body"
        contentDescription="The full write-up that appears on the research corner page."
        contentPlaceholder="Write the research body here…"
      />
    </PageStack>
  );
}
