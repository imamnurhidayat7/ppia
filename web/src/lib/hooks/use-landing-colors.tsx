'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '@/lib/api';
import type { ColorConfig } from '@/lib/api-types';

interface LandingColorsContextType {
  colors: ColorConfig;
  loading: boolean;
}

const defaultColors: ColorConfig = {
  primary: '#1A2B4A',
  accent: '#E8231A',
  textAccent: '#E8231A',
  buttonPrimary: '#E8231A',
  buttonSecondary: '#1A2B4A',
};

const LandingColorsContext = createContext<LandingColorsContextType>({
  colors: defaultColors,
  loading: true,
});

export function LandingColorsProvider({ children }: { children: ReactNode }) {
  const [colors, setColors] = useState<ColorConfig>(defaultColors);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadColors() {
      try {
        const res = await api.getSiteConfigByKey('colors');
        if (!cancelled && res.success && res.data?.config) {
          setColors({ ...defaultColors, ...(res.data.config as ColorConfig) });
        }
      } catch (err) {
        /**
         * A missing `colors` config is a normal state, not a failure: the theme
         * has never been customised and `defaultColors` is exactly what should
         * apply. The API answers 404 for that, which the old catch-all reported
         * as "Failed to load colors: {}" — an error overlay in development, and
         * an unhelpful message either way, since an Axios error's own
         * properties are not enumerable so it serialised to an empty object.
         *
         * Only log when something genuinely went wrong.
         */
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status !== 404) {
          const detail =
            err instanceof Error ? err.message : typeof err === 'string' ? err : 'unknown error';
          console.error(
            `Could not load the colour theme (${status ?? 'no response'}): ${detail}. Falling back to the default palette.`
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadColors();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <LandingColorsContext.Provider value={{ colors, loading }}>
      {children}
    </LandingColorsContext.Provider>
  );
}

export function useLandingColors() {
  return useContext(LandingColorsContext);
}

// Helper to get color with fallback
export function getColor(color: string | undefined, fallback: string): string {
  return color || fallback;
}
