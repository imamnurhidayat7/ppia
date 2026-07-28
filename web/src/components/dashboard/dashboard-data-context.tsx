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
import api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { isAdminRole } from './nav-config';

export interface DashboardNotification {
  id: string;
  title: string;
  detail: string;
  href: string;
  tone: 'info' | 'warning' | 'danger' | 'success';
  /** ISO timestamp when the underlying item appeared, when known. */
  at?: string;
  /**
   * Set when the entry came from the Notification table, which is what makes it
   * dismissable. Derived entries have no id because there is no row to update —
   * they disappear when the underlying condition does.
   */
  notificationId?: string;
  /** Only meaningful for stored notifications. */
  read?: boolean;
}

/** Notification types the API can return, mapped to a visual tone. */
const NOTIFICATION_TONES: Record<string, DashboardNotification['tone']> = {
  COMMENT_REPLY: 'info',
  ARTICLE_PUBLISHED: 'info',
  EVENT_REMINDER: 'success',
  EVENT_REGISTRATION: 'success',
  MEMBERSHIP_APPROVED: 'success',
  MEMBERSHIP_REJECTED: 'danger',
  SYSTEM: 'info',
};

interface StoredNotification {
  id: string;
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
  readAt?: string | null;
  createdAt: string;
}

export interface DashboardCounts {
  pendingMembers: number;
  recentComments: number;
  upcomingEvents: number;
}

