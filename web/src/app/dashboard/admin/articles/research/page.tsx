'use client';

import { useCallback } from 'react';
import { BookOpen } from 'lucide-react';
import api from '@/lib/api';
import { ArticleListPage } from '../_components/article-list-page';
import type { AdminArticle } from '../_components/shared';
import { unwrapList } from '../_components/shared';

/**
 * Row shape returned by the /research endpoint. Its field names differ from the
 * article ones, so they are mapped onto `AdminArticle` to share the table.
 */
interface ResearchRow extends AdminArticle {
  abstract?: string;
  viewCount?: number;
  mainAuthor?: { name?: string };
}

export default function ResearchCornerPage() {
  const fetchItems = useCallback(async () => {
    // The admin endpoint (drafts included) defaults to a limit of 10; without
    // this the client side counts only ever see the first page.
    const res = await api.getResearchAdmin({ limit: 1000 });
    return unwrapList<ResearchRow>(res, 'researches').map((row) => ({
      ...row,
      excerpt: row.excerpt || row.abstract || '',
      views: row.views ?? row.viewCount ?? 0,
      author: row.author ?? row.mainAuthor,
    }));
  }, []);

  const deleteItem = useCallback(async (item: AdminArticle) => {
    await api.deleteResearch(item.id);
  }, []);

  return (
    <ArticleListPage
      eyebrow="Content"
      title="Manage research corner"
      icon={BookOpen}
      noun="research item"
      newHref="/dashboard/admin/articles/research/new"
      newLabel="New research"
      editHref={(item) => `/dashboard/admin/articles/research/${item.id}/edit`}
      publicHref={(item) => `/activities/research-corner/${item.slug}`}
      fetchItems={fetchItems}
      deleteItem={deleteItem}
      deniedMessage="Managing research is only for Super Admin and Board."
      emptyTitle="No research yet"
      emptyDescription="Create the first research write-up so it shows in the research corner."
      searchPlaceholder="Search title, slug, or abstract…"
    />
  );
}
