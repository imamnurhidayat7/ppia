'use client';

/**
 * Shared building blocks for every dashboard page.
 *
 * Before this existed each page hand-rolled its own header, card, table and
 * empty state, so spacing, radii, type scale and dark-mode colours drifted from
 * page to page. Pages should compose these instead of restyling from scratch.
 *
 * House rules baked in here:
 *  - surfaces: rounded-2xl, border-slate-200 / dark:border-slate-800
 *  - page title: font-display, text-2xl, font-black
 *  - section title: font-display, text-base, font-bold
 *  - body copy: text-sm, slate-500 / dark:slate-400
 *  - brand accent: #E8231A (actions), navy #0D1B33 (headers)
 */

import Link from 'next/link';
import { ArrowLeft, ChevronRight, Inbox, Loader2, Search, ShieldAlert, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui';

/* ------------------------------------------------------------------ layout */

export function PageStack({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn('animate-fade-in space-y-6', className)}>{children}</div>;
}

interface PageHeadingProps {
  title: string;
  description?: string;
  /** Small label above the title, e.g. a section name. */
  eyebrow?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  className?: string;
}

export function PageHeading({
  title,
  description,
  eyebrow,
  icon: Icon,
  actions,
  backHref,
  backLabel = 'Back',
  className,
}: PageHeadingProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {/*
        Sits close to the title and reads as a trail, not a button. The arrow
        gets its own bordered square so the control has a defined shape at rest —
        a bare icon plus text floating above a heading looked unfinished.
        `-ml-2` pulls it back to the container edge so the title stays the
        leftmost thing on the page.
      */}
      {backHref && (
        <Link
          href={backHref}
          className="group -ml-2 inline-flex items-center gap-2 rounded-lg py-1 pl-1 pr-2.5 text-[13px] font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-white transition-colors group-hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900">
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
          </span>
          {backLabel}
        </Link>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3.5">
          {/* Porthole marker, the same shape the public pages use for a heading
              icon, so a dashboard screen reads as part of the same site. */}
          {Icon && (
            <span
              className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#0B1C2E] text-white"
              style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.22), 0 0 0 4px rgba(11,28,46,0.10)' }}
            >
              <Icon className="h-5 w-5" />
            </span>
          )}
          <div className="min-w-0">
            {eyebrow && (
              <p className="data-type accent-label text-[12px] font-bold uppercase">{eyebrow}</p>
            )}
            <h1 className="font-display text-2xl font-black tracking-tight ink-strong">{title}</h1>
            {description && <p className="mt-1 text-sm ink-body">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 sm:shrink-0">{actions}</div>}
      </div>
      <span aria-hidden="true" className="rope-rule mt-1 block opacity-60" />
    </div>
  );
}

/** Dark banner variant for pages that benefit from a stronger opening. */
export function PageHero({
  title,
  description,
  eyebrow,
  icon: Icon,
  actions,
  children,
  className,
}: PageHeadingProps & { children?: React.ReactNode }) {
  return (
    <section className={cn('sea-deep relative overflow-hidden rounded-[6px] p-6 sm:p-8', className)}>
      {/* Same depth treatment as the public deep-sea sections. */}
      <div
        aria-hidden="true"
        className="sea-chart-light pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          maskImage: 'radial-gradient(ellipse 80% 75% at 35% 45%, transparent 15%, black 85%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 75% at 35% 45%, transparent 15%, black 85%)',
        }}
      />
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#E8231A]/25 blur-3xl" />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          {Icon && (
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-sm">
              <Icon className="h-6 w-6" />
            </span>
          )}
          <div className="min-w-0">
            {eyebrow && (
              <p className="data-type text-[12px] font-bold uppercase text-white/70">{eyebrow}</p>
            )}
            <h1 className="font-display text-2xl font-black tracking-tight text-white sm:text-3xl">
              {title}
            </h1>
            {description && (
              <p className="mt-1.5 max-w-2xl text-sm text-white/70">{description}</p>
            )}
            {children}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 lg:shrink-0">{actions}</div>}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ surface */

interface SectionCardProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  footer?: React.ReactNode;
  /** Remove inner padding when the body is a table or list that bleeds. */
  flush?: boolean;
  className?: string;
  bodyClassName?: string;
}

