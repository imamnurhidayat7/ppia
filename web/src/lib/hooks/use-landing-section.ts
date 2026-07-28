'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import type { LandingSection, SectionBlock } from '@/lib/api-types';

/**
 * Hook to fetch a landing page section by key from the CMS API.
 * Falls back gracefully if the API is unavailable.
 */
export function useLandingSection(key: string, initial?: LandingSection | null) {
  const [section, setSection] = useState<LandingSection | null>(initial ?? null);
  // When the server already resolved this section, skip the client round-trip.
  const [loading, setLoading] = useState(initial == null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Seeded from the server — nothing to fetch on the client.
    if (initial != null) return;

    let mounted = true;

    async function fetchSection() {
      try {
        setLoading(true);
        const res = await api.getLandingSectionByKey(key);
        if (mounted && res.success && res.data) {
          setSection(res.data);
        }
      } catch (err) {
        // Silently fail - sections will use fallback content
        if (mounted) setError(err as Error);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchSection();

    return () => {
      mounted = false;
    };
    // `initial` is only read to decide whether to fetch at all; it is a stable
    // server-provided prop, so it does not belong in the re-fetch trigger list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { section, loading, error };
}

/**
 * Hook to fetch all landing page sections at once.
 * Useful for the public landing page to get all content in one call.
 */
export function useLandingSections() {
  const [sections, setSections] = useState<LandingSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchSections() {
      try {
        setLoading(true);
        const res = await api.getLandingSections();
        if (mounted && res.success && res.data) {
          setSections(res.data);
        }
      } catch (err) {
        if (mounted) setError(err as Error);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchSections();

    return () => {
      mounted = false;
    };
  }, []);

  return { sections, loading, error };
}

/**
 * Helper to get a block of a specific type from a section.
 */
export function getBlockByType(
  blocks: SectionBlock[] | undefined,
  type: string
): SectionBlock | undefined {
  return blocks?.find((b) => b.type === type);
}

/**
 * Helper to get all blocks of a specific type from a section.
 */
export function getBlocksByType(
  blocks: SectionBlock[] | undefined,
  type: string
): SectionBlock[] {
  return blocks?.filter((b) => b.type === type) || [];
}

/**
 * Helper to get a block field value with fallback.
 */
export function getBlockField(
  block: SectionBlock | undefined,
  field: keyof SectionBlock,
  fallback: string = ''
): string {
  const value = block?.[field];
  return typeof value === 'string' ? value : fallback;
}
