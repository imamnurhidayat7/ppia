'use client';

import Link from 'next/link';
import { ArrowUpRight, TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sparkline } from './mini-chart';
import type { LucideIcon } from 'lucide-react';

export type KpiTone = 'navy' | 'red' | 'emerald' | 'violet' | 'amber' | 'sky';

const TONES: Record<KpiTone, { icon: string; spark: string }> = {
  navy: { icon: 'bg-[#1A2B4A] text-white', spark: '#1A2B4A' },
  red: { icon: 'bg-[#E8231A] text-white', spark: '#E8231A' },
  emerald: { icon: 'bg-emerald-500 text-white', spark: '#10B981' },
  violet: { icon: 'bg-violet-500 text-white', spark: '#8B5CF6' },
  amber: { icon: 'bg-amber-500 text-white', spark: '#F59E0B' },
  sky: { icon: 'bg-sky-500 text-white', spark: '#0EA5E9' },
};

export interface KpiCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  tone?: KpiTone;
  /** Short supporting line, e.g. "12 baru hari ini". */
  meta?: string;
  /** Percentage change; positive renders as an uptick. */
  delta?: number;
  deltaLabel?: string;
  /** Values for the inline sparkline. Omit to hide it. */
  trend?: number[];
  href?: string;
  isLoading?: boolean;
  className?: string;
}

function formatValue(value: number | string): string {
  if (typeof value === 'string') return value;
  return new Intl.NumberFormat('en-NZ').format(value);
}

export function KpiCard({
  label,
  value,
  icon: Icon,
  tone = 'navy',
  meta,
  delta,
  deltaLabel,
  trend,
  href,
  isLoading = false,
  className,
}: KpiCardProps) {
  const palette = TONES[tone];

  const body = (
    <div
      className={cn(
        'group relative h-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 transition-all',
        'dark:border-slate-800 dark:bg-slate-900',
        href && 'hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg dark:hover:border-slate-700',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {label}
          </p>
          {isLoading ? (
            <div className="mt-2 h-8 w-20 rounded skeleton" />
          ) : (
            <p className="mt-1.5 font-display text-3xl font-black leading-none text-slate-900 dark:text-slate-50">
              {formatValue(value)}
            </p>
          )}
        </div>
        <span
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105',
            palette.icon
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          {typeof delta === 'number' && !isLoading && (
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-bold',
                delta > 0
                  ? 'bg-success-50 text-success-700 dark:bg-success-900/40 dark:text-success-300'
                  : delta < 0
                    ? 'bg-danger-50 text-danger-700 dark:bg-danger-900/40 dark:text-danger-300'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              )}
            >
              {delta > 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : delta < 0 ? (
                <TrendingDown className="h-3 w-3" />
              ) : null}
              {delta > 0 ? '+' : ''}
              {delta}%
            </span>
          )}
          {(meta || deltaLabel) && (
            <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
              {meta || deltaLabel}
            </p>
          )}
        </div>
        {trend && trend.length > 1 && !isLoading && (
          <Sparkline values={trend} color={palette.spark} className="shrink-0" />
        )}
      </div>

      {href && (
        <ArrowUpRight className="absolute right-4 top-16 h-4 w-4 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100 dark:text-slate-600" />
      )}
    </div>
  );

  if (!href) return body;

  return (
    <Link href={href} className="block h-full focus-visible:outline-none">
      {body}
    </Link>
  );
}

export function KpiGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4', className)}>
      {children}
    </div>
  );
}
