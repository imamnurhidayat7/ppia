'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import type { MenuItemResponse } from '@/lib/api-types';

/**
 * Hook to fetch menu items from the CMS API.
 * Falls back gracefully if the API is unavailable.
 */
export function useMenuItems(key: string = 'header') {
  const [menu, setMenu] = useState<MenuItemResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchMenu() {
      try {
        const res = await api.getMenuItem(key);
        // Public endpoint returns `{ success, data }`; unwrap it so callers
        // always receive the MenuItemResponse itself. Fall back to the raw
        // payload for forward-compatibility if the shape ever changes.
        const unwrapped = (res as { data?: MenuItemResponse })?.data
          ?? (res as unknown as MenuItemResponse);
        if (mounted) {
          // Only accept payloads that actually look like a menu; otherwise
          // leave `menu` as null so callers use their fallback content.
          if (unwrapped && typeof unwrapped === 'object' && 'items' in unwrapped) {
            setMenu(unwrapped as MenuItemResponse);
          } else {
            setMenu(null);
          }
        }
      } catch (err) {
        // Silent fail — callers should use fallback nav items
        console.warn(`Failed to fetch menu "${key}":`, err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchMenu();

    return () => {
      mounted = false;
    };
  }, [key]);

  return { menu, loading };
}
