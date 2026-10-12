'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { getImageUrl } from '@/lib/utils';
import type { HeaderConfig, FooterConfig } from '@/lib/api-types';

/** Fallback brand mark while the CMS logo is loading or unset. */
export const DEFAULT_LOGO_SRC = '/Logo-PPIA-2025-White.png';
export const DEFAULT_LOGO_ALT = 'PPIA Auckland';

type SiteConfigKey = 'header' | 'footer';

interface SiteConfigEnvelope {
  success: boolean;
  data?: { config?: HeaderConfig & FooterConfig };
}

/**
 * Read one site-config record (header, footer, …) from the CMS API.
 *
 * The public endpoint answers `{ success, data: { config } }` — unwrapped
 * here so callers always receive the config object itself. Resolves to
 * `null` while loading or when the API is unreachable, so callers render
 * their fallback content instead of hanging.
 */
export function useSiteConfig<T extends HeaderConfig | FooterConfig>(key: SiteConfigKey) {
  const [config, setConfig] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchConfig() {
      try {
        const res = (await api.getSiteConfigByKey(key)) as SiteConfigEnvelope;
        const unwrapped = res?.data?.config ?? null;
        if (mounted) setConfig((unwrapped as T) ?? null);
      } catch (err) {
        // Silent fail — callers fall back to built-in branding.
        console.warn(`Failed to fetch site config "${key}":`, err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchConfig();

    return () => {
      mounted = false;
    };
  }, [key]);

  return { config, loading };
}

/**
 * Brand logo for the site chrome, driven by
 * Dashboard > System > Navigation menu > Header, footer, and colours.
 *
 * Upload a file or paste a URL there and it appears here on the next visit:
 * storage keys and relative paths resolve against the files host, absolute
 * URLs pass through untouched. Until then (loading, API down, never set)
 * the built-in logo renders, so the header is never empty.
 */
export function useSiteLogo(location: 'header' | 'footer') {
  const { config, loading } = useSiteConfig<HeaderConfig & FooterConfig>(location);

  if (loading || !config) {
    return { src: DEFAULT_LOGO_SRC, alt: DEFAULT_LOGO_ALT, loading };
  }
  const raw = config.logoUrl?.trim();
  return {
    src: raw ? (getImageUrl(raw) ?? raw) : DEFAULT_LOGO_SRC,
    alt: config.logoAlt?.trim() || DEFAULT_LOGO_ALT,
    loading,
  };
}
