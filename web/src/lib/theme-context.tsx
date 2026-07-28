'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'ppia-theme';

/**
 * Inline script injected into <head> so the correct theme class is present on
 * the very first paint. Without it the page flashes light before React mounts.
 * Kept in sync with `resolve()` below.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var k='${THEME_STORAGE_KEY}';var p=localStorage.getItem(k);var m=window.matchMedia('(prefers-color-scheme: dark)').matches;var d=p==='dark'||((!p||p==='system')&&m);document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light';}catch(e){}})();`;

interface ThemeContextValue {
  /** What the user picked: light, dark, or follow the OS. */
  preference: ThemePreference;
  /** What is actually rendered right now. */
  theme: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
  /** Flips between light and dark, leaving "system" behind. */
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function systemPrefersDark(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function resolve(preference: ThemePreference): ResolvedTheme {
  if (preference === 'system') return systemPrefersDark() ? 'dark' : 'light';
  return preference;
}

function applyTheme(theme: ResolvedTheme) {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Server render and first client render must agree, so start from the
  // default and reconcile inside the effect below.
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [theme, setTheme] = useState<ResolvedTheme>('light');

  /* eslint-disable react-hooks/set-state-in-effect --
     Reading the persisted preference has to happen after mount: a lazy
     initialiser would make the server and client render different values and
     break hydration. THEME_INIT_SCRIPT already painted the right theme, so this
     only syncs React state with what the DOM already shows. */
  useEffect(() => {
    let stored: ThemePreference | null = null;
    try {
      const raw = localStorage.getItem(THEME_STORAGE_KEY);
      if (raw === 'light' || raw === 'dark' || raw === 'system') stored = raw;
    } catch {
      // localStorage can be unavailable (private mode, blocked cookies)
    }
    const initial = stored ?? 'system';
    setPreferenceState(initial);
    const resolved = resolve(initial);
    setTheme(resolved);
    applyTheme(resolved);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Follow the OS while the preference is "system".
  useEffect(() => {
    if (preference !== 'system') return;
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      const resolved: ResolvedTheme = query.matches ? 'dark' : 'light';
      setTheme(resolved);
      applyTheme(resolved);
    };
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, [preference]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Non-fatal: the theme still applies for this session
    }
    const resolved = resolve(next);
    setTheme(resolved);
    applyTheme(resolved);
  }, []);

  const toggleTheme = useCallback(() => {
    setPreference(resolve(preference) === 'dark' ? 'light' : 'dark');
  }, [preference, setPreference]);

  const value = useMemo(
    () => ({ preference, theme, setPreference, toggleTheme }),
    [preference, theme, setPreference, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
