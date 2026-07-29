'use client';
import { toPlainText } from '@/lib/sanitize-html';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, Calendar, Clock, FileText, Newspaper, User } from 'lucide-react';
import api from '@/lib/api';
import { formatDate, getImageUrl } from '@/lib/utils';
import BookmarkButton from '@/components/BookmarkButton';
import { useBookmarks } from '@/lib/hooks/use-bookmarks';
import {
  EmptyBlock,
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

/** Shape of one row in the `GET /articles` payload that this page relies on. */
interface ArticleApiItem {
  id: string;
  slug?: string;
  title: string;
  excerpt?: string | null;
  imageUrl?: string | null;
  category?: string | null;
  createdAt: string;
  readingTime?: number | null;
  User?: { name?: string | null } | null;
}

interface ArticlesApiResponse {
  articles?: ArticleApiItem[];
}

interface Post {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  imageUrl?: string;
  category: string;
  date: string;
  readTime: string;
  author: string;
}

type CategoryFilter = 'All' | 'News' | 'Articles';

const CATEGORY_LABELS: Record<string, string> = {
  News: 'News',
  Articles: 'Articles',
};

function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, '').trim();
}

export default function DashboardArticlesPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<CategoryFilter>('All');
  const [search, setSearch] = useState('');

  const fetchArticles = useCallback(async () => {
    try {
      const res = (await api.getArticles({ limit: 50 })) as ArticlesApiResponse;
      const items = Array.isArray(res.articles) ? res.articles : [];
      setPosts(
        items.map((article) => ({
          id: article.id,
          slug: article.slug || slugify(article.title),
          title: article.title,
          excerpt: toPlainText(article.excerpt),
          imageUrl: article.imageUrl || undefined,
          category: article.category || 'News',
          // Log-entry form: 05 Mar 2025.
          date: formatDate(article.createdAt, {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          }),
          readTime: article.readingTime
            ? `${Math.max(1, Math.ceil(article.readingTime / 60))} min read`
            : '3 min read',
          author: article.User?.name || 'PPIA Auckland',
        }))
      );
    } catch (error) {
      console.error('Failed to fetch articles:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect --
     fetchArticles() only writes state after awaiting the network request; the
     linter cannot see past the await. */
  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // One source of truth for every save button on this page.
  const { isSaved, toggle } = useBookmarks();

  const counts = useMemo(
    () => ({
      All: posts.length,
      News: posts.filter((post) => post.category === 'News').length,
      Articles: posts.filter((post) => post.category === 'Articles').length,
    }),
    [posts]
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return posts.filter((post) => {
      if (filter !== 'All' && post.category !== filter) return false;
      if (!query) return true;
      return (
        post.title.toLowerCase().includes(query) ||
        stripHtml(post.excerpt).toLowerCase().includes(query) ||
        post.author.toLowerCase().includes(query)
      );
    });
  }, [posts, filter, search]);

  const hasFilters = filter !== 'All' || search.trim().length > 0;

  const resetFilters = () => {
    setFilter('All');
    setSearch('');
  };

  return (
    <PageStack>
      <PageHeading
        eyebrow="Community reading"
        title="News & articles"
        description="Latest updates and writing from PPIA Auckland members."
        icon={Newspaper}
      />

      <StatTileRow columns={3}>
        <StatTile
          label="All"
          value={counts.All}
          tone="slate"
          icon={BookOpen}
          active={filter === 'All'}
          onClick={() => setFilter('All')}
        />
        <StatTile
          label="News"
          value={counts.News}
          tone="red"
          icon={Newspaper}
          active={filter === 'News'}
          onClick={() => setFilter('News')}
        />
        <StatTile
          label="Articles"
          value={counts.Articles}
          tone="violet"
          icon={FileText}
          active={filter === 'Articles'}
          onClick={() => setFilter('Articles')}
        />
      </StatTileRow>

      <Toolbar>
        <SearchField
          value={search}
          onChange={setSearch}
          placeholder="Search by title, summary, or author…"
          ariaLabel="Search articles"
        />
        {hasFilters && <ResetFiltersButton onClick={resetFilters} />}
      </Toolbar>

      {loading ? (
        <LoadingCards count={6} columns={3} />
      ) : filtered.length === 0 ? (
        <SectionCard flush>
          <EmptyBlock
            icon={BookOpen}
            title={hasFilters ? 'No matching articles' : 'No articles yet'}
            description={
              hasFilters
                ? 'Try another keyword or clear the filters to see everything.'
                : 'Community writing will appear here once it is published.'
            }
          />
        </SectionCard>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((post) => {
            const image = getImageUrl(post.imageUrl);
            const excerpt = stripHtml(post.excerpt);
            return (
              <Link
                key={post.id}
                href={`/dashboard/articles/${post.slug}`}
                className="group block h-full"
              >
                <SectionCard
                  flush
                  bodyClassName="flex h-full flex-col"
                  className="h-full transition-all hover:-translate-y-0.5 hover:border-[#C3D2E0] hover:shadow-lg dark:hover:border-slate-700"
                >
                  <div className="relative h-40 overflow-hidden bg-[#EDF5FB] dark:bg-slate-800">
                    {image ? (
                      <Image
                        src={image}
                        alt=""
                        fill
                        // Three columns at desktop, two at tablet, one on phones —
                        // tells the optimiser which width to actually serve.
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <BookOpen aria-hidden="true" className="h-10 w-10 ink-muted opacity-50" />
                      </div>
                    )}
                    {/* Category reads as a stamped classification, not a pill. */}
                    <span className="data-type absolute left-3 top-3 rounded-[3px] bg-[#0B1C2E]/90 px-2 py-1 text-[12px] font-bold uppercase text-white backdrop-blur-sm">
                      {categoryLabel(post.category)}
                    </span>
                    {/* Sits on the image so it does not compete with the title.
                        The button stops the click from reaching the card link. */}
                    <div className="absolute right-2 top-2 rounded-[3px] bg-white/90 backdrop-blur-sm dark:bg-slate-900/90">
                      <BookmarkButton
                        articleId={post.id}
                        saved={isSaved(post.id)}
                        onToggle={toggle}
                      />
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="line-clamp-2 font-display text-base font-bold leading-snug ink-strong transition-colors group-hover:text-[#C41E16] dark:group-hover:text-[#FF8A84]">
                      {post.title}
                    </h3>
                    {excerpt && (
                      <p className="mb-4 mt-2 line-clamp-3 text-sm leading-relaxed ink-body">
                        {excerpt}
                      </p>
                    )}
                    {/* Byline, date and reading time are the card's log entry. */}
                    <div className="mt-auto pt-3">
                      <span aria-hidden="true" className="rope-rule mb-3 block opacity-60" />
                      <div className="data-type flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px] ink-muted">
                        <span className="inline-flex items-center gap-1">
                          <User aria-hidden="true" className="h-3 w-3" />
                          {post.author}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Calendar aria-hidden="true" className="h-3 w-3" />
                          {post.date}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock aria-hidden="true" className="h-3 w-3" />
                          {post.readTime}
                        </span>
                      </div>
                    </div>
                  </div>
                </SectionCard>
              </Link>
            );
          })}
        </div>
      )}
    </PageStack>
  );
}
