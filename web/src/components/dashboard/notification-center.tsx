'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Bell,
  CalendarCheck,
  CheckCheck,
  Info,
  Loader2,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';
import { useDashboardData, type DashboardNotification } from './dashboard-data-context';

const TONE_STYLES: Record<
  DashboardNotification['tone'],
  { icon: typeof Info; wrapper: string }
> = {
  info: { icon: Info, wrapper: 'bg-primary-50 text-primary-600 dark:bg-primary-900/40 dark:text-primary-300' },
  warning: { icon: AlertTriangle, wrapper: 'bg-amber-50 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300' },
  danger: { icon: XCircle, wrapper: 'bg-danger-50 text-danger-600 dark:bg-danger-900/40 dark:text-danger-300' },
  success: { icon: CalendarCheck, wrapper: 'bg-success-50 text-success-700 dark:bg-success-900/40 dark:text-success-300' },
};

export function NotificationCenter() {
  const { notifications, unreadCount, isLoading, refresh, markRead, markAllRead } =
    useDashboardData();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, [open]);

  const count = notifications.length;
  /** Whether anything can be dismissed, i.e. any stored unread notification. */
  const hasDismissable = notifications.some((item) => item.notificationId && !item.read);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ''}`}
        aria-expanded={open}
        /* Bare icon on the masthead, same as the other bar controls. */
        className="relative flex h-9 w-9 items-center justify-center text-[#94A3B8] transition-colors hover:text-white"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-[20px] min-w-[20px] items-center justify-center rounded-full bg-[#C41E16] px-1 text-[12px] font-bold leading-none text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="animate-scale-in absolute right-0 top-full z-50 mt-2 w-[320px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl sm:w-[380px] dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Notifications</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {unreadCount > 0 ? `${unreadCount} unread` : 'Nothing needs attention'}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {hasDismissable && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all read
                </button>
              )}
              <button
                type="button"
                onClick={refresh}
                aria-label="Refresh notifications"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {count === 0 ? (
              <div className="px-4 py-10 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                  <Bell className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">You are all caught up.</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {notifications.map((item) => {
                  const tone = TONE_STYLES[item.tone];
                  // Derived entries have no row to mark, so they always read as
                  // outstanding; stored ones dim once read.
                  const isUnread = item.notificationId ? !item.read : true;

                  return (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        onClick={() => {
                          // Opening a notification is the acknowledgement.
                          if (item.notificationId && !item.read) {
                            void markRead(item.notificationId);
                          }
                          setOpen(false);
                        }}
                        className={cn(
                          'flex gap-3 px-4 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60',
                          isUnread && 'bg-primary-50/40 dark:bg-primary-900/10'
                        )}
                      >
                        <span
                          className={cn(
                            'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                            tone.wrapper
                          )}
                        >
                          <tone.icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className={cn(
                              'block text-sm text-slate-900 dark:text-slate-100',
                              isUnread ? 'font-semibold' : 'font-medium text-slate-600 dark:text-slate-300'
                            )}
                          >
                            {item.title}
                          </span>
                          {item.detail && (
                            <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">
                              {item.detail}
                            </span>
                          )}
                          {item.at && (
                            <span className="mt-1 block text-[12px] text-slate-500 dark:text-slate-400">
                              {formatRelativeTime(item.at)}
                            </span>
                          )}
                        </span>
                        {isUnread && (
                          <span
                            aria-hidden
                            className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#E8231A]"
                          />
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
