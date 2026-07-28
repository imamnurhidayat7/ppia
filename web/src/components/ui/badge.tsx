'use client';

import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'outline';
  size?: 'sm' | 'md';
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      className,
      variant = 'default',
      size = 'sm',
      children,
      ...props
    },
    ref
  ) => {
    const variants = {
      default: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
      primary: 'bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300',
      success: 'bg-success-50 text-success-700 dark:bg-success-900/50 dark:text-success-300',
      warning: 'bg-amber-50 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
      danger: 'bg-danger-50 text-danger-700 dark:bg-danger-900/50 dark:text-danger-300',
      outline: 'bg-transparent border border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-400',
    };

    const sizes = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-2.5 py-1 text-sm',
    };

    return (
      <span
        ref={ref}
        className={cn(
          'badge inline-flex items-center rounded-md font-medium',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

// Status Dot Badge
export interface StatusBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  status: 'online' | 'offline' | 'away' | 'busy';
  label?: string;
  size?: 'sm' | 'md';
}

const StatusBadge = forwardRef<HTMLSpanElement, StatusBadgeProps>(
  (
    {
      className,
      status,
      label,
      size = 'sm',
      ...props
    },
    ref
  ) => {
    const statusColors = {
      online: 'bg-success-500',
      offline: 'bg-slate-400',
      away: 'bg-amber-500',
      busy: 'bg-danger-500',
    };

    const sizes = {
      sm: 'w-2 h-2',
      md: 'w-2.5 h-2.5',
    };

    return (
      <span
        ref={ref}
        className={cn('inline-flex items-center gap-1.5', className)}
        {...props}
      >
        <span className={cn('rounded-full', statusColors[status], sizes[size])} />
        {label && (
          <span className="text-xs text-slate-600 dark:text-slate-400 capitalize">{label}</span>
        )}
      </span>
    );
  }
);

StatusBadge.displayName = 'StatusBadge';

// Count Badge (notification count)
export interface CountBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  count?: number;
  max?: number;
}

const CountBadge = forwardRef<HTMLSpanElement, CountBadgeProps>(
  (
    {
      className,
      count = 0,
      max = 99,
      ...props
    },
    ref
  ) => {
    if (count === 0) return null;

    const displayCount = count > max ? `${max}+` : count;

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1',
          'rounded-full bg-danger-500 text-white text-xs font-bold',
          className
        )}
        {...props}
      >
        {displayCount}
      </span>
    );
  }
);

CountBadge.displayName = 'CountBadge';

export { Badge, StatusBadge, CountBadge };
