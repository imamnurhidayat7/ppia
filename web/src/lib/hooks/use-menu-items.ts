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
        const data = await api.getMenuItem(key);
        if (mounted) {
          setMenu(data);
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
