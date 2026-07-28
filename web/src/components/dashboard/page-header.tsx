'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  variant?: 'default' | 'gradient';
  className?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  backHref,
  backLabel = 'Back',
  variant = 'default',
  className,
}: PageHeaderProps) {
  if (variant === 'gradient') {
    return (
      <div className={cn('space-y-4', className)}>
        {backHref && (
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#1A2B4A] dark:text-slate-100 dark:hover:text-slate-100 transition-colors group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
            {backLabel}
          </Link>
        )}
        <div className="bg-gradient-to-br from-[#0D1B33] via-[#1A2B4A] to-[#0D1B33] rounded-2xl p-6 md:p-8 text-white shadow-lg shadow-slate-200/50 dark:shadow-black/30 relative overflow-hidden">
          <div
            className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10 pointer-events-none"
            style={{
              background: 'radial-gradient(circle, #E8231A, transparent 70%)',
            }}
          />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-black leading-tight" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                {title}
              </h1>
              {description && (
                <p className="text-white/70 text-sm md:text-base mt-1.5">{description}</p>
              )}
            </div>
            {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4',
        className
      )}
    >
      {backHref && (
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#1A2B4A] dark:text-slate-100 dark:hover:text-slate-100 transition-colors group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          {backLabel}
        </Link>
      )}
      <div className="flex-1">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{title}</h1>
        {description && (
          <p className="mt-1 text-slate-500 dark:text-slate-400">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-3">{actions}</div>
      )}
    </div>
  );
}