export function SectionCard({
  children,
  title,
  description,
  icon: Icon,
  action,
  footer,
  flush = false,
  className,
  bodyClassName,
}: SectionCardProps) {
  return (
    <section
      className={cn(
        'chart-paper overflow-hidden rounded-[5px] border border-[#DCE7F1] dark:border-slate-800',
        className
      )}
    >
      {(title || action) && (
        <header className="flex items-start justify-between gap-4 border-b border-[#DCE7F1] px-5 py-4 dark:border-slate-800">
          <div className="flex min-w-0 items-start gap-3">
            {Icon && (
              <span
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ink-muted"
                style={{ boxShadow: 'inset 0 0 0 1px rgba(11,28,46,0.14), 0 0 0 3px rgba(11,28,46,0.05)' }}
              >
                <Icon className="h-4 w-4" />
              </span>
            )}
            <div className="min-w-0">
              {title && <h2 className="font-display text-base font-bold ink-strong">{title}</h2>}
              {description && <p className="mt-0.5 text-sm ink-body">{description}</p>}
            </div>
          </div>
          {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
        </header>
      )}
      <div className={cn(flush ? '' : 'p-5', bodyClassName)}>{children}</div>
      {footer && (
        <footer className="border-t border-[#DCE7F1] px-5 py-3 dark:border-slate-800">{footer}</footer>
      )}
    </section>
  );
}

/** Heading for a group of cards that is not itself a card. */
export function SectionHeading({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-4 flex items-end justify-between gap-4', className)}>
      <div className="min-w-0">
        <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-50">
          {title}
        </h2>
        {description && (
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

/* ------------------------------------------------------------------ toolbar */

export function Toolbar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-3 lg:flex-row lg:items-center', className)}>
      {children}
    </div>
  );
}

export function SearchField({
  value,
  onChange,
  placeholder = 'Search…',
  className,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div className={cn('relative min-w-0 flex-1', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel || placeholder}
        className="input-base input-with-icon"
      />
    </div>
  );
}

export function FilterSelect({
  value,
  onChange,
  options,
  placeholder,
  ariaLabel,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  /** Label for the empty value, e.g. "All statuses". */
  placeholder: string;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={ariaLabel || placeholder}
      className={cn('input-base lg:w-48', className)}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function ResetFiltersButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="ghost" size="md" leftIcon={<X className="h-4 w-4" />} onClick={onClick}>
      Clear
    </Button>
  );
}

/* -------------------------------------------------------------------- table */

export function TableShell({
  head,
  children,
  footer,
  className,
}: {
  head: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'chart-paper overflow-hidden rounded-[5px] border border-[#DCE7F1] dark:border-slate-800',
        className
      )}
    >
      <div className="overflow-x-auto">
        <table className="w-full table-fixed">
          <thead className="border-b border-[#DCE7F1] bg-[#F5FAFD] dark:border-slate-800 dark:bg-slate-800/50">
            <tr>{head}</tr>
          </thead>
          <tbody className="divide-y divide-[#E7EFF7] dark:divide-slate-800">{children}</tbody>
        </table>
      </div>
      {footer}
    </div>
  );
}

export function Th({
  children,
  align = 'left',
  className,
}: {
  children?: React.ReactNode;
  align?: 'left' | 'right' | 'center';
  className?: string;
}) {
  return (
    <th
      className={cn(
        // Column labels are data, set in the mono face like the public tables.
        'data-type px-4 py-3 text-[12px] font-bold uppercase ink-muted',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        align === 'left' && 'text-left',
        className
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  align = 'left',
  className,
}: {
  children?: React.ReactNode;
  align?: 'left' | 'right' | 'center';
  className?: string;
}) {
  return (
    <td
      className={cn(
        'px-4 py-3 text-sm ink-body',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className
      )}
    >
      {children}
    </td>
  );
}

export function Tr({
  children,
  selected = false,
  className,
}: {
  children: React.ReactNode;
  selected?: boolean;
  className?: string;
}) {
  return (
    <tr
      className={cn(
        'transition-colors',
        selected
          ? 'bg-[#FEF2F1] dark:bg-[#E8231A]/10'
          : 'hover:bg-[#F5FAFD] dark:hover:bg-slate-800/50',
        className
      )}
    >
      {children}
    </tr>
  );
}

/** Square icon button used in table row action clusters. */
export function IconAction({
  icon: Icon,
  label,
  onClick,
  href,
  tone = 'neutral',
  disabled,
}: {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  href?: string;
  tone?: 'neutral' | 'danger';
  disabled?: boolean;
}) {
  const classes = cn(
    'flex h-8 w-8 items-center justify-center rounded-lg transition-colors disabled:opacity-40',
    tone === 'danger'
      ? 'text-danger-600 hover:bg-danger-50 dark:text-danger-400 dark:hover:bg-danger-900/30'
      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100'
  );

  if (href) {
    return (
      <Link href={href} title={label} aria-label={label} className={classes}>
        <Icon className="h-4 w-4" />
      </Link>
    );
  }
  return (
    <button type="button" title={label} aria-label={label} onClick={onClick} disabled={disabled} className={classes}>
      <Icon className="h-4 w-4" />
    </button>
  );
}

export function RowActions({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-end gap-1.5">{children}</div>;
}

/* --------------------------------------------------------------- stat tiles */

export type TileTone = 'slate' | 'red' | 'amber' | 'emerald' | 'sky' | 'violet';

const TILE_TONES: Record<TileTone, { dot: string; active: string; text: string }> = {
  slate: { dot: 'bg-slate-400', active: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-300' },
  red: { dot: 'bg-[#E8231A]', active: 'bg-[#FFF0EF] dark:bg-[#E8231A]/15', text: 'text-[#C41E16] dark:text-[#FF8A84]' },
  amber: { dot: 'bg-amber-500', active: 'bg-amber-50 dark:bg-amber-900/25', text: 'text-amber-700 dark:text-amber-300' },
  emerald: { dot: 'bg-emerald-500', active: 'bg-emerald-50 dark:bg-emerald-900/25', text: 'text-emerald-700 dark:text-emerald-300' },
  sky: { dot: 'bg-sky-500', active: 'bg-sky-50 dark:bg-sky-900/25', text: 'text-sky-700 dark:text-sky-300' },
  violet: { dot: 'bg-violet-500', active: 'bg-violet-50 dark:bg-violet-900/25', text: 'text-violet-700 dark:text-violet-300' },
};

/**
 * Compact metric tile. Pass `onClick` to turn it into a filter toggle, which is
 * the pattern the list pages use for status tabs.
 */
export function StatTile({
  label,
  value,
  tone = 'slate',
  hint,
  icon: Icon,
  active = false,
  onClick,
  className,
}: {
  label: string;
  value: number | string;
  tone?: TileTone;
  hint?: string;
  icon?: LucideIcon;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const palette = TILE_TONES[tone];
  const body = (
    <>
      <span className="flex items-center gap-2">
        {Icon ? (
          <Icon className={cn('h-4 w-4', palette.text)} />
        ) : (
          <span className={cn('h-2 w-2 rounded-full', palette.dot)} />
        )}
        {/* Readings are labelled in the data face and set as figures below. */}
        <span className="data-type truncate text-[12px] font-bold uppercase ink-muted">{label}</span>
      </span>
      <span className="data-type mt-1.5 block font-display text-2xl font-black ink-strong">
        {typeof value === 'number' ? value.toLocaleString('en-NZ') : value}
      </span>
      {hint && <span className="mt-0.5 block truncate text-[12px] ink-muted">{hint}</span>}
    </>
  );

  const shell = cn(
    'rounded-[5px] border p-4 text-left transition-all',
    active
      ? cn('border-transparent ring-2 ring-[#C3D2E0] dark:ring-slate-600', palette.active)
      : 'chart-paper border-[#DCE7F1] dark:border-slate-800',
    onClick && 'hover:border-[#C3D2E0] dark:hover:border-slate-700',
    className
  );

  if (!onClick) return <div className={shell}>{body}</div>;
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={shell}>
      {body}
    </button>
  );
}

export function StatTileRow({
  children,
  columns = 4,
  className,
}: {
  children: React.ReactNode;
  columns?: 2 | 3 | 4 | 5;
  className?: string;
}) {
  const cols = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 sm:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-4',
    5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
  };
  return <div className={cn('grid gap-3', cols[columns], className)}>{children}</div>;
}

/* ------------------------------------------------------- states & feedback */

export function EmptyBlock({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-14 text-center', className)}>
      <span
        className="mb-4 flex h-12 w-12 items-center justify-center rounded-full ink-muted"
        style={{ boxShadow: 'inset 0 0 0 1px rgba(11,28,46,0.14), 0 0 0 4px rgba(11,28,46,0.05)' }}
      >
        <Icon className="h-5 w-5" />
      </span>
      <p className="text-base font-semibold ink-strong">{title}</p>
      {description && <p className="mt-1.5 max-w-sm text-sm ink-body">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function LoadingRows({ rows = 6, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="h-14 rounded-xl skeleton" />
      ))}
    </div>
  );
}

export function LoadingCards({
  count = 6,
  columns = 3,
  className,
}: {
  count?: number;
  columns?: 2 | 3 | 4;
  className?: string;
}) {
  const cols = {
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-2 lg:grid-cols-3',
    4: 'sm:grid-cols-2 lg:grid-cols-4',
  };
  return (
    <div className={cn('grid grid-cols-1 gap-4', cols[columns], className)}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="h-44 rounded-2xl skeleton" />
      ))}
    </div>
  );
}

export function PageLoading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
      <Loader2 className="h-7 w-7 animate-spin text-[#E8231A]" />
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}

export function ListPageSkeleton({ tiles = 4, rows = 6 }: { tiles?: number; rows?: number }) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-56 rounded skeleton" />
        <div className="h-4 w-72 rounded skeleton" />
      </div>
      {tiles > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: tiles }).map((_, index) => (
            <div key={index} className="h-24 rounded-2xl skeleton" />
          ))}
        </div>
      )}
      <div className="h-11 rounded-xl skeleton" />
      <LoadingRows rows={rows} />
    </div>
  );
}

