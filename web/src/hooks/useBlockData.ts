'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export interface BlockDataSource {
  type: 'events' | 'articles' | 'divisions' | 'faq' | 'media' | 'candidates';
  filter?: string;
  limit?: number;
  category?: string;
}

export interface UseBlockDataResult {
  data: any[] | null;
  loading: boolean;
  error: string | null;
}

export function useBlockData(dataSource?: BlockDataSource | null): UseBlockDataResult {
  const [data, setData] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const type = dataSource?.type;
  const filter = dataSource?.filter;
  const limit = dataSource?.limit;
  const category = dataSource?.category;

  useEffect(() => {
    if (!type) {
      setData(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    api
      .getBlockData({
        type,
        filter: filter || undefined,
        limit: limit || undefined,
        category: category || undefined,
      })
      .then((result: any[]) => {
        if (cancelled) return;
        setData(result);
        setLoading(false);
      })
      .catch((err: any) => {
        if (cancelled) return;
        setError(err?.message ?? 'Failed to fetch data');
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [type, filter, limit, category]);

  return { data, loading, error };
}
