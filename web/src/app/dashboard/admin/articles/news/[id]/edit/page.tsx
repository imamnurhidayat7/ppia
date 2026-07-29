'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import { useToast } from '@/components/Toast';
import { AccessDenied, PageHeading, PageLoading, PageStack } from '@/components/dashboard';
import { Newspaper } from 'lucide-react';
import { ArticleForm } from '../../../_components/article-form';
import type {
  AdminArticle,
  ArticleFormValues,
  DivisionRef,
  TagRef,
} from '../../../_components/shared';
import { EMPTY_ARTICLE_FORM, errorMessage, unwrapList } from '../../../_components/shared';

export default function EditNewsArticlePage() {
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
      const [divisionsRes, tagsRes, articleRes] = await Promise.all([
        api.getDivisions(),
        api.getTags(),
        api.getArticleAdmin(id),
      ]);
      setDivisions(unwrapList<DivisionRef>(divisionsRes, 'divisions'));
      setTags(unwrapList<TagRef>(tagsRes, 'tags'));

      const payload = articleRes as { article?: AdminArticle };
      const article = payload.article ?? (articleRes as AdminArticle);

      setFormData({
        title: article.title || '',
        slug: article.slug || '',
        excerpt: article.excerpt || '',
        content: typeof article.content === 'string' ? article.content : '',
        imageUrl: article.imageUrl || '',
        divisionId: article.division?.id || article.divisionId || '',
        published: article.published || false,
        isFeatured: article.isFeatured || false,
        featuredOrder: article.featuredOrder || 0,
        metaTitle: article.metaTitle || '',
        metaDescription: article.metaDescription || '',
        metaKeywords: article.metaKeywords || '',
        selectedTags: article.tags?.map((tag) => tag.id) || [],
      });
    } catch (error) {
      showError(errorMessage(error, 'Could not load news item'));
      router.push('/dashboard/admin/articles/news');
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
      };

      await api.updateArticle(id, data);
      showSuccess('News changes saved');
      router.push('/dashboard/admin/articles/news');
    } catch (error) {
      showError(errorMessage(error, 'Could not update news item'));
      setSubmitting(false);
    }
  };

  const showSkeleton = (isLoading || loading) && (isLoading || canManage);

  if (showSkeleton) {
    return <PageLoading label="Loading news item…" />;
  }

  if (!canManage) {
    return (
      <AccessDenied
        message="Managing news is only for Super Admin and Board."
        backHref="/dashboard"
      />
    );
  }

  return (
    <PageStack>
      <PageHeading
        eyebrow="News"
        title="Edit news item"
        description={formData.title || 'Update the details of an existing news item.'}
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
        submitLabel="Save changes"
        idPrefix="news"
        noun="news item"
        contentPlaceholder="Write the news body here…"
      />
    </PageStack>
  );
}
