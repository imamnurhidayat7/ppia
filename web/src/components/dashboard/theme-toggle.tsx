'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme, type ThemePreference } from '@/lib/theme-context';
import { cn } from '@/lib/utils';

const OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Terang', icon: Sun },
  { value: 'dark', label: 'Gelap', icon: Moon },
  { value: 'system', label: 'Sistem', icon: Monitor },
];

/** Segmented Light / Dark / System control. */
export function ThemeToggle({ className }: { className?: string }) {
  const { preference, setPreference } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Tema tampilan"
      className={cn(
        'inline-flex items-center gap-0.5 rounded-lg border border-white/10 bg-white/5 p-0.5',
        className
      )}
    >
      {OPTIONS.map((option) => {
        const active = preference === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={option.label}
            title={option.label}
            onClick={() => setPreference(option.value)}
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-md transition-colors',
              active
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-400 hover:bg-white/10 hover:text-white'
            )}
          >
            <option.icon className="h-3.5 w-3.5" />
          </button>
        );
      })}
    </div>
  );
}

/** Single-button variant for tight spaces (topbar). */
export function ThemeToggleButton({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
      title={isDark ? 'Mode terang' : 'Mode gelap'}
      /*
        This button only ever sits on the dark masthead, so it is a bare icon in
        the masthead's own link colours. It used to carry the light card styling
        (white fill, slate border), which put a white tile on a navy bar in
        light mode.
      */
      className={cn(
        'flex h-9 w-9 items-center justify-center text-[#94A3B8] transition-colors hover:text-white',
        className
      )}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
