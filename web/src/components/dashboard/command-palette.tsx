'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Calendar,
  CornerDownLeft,
  FileText,
  Loader2,
  Search,
  Users,
} from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { ADMIN_NAV, MEMBER_NAV, flattenNav, isAdminRole, type NavItem } from './nav-config';

interface CommandPaletteProps {
  onClose: () => void;
  role?: string;
}

type ResultKind = 'page' | 'event' | 'article' | 'member';

interface CommandResult {
  id: string;
  kind: ResultKind;
  label: string;
  hint?: string;
  href: string;
}

interface SearchPayload {
  results?: {
    events?: { items?: { id: string; title: string; slug: string; location?: string }[] };
    articles?: { items?: { id: string; title: string; slug: string; category?: string }[] };
    members?: { id: string; name: string; university?: string }[];
  };
}

const KIND_META: Record<ResultKind, { icon: typeof Search; label: string; tint: string }> = {
  page: { icon: ArrowRight, label: 'Pages', tint: 'bg-primary-50 text-primary-600 dark:bg-primary-900/40 dark:text-primary-300' },
  event: { icon: Calendar, label: 'Events', tint: 'bg-[#FFF0EF] text-[#E8231A] dark:bg-[#E8231A]/20 dark:text-[#FF8A84]' },
  article: { icon: FileText, label: 'Articles', tint: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300' },
  member: { icon: Users, label: 'Members', tint: 'bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300' },
};

/**
 * ⌘K palette. Navigation entries come straight from nav-config, so any page
 * added to the sidebar is reachable here too. Content results reuse the
 * existing /search endpoint.
 */
export function CommandPalette({ onClose, role }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [remote, setRemote] = useState<CommandResult[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const pages = useMemo<CommandResult[]>(() => {
    const items: NavItem[] = [
      ...flattenNav(MEMBER_NAV, role),
      ...(isAdminRole(role) ? flattenNav(ADMIN_NAV, role) : []),
    ];
    const seen = new Set<string>();
    return items
      .filter((item) => {
        if (seen.has(item.href)) return false;
        seen.add(item.href);
        return true;
      })
      .map((item) => ({
        id: `page:${item.href}`,
        kind: 'page' as const,
        label: item.label,
        hint: item.description,
        href: item.href,
      }));
  }, [role]);

  const filteredPages = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pages;
    return pages.filter(
      (page) =>
        page.label.toLowerCase().includes(q) ||
        page.hint?.toLowerCase().includes(q) ||
        page.href.toLowerCase().includes(q)
    );
  }, [pages, query]);

  // Remote hits are only meaningful for the query that produced them, so they
  // are gated on the query length here instead of being cleared via an effect.
  const searchable = query.trim().length >= 2;
  const results = useMemo(
    () => [...filteredPages, ...(searchable ? remote : [])],
    [filteredPages, remote, searchable]
  );

  // Focus the input once the dialog paints. The component is mounted fresh on
  // every launch, so there is no stale state to reset.
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 20);
    return () => clearTimeout(timer);
  }, []);

  // Debounced content search
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const payload = (await api.search(q)) as SearchPayload;
        if (cancelled) return;
        const mapped: CommandResult[] = [
          ...(payload.results?.events?.items || []).slice(0, 4).map((event) => ({
            id: `event:${event.id}`,
            kind: 'event' as const,
            label: event.title,
            hint: event.location,
            href: `/dashboard/events/${event.slug}`,
          })),
          ...(payload.results?.articles?.items || []).slice(0, 4).map((article) => ({
            id: `article:${article.id}`,
            kind: 'article' as const,
            label: article.title,
            hint: article.category,
            href: `/dashboard/articles/${article.slug}`,
          })),
          ...(isAdminRole(role)
            ? (payload.results?.members || []).slice(0, 4).map((member) => ({
                id: `member:${member.id}`,
                kind: 'member' as const,
                label: member.name,
                hint: member.university,
                href: `/dashboard/admin/members/${member.id}`,
              }))
            : []),
        ];
        setRemote(mapped);
      } catch {
        if (!cancelled) setRemote([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 280);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, role]);

  const select = useCallback(
    (result?: CommandResult) => {
      if (!result) return;
      onClose();
      router.push(result.href);
    },
    [onClose, router]
  );

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (results.length ? (index + 1) % results.length : 0));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (results.length ? (index - 1 + results.length) % results.length : 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      select(results[activeIndex]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  };

  // Keep the highlighted row in view
  useEffect(() => {
    const container = listRef.current;
    if (!container) return;
    const active = container.querySelector<HTMLElement>('[data-active="true"]');
    active?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, results.length]);

  let lastKind: ResultKind | null = null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[12vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-slate-950/60 backdrop-blur-sm"
      />
      <div className="animate-scale-in relative w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <Search className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              // Highlight the first hit of the new result set.
              setActiveIndex(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Search pages, events, articles, members…"
            className="flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-500 dark:text-slate-100 dark:placeholder:text-slate-400"
            aria-label="Keyword"
          />
          {searching && searchable && (
            <Loader2 className="h-4 w-4 animate-spin text-slate-500 dark:text-slate-400" />
          )}
          <kbd className="hidden rounded border border-slate-200 px-1.5 py-0.5 text-[12px] font-semibold text-slate-500 sm:block dark:border-slate-700 dark:text-slate-400">
            ESC
          </kbd>
        </div>

        <div ref={listRef} className="max-h-[52vh] overflow-y-auto p-2">
          {results.length === 0 ? (
            <p className="px-3 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
              {searchable
                ? `No results for "${query.trim()}"`
                : 'Start typing to search'}
            </p>
          ) : (
            results.map((result, index) => {
              const meta = KIND_META[result.kind];
              const showHeader = result.kind !== lastKind;
              lastKind = result.kind;
              const active = index === activeIndex;
              return (
                <div key={result.id}>
                  {showHeader && (
                    <p className="px-3 pb-1 pt-3 text-[12px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {meta.label}
                    </p>
                  )}
                  <button
                    type="button"
                    data-active={active}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => select(result)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                      active ? 'bg-slate-100 dark:bg-slate-800' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                        meta.tint
                      )}
                    >
                      <meta.icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                        {result.label}
                      </span>
                      {result.hint && (
                        <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                          {result.hint}
                        </span>
                      )}
                    </span>
                    {active && (
                      <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-slate-500 dark:text-slate-400" />
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 text-[12px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <span className="flex items-center gap-3">
            <span>↑ ↓ select</span>
            <span>↵ open</span>
          </span>
          <span>{results.length} results</span>
        </div>
      </div>
    </div>
  );
}
