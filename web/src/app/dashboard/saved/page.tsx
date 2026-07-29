'use client';

/**
 * Reading list — articles the member has saved.
 *
 * Unsaving removes the card immediately rather than waiting for a refetch: the
 * member asked for it to be gone, and leaving it on screen looks like the action
 * failed. The list is reloaded on the next visit, so an optimistic removal that
 * the server later rejects self-corrects.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { BookmarkCheck, BookOpen, Calendar, Clock, User } from 'lucide-react';
import api from '@/lib/api';
import { formatDate, getImageUrl } from '@/lib/utils';
import { toPlainText } from '@/lib/sanitize-html';
import BookmarkButton from '@/components/BookmarkButton';
import { Button } from '@/components/ui';
import {
  EmptyBlock,
  LoadingRows,
  PageHeading,
  PageStack,
  SectionCard,
} from '@/components/dashboard';

interface SavedArticle {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  imageUrl?: string | null;
  category?: string | null;
  readingTime?: number | null;
  createdAt: string;
  User?: { name: string } | null;
}

interface SavedItem {
  id: string;
  savedAt: string;
  article: SavedArticle;
}

interface BookmarksResponse {
  bookmarks?: SavedItem[];
  pagination?: { page: number; limit: number; total: number; totalPages: number };
}

/** Reading time is stored in seconds; show whole minutes, never zero. */
function readingMinutes(seconds?: number | null): string {
  const value = seconds ? Math.max(1, Math.ceil(seconds / 60)) : 5;
  return `${value} min read`;
}

export default function SavedArticlesPage() {
  const [items, setItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSaved = useCallback(async () => {
    setLoading(true);
    try {
      const res = (await api.getBookmarks({ limit: 50 })) as BookmarksResponse;
      setItems(res.bookmarks ?? []);
      setError(null);
    } catch (err) {
      console.error('Failed to load saved articles:', err);
      setError('Could not load your reading list.');
    } finally {
      setLoading(false);
    }
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect --
     fetchSaved() only writes state after awaiting the network request; the
     linter cannot see past the await. */
  useEffect(() => {
    fetchSaved();
  }, [fetchSaved]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /**
   * On this page every card is saved by definition, so the toggle only ever
   * removes — which is why it drops the row instead of flipping an icon.
   */
  const handleUnsave = useCallback(async (articleId: string): Promise<boolean> => {
    setItems((current) => current.filter((item) => item.article.id !== articleId));
    try {
      await api.removeBookmark(articleId);
    } catch (err) {
      console.error('Failed to remove saved article:', err);
      // Restore the true state from the server rather than guessing.
      fetchSaved();
    }
    return false;
  }, [fetchSaved]);

  return (
    <PageStack>
      <PageHeading
        eyebrow="Your library"
        title="Saved articles"
        description="Articles you kept to read again later."
        icon={BookmarkCheck}
      />

      {loading ? (
        <LoadingRows rows={3} />
      ) : error ? (
        <SectionCard flush>
          <EmptyBlock
            icon={BookmarkCheck}
            title="Reading list unavailable"
            description={error}
            action={
              <Button variant="primary" onClick={fetchSaved}>
                Try again
              </Button>
            }
          />
        </SectionCard>
      ) : items.length === 0 ? (
        <SectionCard flush>
          <EmptyBlock
            icon={BookmarkCheck}
            title="Nothing saved yet"
            description="Use the bookmark button on any article to keep it here."
            action={
              <Link href="/dashboard/articles">
                <Button variant="primary">Browse articles</Button>
              </Link>
            }
          />
        </SectionCard>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const article = item.article;
            const image = getImageUrl(article.imageUrl);
            const excerpt = article.excerpt ? toPlainText(article.excerpt) : '';

            return (
              <Link
                key={item.id}
                href={`/dashboard/articles/${article.slug}`}
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
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <BookOpen aria-hidden="true" className="h-10 w-10 ink-muted opacity-50" />
                      </div>
                    )}
                    {article.category && (
                      /* Stamped classification rather than a pill. */
                      <span className="data-type absolute left-3 top-3 rounded-[3px] bg-[#0B1C2E]/90 px-2 py-1 text-[12px] font-bold uppercase text-white backdrop-blur-sm">
                        {article.category}
                      </span>
                    )}
                    <div className="absolute right-2 top-2 rounded-[3px] bg-white/90 backdrop-blur-sm dark:bg-slate-900/90">
                      <BookmarkButton
                        articleId={article.id}
                        saved
                        onToggle={handleUnsave}
                      />
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="line-clamp-2 font-display text-base font-bold leading-snug ink-strong transition-colors group-hover:text-[#C41E16] dark:group-hover:text-[#FF8A84]">
                      {article.title}
                    </h3>
                    {excerpt && (
                      <p className="mb-4 mt-2 line-clamp-3 text-sm leading-relaxed ink-body">
                        {excerpt}
                      </p>
                    )}
                    {/* Byline, reading time and save date: the card's log entry. */}
                    <div className="mt-auto pt-3">
                      <span aria-hidden="true" className="rope-rule mb-3 block opacity-60" />
                      <div className="data-type flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px] ink-muted">
                        {article.User?.name && (
                          <span className="inline-flex items-center gap-1">
                            <User aria-hidden="true" className="h-3 w-3" />
                            {article.User.name}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1">
                          <Clock aria-hidden="true" className="h-3 w-3" />
                          {readingMinutes(article.readingTime)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Calendar aria-hidden="true" className="h-3 w-3" />
                          Saved{' '}
                          {formatDate(item.savedAt, {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
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