export function AccessDenied({
  title = 'Access denied',
  message = 'You do not have permission to open this page.',
  backHref = '/dashboard',
  backLabel = 'Back to dashboard',
}: {
  title?: string;
  message?: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-6 text-center">
      <span
        className="mb-5 flex h-16 w-16 items-center justify-center rounded-full"
        style={{ boxShadow: 'inset 0 0 0 1px #F3C9C6, 0 0 0 5px rgba(176,24,18,0.10)' }}
      >
        <ShieldAlert className="h-7 w-7" style={{ color: '#B01812' }} />
      </span>
      <h2 className="font-display text-xl font-bold ink-strong">{title}</h2>
      <p className="mt-2 max-w-md text-sm ink-body">{message}</p>
      <Link href={backHref} className="mt-5">
        <Button variant="primary">{backLabel}</Button>
      </Link>
    </div>
  );
}

/* ---------------------------------------------------------------- misc bits */

export function Breadcrumbish({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
            {index > 0 && <ChevronRight className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600" />}
            {item.href ? (
              <Link
                href={item.href}
                className="text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              >
                {item.label}
              </Link>
            ) : (
              <span className="font-semibold text-slate-900 dark:text-slate-100">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Label/value pair used on detail pages. */
export function DetailItem({
  label,
  value,
  icon: Icon,
  className,
}: {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start gap-3', className)}>
      {Icon && (
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          <Icon className="h-4 w-4" />
        </span>
      )}
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="mt-0.5 break-words text-sm font-medium text-slate-800 dark:text-slate-100">
          {value || '—'}
        </p>
      </div>
    </div>
  );
}

/** Form field wrapper so every form uses the same label and hint treatment. */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('w-full', className)}>
      <label htmlFor={htmlFor} className="data-type mb-2 block text-[12px] font-bold uppercase ink-muted">
        {label}
        {required && <span className="accent-label ml-0.5">*</span>}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 text-[13px] font-medium text-danger-600 dark:text-danger-400">{error}</p>
      ) : (
        hint && <p className="mt-1.5 text-[13px] ink-muted">{hint}</p>
      )}
    </div>
  );
}

export function FormGrid({
  children,
  columns = 2,
  className,
}: {
  children: React.ReactNode;
  columns?: 1 | 2 | 3;
  className?: string;
}) {
  const cols = { 1: '', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-2 lg:grid-cols-3' };
  return <div className={cn('grid grid-cols-1 gap-4', cols[columns], className)}>{children}</div>;
}

/** Sticky action bar for long forms. */
export function FormActions({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'sticky bottom-4 z-20 flex flex-wrap items-center justify-end gap-2 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/95',
        className
      )}
    >
      {children}
    </div>
  );
}