interface DashboardDataValue {
  counts: DashboardCounts;
  notifications: DashboardNotification[];
  /** Stored unread notifications plus derived items still needing attention. */
  unreadCount: number;
  isLoading: boolean;
  refresh: () => void;
  markRead: (notificationId: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

const EMPTY_COUNTS: DashboardCounts = {
  pendingMembers: 0,
  recentComments: 0,
  upcomingEvents: 0,
};

const DashboardDataContext = createContext<DashboardDataValue>({
  counts: EMPTY_COUNTS,
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  refresh: () => {},
  markRead: async () => {},
  markAllRead: async () => {},
});

interface PendingMember {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

/**
 * Feeds the notification bell and the nav badges.
 *
 * Two sources are merged, on purpose:
 *
 *   Stored notifications — rows in the Notification table, written server-side
 *     when something happened to this member (a reply, an approval). These carry
 *     read state and survive a reload.
 *   Derived items — conditions that are true right now and need attention:
 *     members awaiting approval, the viewer's own pending membership, the next
 *     event. These have no row to mark as read; they vanish when the condition
 *     resolves, which is the correct behaviour for a standing task.
 */
export function DashboardDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [counts, setCounts] = useState<DashboardCounts>(EMPTY_COUNTS);
  const [notifications, setNotifications] = useState<DashboardNotification[]>([]);
  const [storedUnread, setStoredUnread] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [nonce, setNonce] = useState(0);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  /** Mark one stored notification as read, updating the badge immediately. */
  const markRead = useCallback(async (notificationId: string) => {
    setNotifications((current) =>
      current.map((item) =>
        item.notificationId === notificationId ? { ...item, read: true } : item
      )
    );
    setStoredUnread((current) => Math.max(0, current - 1));

    try {
      await api.markNotificationRead(notificationId);
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
      // Re-sync rather than guess at the previous state.
      setNonce((n) => n + 1);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    setNotifications((current) => current.map((item) => (item.notificationId ? { ...item, read: true } : item)));
    setStoredUnread(0);

    try {
      await api.markAllNotificationsRead();
    } catch (err) {
      console.error('Failed to mark notifications as read:', err);
      setNonce((n) => n + 1);
    }
  }, []);

  useEffect(() => {
    // Signed out: nothing to fetch. The exposed value falls back to empty
    // below, so no state reset is needed here.
    if (!user) return;

    let cancelled = false;
    const isAdmin = isAdminRole(user.role);
    const isSuperAdmin = user.role === 'SUPER_ADMIN';

    (async () => {
      setIsLoading(true);
      const next: DashboardNotification[] = [];
      const nextCounts: DashboardCounts = { ...EMPTY_COUNTS };

      // Member-facing: surface the viewer's own membership state first.
      if (user.membershipStatus === 'PENDING') {
        next.push({
          id: 'own-membership-pending',
          title: 'Membership pending approval',
          detail: 'Some features unlock once your account is approved.',
          href: '/dashboard/profile',
          tone: 'warning',
        });
      } else if (user.membershipStatus === 'REJECTED') {
        next.push({
          id: 'own-membership-rejected',
          title: 'Registration rejected',
          detail: user.rejectionReason || 'Contact the committee for details.',
          href: '/dashboard/profile',
          tone: 'danger',
        });
      }

      const results = await Promise.allSettled([
        isSuperAdmin
          ? api.getMembers({ limit: 5, membershipStatus: 'PENDING' })
          : Promise.resolve(null),
        isAdmin ? api.getCommentStats() : Promise.resolve(null),
        api.getEvents({ limit: 3 }),
        api.getNotifications(),
      ]);

      const [pendingRes, commentRes, eventsRes, notificationsRes] = results;

      // Stored notifications sit above the admin-facing derived entries, below
      // the viewer's own membership state which is the most urgent thing there
      // is for the member it applies to.
      let unread = 0;
      if (notificationsRes.status === 'fulfilled' && notificationsRes.value) {
        const payload = notificationsRes.value as {
          notifications?: StoredNotification[];
          unreadCount?: number;
        };
        unread = payload.unreadCount ?? 0;

        for (const stored of payload.notifications ?? []) {
          next.push({
            id: `stored-${stored.id}`,
            notificationId: stored.id,
            read: Boolean(stored.readAt),
            title: stored.title,
            detail: stored.body || '',
            // Falling back to the dashboard keeps the row clickable even if a
            // notification was written without a link.
            href: stored.link || '/dashboard',
            tone: NOTIFICATION_TONES[stored.type] ?? 'info',
            at: stored.createdAt,
          });
        }
      }

      if (pendingRes.status === 'fulfilled' && pendingRes.value) {
        const payload = pendingRes.value as {
          members?: PendingMember[];
          pagination?: { total?: number };
        };
        nextCounts.pendingMembers = payload.pagination?.total ?? payload.members?.length ?? 0;
        if (nextCounts.pendingMembers > 0) {
          next.push({
            id: 'pending-members',
            title: `${nextCounts.pendingMembers} members awaiting approval`,
            detail:
              payload.members
                ?.slice(0, 3)
                .map((m) => m.name)
                .join(', ') || 'Review it on the members page.',
            href: '/dashboard/admin/members?status=PENDING',
            tone: 'warning',
            at: payload.members?.[0]?.createdAt,
          });
        }
      }

      if (commentRes.status === 'fulfilled' && commentRes.value) {
        const payload = commentRes.value as {
          stats?: { last7Days?: number; hidden?: number };
        };
        nextCounts.recentComments = payload.stats?.last7Days ?? 0;
        if (nextCounts.recentComments > 0) {
          next.push({
            id: 'recent-comments',
            title: `${nextCounts.recentComments} new comments this week`,
            detail: 'Review and moderate recent discussions.',
            href: '/dashboard/admin/comments',
            tone: 'info',
          });
        }
        if ((payload.stats?.hidden ?? 0) > 0) {
          next.push({
            id: 'hidden-comments',
            title: `${payload.stats?.hidden} hidden comments`,
            detail: 'These comments are hidden from the public site.',
            href: '/dashboard/admin/comments',
            tone: 'info',
          });
        }
      }

      if (eventsRes.status === 'fulfilled' && eventsRes.value) {
        const payload = eventsRes.value as {
          events?: { id: string; title: string; slug: string; startDate: string }[];
        };
        const upcoming = (payload.events || []).filter(
          (event) => new Date(event.startDate).getTime() >= Date.now()
        );
        nextCounts.upcomingEvents = upcoming.length;
        const nearest = upcoming[0];
        if (nearest) {
          next.push({
            id: `event-${nearest.id}`,
            title: 'Upcoming event',
            detail: nearest.title,
            href: `/dashboard/events/${nearest.slug}`,
            tone: 'success',
            at: nearest.startDate,
          });
        }
      }

      if (cancelled) return;
      setCounts(nextCounts);
      setNotifications(next);
      setStoredUnread(unread);
      setIsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user, nonce]);

  const value = useMemo(() => {
    if (!user) {
      return {
        counts: EMPTY_COUNTS,
        notifications: [],
        unreadCount: 0,
        isLoading: false,
        refresh,
        markRead,
        markAllRead,
      };
    }

    // The badge counts unread stored notifications plus every derived entry,
    // because a derived entry is by definition still outstanding.
    const derivedCount = notifications.filter((item) => !item.notificationId).length;

    return {
      counts,
      notifications,
      unreadCount: storedUnread + derivedCount,
      isLoading,
      refresh,
      markRead,
      markAllRead,
    };
  }, [user, counts, notifications, storedUnread, isLoading, refresh, markRead, markAllRead]);

  return <DashboardDataContext.Provider value={value}>{children}</DashboardDataContext.Provider>;
}

export function useDashboardData(): DashboardDataValue {
  return useContext(DashboardDataContext);
}
