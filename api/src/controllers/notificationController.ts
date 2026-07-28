/**
 * Reading and dismissing in-app notifications.
 *
 * Everything is scoped to the caller's own id from the token. There is no
 * endpoint for creating a notification over HTTP: they are produced server-side
 * as a consequence of other actions (see lib/notify.ts), so no client can
 * fabricate one.
 */
import { Request, Response } from 'express';
import prisma from '../lib/prisma';

interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: string;
    divisionId?: string;
  };
}

/** How far back the list reaches. Older entries stay in the table but are not served. */
const MAX_LIST_SIZE = 30;

/**
 * GET /api/notifications — recent notifications plus the unread tally.
 *
 * The count is queried separately rather than derived from the returned page,
 * so a member with more unread items than fit in one page still sees the true
 * number on the badge.
 */
export const getNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { unreadOnly } = req.query as Record<string, string | undefined>;
    const onlyUnread = unreadOnly === 'true';

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId, ...(onlyUnread ? { readAt: null } : {}) },
        orderBy: { createdAt: 'desc' },
        take: MAX_LIST_SIZE,
        select: {
          id: true,
          type: true,
          title: true,
          body: true,
          link: true,
          readAt: true,
          createdAt: true,
        },
      }),
      prisma.notification.count({ where: { userId, readAt: null } }),
    ]);

    res.json({ notifications, unreadCount });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * PATCH /api/notifications/:id/read — mark one as read.
 *
 * `updateMany` with the userId in the filter is what enforces ownership: a
 * caller passing someone else's notification id matches zero rows rather than
 * updating it.
 */
export const markNotificationRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { id } = req.params as { id: string };

    const result = await prisma.notification.updateMany({
      // Already-read rows are excluded so the timestamp records the first read.
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    });

    res.json({ updated: result.count });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/** POST /api/notifications/read-all — clear the badge in one action. */
export const markAllNotificationsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const result = await prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });

    res.json({ updated: result.count });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * DELETE /api/notifications/:id — remove one from the member's own list.
 */
export const deleteNotification = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { id } = req.params as { id: string };

    // deleteMany, so removing something already gone is not an error.
    await prisma.notification.deleteMany({ where: { id, userId } });

    res.json({ deleted: true });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
