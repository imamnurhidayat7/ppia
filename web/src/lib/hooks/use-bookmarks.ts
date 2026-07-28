'use client';

/**
 * Tracks which articles the signed-in member has saved.
 *
 * A page loads the set of saved ids once, then every card can render its save
 * button in the right state without a request of its own. Toggling updates the
 * local set immediately and reverts if the server rejects it, so the button
 * responds at the speed of a click rather than the speed of the network.
 */

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export interface UseBookmarksResult {
  /** True while the initial set is being fetched. */
  loading: boolean;
  isSaved: (articleId: string) => boolean;
  /** Resolves to the new saved state. */
  toggle: (articleId: string) => Promise<boolean>;
  /** Number of saved articles known to this hook. */
  count: number;
}

export function useBookmarks(): UseBookmarksResult {
  const { user } = useAuth();
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Signed-out visitors have no reading list; skip the request entirely so the
    // marketing pages do not fire a guaranteed 401.
    if (!user) {
      setSavedIds(new Set());
      return;
    }

    let cancelled = false;
    setLoading(true);

    api
      .getBookmarkedArticleIds()
      .then((res) => {
        if (!cancelled) setSavedIds(new Set(res.articleIds ?? []));
      })
      .catch((err) => {
        console.error('Failed to load saved articles:', err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const isSaved = useCallback((articleId: string) => savedIds.has(articleId), [savedIds]);

  const toggle = useCallback(
    async (articleId: string): Promise<boolean> => {
      const wasSaved = savedIds.has(articleId);
      const nextSaved = !wasSaved;

      // Optimistic update.
      setSavedIds((current) => {
        const next = new Set(current);
        if (nextSaved) next.add(articleId);
        else next.delete(articleId);
        return next;
      });

      try {
        if (nextSaved) await api.addBookmark(articleId);
        else await api.removeBookmark(articleId);
        return nextSaved;
      } catch (err) {
        console.error('Failed to update saved articles:', err);
        // Put it back the way it was.
        setSavedIds((current) => {
          const next = new Set(current);
          if (wasSaved) next.add(articleId);
          else next.delete(articleId);
          return next;
        });
        return wasSaved;
      }
    },
    [savedIds]
  );

  return { loading, isSaved, toggle, count: savedIds.size };
}

export default useBookmarks;
