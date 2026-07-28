/**
 * Creating in-app notifications.
 *
 * Notifications are a side effect of something else succeeding — a comment was
 * posted, a membership was approved. So every function here is best effort and
 * never throws: failing to write a notification must not roll back or 500 the
 * action the member actually asked for.
 */
import { NotificationType } from '@prisma/client';
import prisma from './prisma';

export interface NotifyInput {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  /** In-app destination, relative by convention (e.g. /dashboard/articles/slug). */
  link?: string | null;
}

/** Keep stored text bounded; these are summaries, not documents. */
const MAX_TITLE = 200;
const MAX_BODY = 500;

const truncate = (value: string, max: number): string =>
  value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`;

/**
 * Add one notification.
 *
 * Returns true when it was stored. Callers are free to ignore the result — the
 * point of the return value is testability, not error handling.
 */
export const notify = async (input: NotifyInput): Promise<boolean> => {
  try {
    await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: truncate(input.title, MAX_TITLE),
        body: input.body ? truncate(input.body, MAX_BODY) : null,
        link: input.link ?? null,
      },
    });
    return true;
  } catch (error) {
    console.error('[notify] Failed to create notification:', error);
    return false;
  }
};

/**
 * Add the same notification for several recipients.
 *
 * Duplicate ids are collapsed so a member never receives the same notice twice
 * from one event.
 */
export const notifyMany = async (
  userIds: string[],
  notification: Omit<NotifyInput, 'userId'>
): Promise<number> => {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return 0;

  try {
    const result = await prisma.notification.createMany({
      data: unique.map((userId) => ({
        userId,
        type: notification.type,
        title: truncate(notification.title, MAX_TITLE),
        body: notification.body ? truncate(notification.body, MAX_BODY) : null,
        link: notification.link ?? null,
      })),
    });
    return result.count;
  } catch (error) {
    console.error('[notify] Failed to create notifications:', error);
    return 0;
  }
};

export default notify;
