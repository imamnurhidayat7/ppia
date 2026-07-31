'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import { useToast } from '@/components/Toast';
import { AccessDenied, PageHeading, PageLoading, PageStack } from '@/components/dashboard';
import { Newspaper } from 'lucide-react';
import { ArticleForm } from '../../_components/article-form';
import type { ArticleFormValues, DivisionRef, TagRef } from '../../_components/shared';
import { EMPTY_ARTICLE_FORM, errorMessage, unwrapList } from '../../_components/shared';

export default function NewNewsArticlePage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const { showError, showSuccess } = useToast();

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
      };

      await api.createArticle({ ...data, category: 'News' });
      showSuccess(
        formData.published ? 'News item created and published' : 'News item saved as a draft'
      );
      router.push('/dashboard/admin/articles/news');
    } catch (error) {
      showError(errorMessage(error, 'Could not create news item'));
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
        message="Creating news is only for Super Admin and Board."
        backHref="/dashboard"
      />
    );
  }

  return (
    <PageStack>
      <PageHeading
        eyebrow="News"
        title="New news item"
        description="Fill in the news details, then save it as a draft or publish it right away."
        icon={Newspaper}
        backHref="/dashboard/admin/articles/news"
        backLabel="Back to news"
      />

      <ArticleForm
        values={formData}
        onChange={(patch) => setFormData((current) => ({ ...current, ...patch }))}
        onSubmit={handleSubmit}
        divisions={divisions}
        tags={tags}
        submitting={submitting}
        cancelHref="/dashboard/admin/articles/news"
        submitLabel={formData.published ? 'Save and publish' : 'Save draft'}
        idPrefix="news"
        category="News"
        noun="news item"
        contentPlaceholder="Write the news body here…"
      />
    </PageStack>
  );
}
