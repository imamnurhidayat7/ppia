'use client';

import { useCallback } from 'react';
import { Newspaper } from 'lucide-react';
import api from '@/lib/api';
import { ArticleListPage } from '../_components/article-list-page';
import type { AdminArticle } from '../_components/shared';
import { unwrapList } from '../_components/shared';

/**
 * News shares the same list scaffold as research and general content, so this
 * page only picks the data source and the copy.
 */
export default function NewsArticlesPage() {
  const fetchItems = useCallback(async (search: string) => {
    const res = await api.getArticlesAdmin({
      search,
      category: 'News',
      status: 'all',
      // The endpoint defaults to a limit of 10; without this the tile counts and
      // the client side pagination only ever see the first page.
      limit: 1000,
    });
    return unwrapList<AdminArticle>(res, 'articles');
  }, []);

  const deleteItem = useCallback(async (item: AdminArticle) => {
    await api.deleteArticle(item.id);
  }, []);

  return (
    <ArticleListPage
      eyebrow="Content"
      title="Manage news"
      icon={Newspaper}
      noun="news item"
      newHref="/dashboard/admin/articles/news/new"
      newLabel="New news item"
      editHref={(item) => `/dashboard/admin/articles/news/${item.id}/edit`}
      publicHref={(item) => `/activities/news-articles/${item.slug}`}
      fetchItems={fetchItems}
      deleteItem={deleteItem}
      deniedMessage="Managing news is only for Super Admin and Board."
      emptyTitle="No news yet"
      emptyDescription="Create the first news item so the latest updates show on the site."
      searchPlaceholder="Search title, slug, or excerpt…"
    />
  );
}
