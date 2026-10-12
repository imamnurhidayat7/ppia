'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import type { MenuItemResponse } from '@/lib/api-types';
import { readPublicCache, writePublicCache, fetchWithRetry } from '@/lib/client-cache';

/**
 * Hook to fetch menu items from the CMS API.
 *
 * Stale-while-revalidate: the last good payload paints instantly from
 * localStorage (no wrong-menu flash on reload) while a background fetch
 * refreshes it. Falls back gracefully if the API is unavailable.
 */
export function useMenuItems(key: string = 'header') {
  const [menu, setMenu] = useState<MenuItemResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const cacheKey = `menu:${key}`;

    async function fetchMenu() {
      try {
        const res = await fetchWithRetry(() => api.getMenuItem(key));
        // Public endpoint returns `{ success, data }`; unwrap it so callers
        // always receive the MenuItemResponse itself. Fall back to the raw
        // payload for forward-compatibility if the shape ever changes.
        const unwrapped = (res as { data?: MenuItemResponse })?.data
          ?? (res as unknown as MenuItemResponse);
        // Only accept payloads that actually look like a menu; otherwise
        // leave the cached (or null) value in place.
        if (mounted && unwrapped && typeof unwrapped === 'object' && 'items' in unwrapped) {
          setMenu(unwrapped as MenuItemResponse);
          writePublicCache(cacheKey, unwrapped);
        }
      } catch (err) {
        // Silent fail — the cached menu (or the caller's fallback) stays.
        console.warn(`Failed to fetch menu "${key}":`, err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    // Paint instantly when we have a previous payload; the fetch above
    // reconciles it. State is only written after mount, so SSR hydration
    // (which renders the fallback) never mismatches.
    const cached = readPublicCache<MenuItemResponse>(cacheKey);
    if (cached) {
      setMenu(cached);
      setLoading(false);
    }
    fetchMenu();

    return () => {
      mounted = false;
    };
  }, [key]);

  return { menu, loading };
}
