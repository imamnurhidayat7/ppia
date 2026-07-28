'use client';

/**
 * Save / unsave an article.
 *
 * State is owned by the caller (usually `useBookmarks`) so a list can hold one
 * source of truth for every card, and so the reading list page can remove an
 * item from the list the moment it is unsaved.
 *
 * Renders nothing when there is no signed-in member — a save button that always
 * fails is worse than no button.
 */

import { Bookmark, BookmarkCheck } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

interface BookmarkButtonProps {
  articleId: string;
  saved: boolean;
  onToggle: (articleId: string) => Promise<boolean> | void;
  /**
   * `icon` is a bare icon for use on cards; `labelled` shows text and suits a
   * detail page where there is room for it.
   */
  variant?: 'icon' | 'labelled';
  className?: string;
}

export default function BookmarkButton({
  articleId,
  saved,
  onToggle,
  variant = 'icon',
  className = '',
}: BookmarkButtonProps) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);

  if (!user) return null;

  const handleClick = async (event: React.MouseEvent) => {
    // Cards are usually wrapped in a link; without this the click navigates.
    event.preventDefault();
    event.stopPropagation();

    if (busy) return;
    setBusy(true);
    try {
      await onToggle(articleId);
    } finally {
      setBusy(false);
    }
  };

  const Icon = saved ? BookmarkCheck : Bookmark;
  const label = saved ? 'Saved' : 'Save';

  if (variant === 'labelled') {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        aria-pressed={saved}
        className={cn(
          'inline-flex items-center gap-2 rounded-2xl border-2 px-4 py-2.5 text-sm font-semibold transition-all',
          saved
            ? 'border-[#E8231A]/30 bg-[#E8231A]/5 text-[#E8231A]'
            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200',
          busy && 'opacity-60',
          className
        )}
      >
        <Icon className="h-4 w-4" />
        {saved ? 'Saved to reading list' : 'Save for later'}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      aria-pressed={saved}
      aria-label={saved ? 'Remove from reading list' : 'Save to reading list'}
      title={label}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
        saved
          ? 'text-[#E8231A] hover:bg-[#E8231A]/10'
          : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800',
        busy && 'opacity-60',
        className
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
