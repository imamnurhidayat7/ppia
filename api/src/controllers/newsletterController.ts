import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { createAuditLog } from './auditLogController';
import { sendEmail, renderEmailLayout, renderEmailHeading, escapeHtml } from '../lib/mailer';
import { unsubscribeUrl, verifyUnsubscribeToken } from '../lib/newsletter-token';

// Subscribe to newsletter
export const subscribe = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, name } = req.body;

    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    // Check if already subscribed
    const existing = await prisma.newsletterSubscriber.findUnique({
      where: { email }
    });

    if (existing) {
      if (existing.isActive) {
        res.status(400).json({ error: 'Email is already subscribed' });
        return;
      }

      // Reactivate subscription
      const subscriber = await prisma.newsletterSubscriber.update({
        where: { email },
        data: {
          isActive: true,
          unsubscribedAt: null
        }
      });

      res.json({ message: 'Subscription reactivated', subscriber });
      return;
    }

    const subscriber = await prisma.newsletterSubscriber.create({
      data: {
        email,
        name,
        isActive: true
      }
    });

    res.status(201).json({ message: 'Successfully subscribed to newsletter', subscriber });
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'Email is already subscribed' });
      return;
    }
    console.error('Subscribe error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Unsubscribe from newsletter
export const unsubscribe = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    const subscriber = await prisma.newsletterSubscriber.update({
      where: { email },
      data: {
        isActive: false,
        unsubscribedAt: new Date()
      }
    });

    res.json({ message: 'Successfully unsubscribed from newsletter' });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Admin: Get all subscribers
export const getSubscribers = async (req: Request, res: Response): Promise<void> => {
  try {
    // @ts-ignore
    const userId = req.user?.userId;
    // @ts-ignore
    const userRole = req.user?.role;

    if (!userId || userRole !== 'SUPER_ADMIN') {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    const { page = 1, limit = 50, active } = req.query;

    const where: any = {};

    if (active !== undefined) {
      where.isActive = active === 'true';
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [subscribers, total] = await Promise.all([
      prisma.newsletterSubscriber.findMany({
        where,
        orderBy: { subscribedAt: 'desc' },
        skip,
        take: Number(limit)
      }),
      prisma.newsletterSubscriber.count({ where })
    ]);

    res.json({
      subscribers,
      stats: {
        total: await prisma.newsletterSubscriber.count(),
        active: await prisma.newsletterSubscriber.count({ where: { isActive: true } }),
        inactive: await prisma.newsletterSubscriber.count({ where: { isActive: false } })
      },
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get subscribers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * How many messages are in flight at once.
 *
 * Each recipient gets a separate API call because each message carries its own
 * unsubscribe link. A small window keeps the provider happy without making the
 * request take one round-trip per subscriber.
 */
const SEND_CONCURRENCY = 5;

/**
 * Upper bound on one send.
 *
 * This runs inside the HTTP request, so a very large list would hit a proxy
 * timeout half-way through with no record of where it stopped. The cap makes the
 * limit explicit rather than letting it fail in the middle; a list this size is
 * the point at which a background queue is needed instead.
 */
const MAX_RECIPIENTS_PER_SEND = 500;

/**
 * Render the newsletter body for one recipient.
 *
 * `content` is authored by a SUPER_ADMIN in the dashboard and may be plain text
 * or simple HTML. Plain text has its line breaks converted so the message does
 * not arrive as one paragraph.
 */
const renderNewsletterHtml = (params: {
  subject: string;
  content: string;
  recipientName?: string | null;
  unsubscribeLink: string;
}): string => {
  const looksLikeHtml = /<[a-z][\s\S]*>/i.test(params.content);
  const body = looksLikeHtml
    ? params.content
    : `<p style="margin:0 0 12px;">${escapeHtml(params.content).replace(/\n{2,}/g, '</p><p style="margin:0 0 12px;">').replace(/\n/g, '<br>')}</p>`;

  const greeting = params.recipientName
    ? `<p style="margin:0 0 12px;">Hi ${escapeHtml(params.recipientName)},</p>`
    : '';

  return renderEmailLayout(
    `
      ${renderEmailHeading(escapeHtml(params.subject))}
      ${greeting}
      ${body}
      <!-- A coloured cell rather than <hr>, which Outlook renders inconsistently. -->
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:24px 0 12px;">
        <tr><td height="1" bgcolor="#E2E8F0" style="background-color:#E2E8F0;height:1px;line-height:1px;font-size:0;">&nbsp;</td></tr>
      </table>
      <p style="margin:0;color:#64748B;font-size:12px;line-height:18px;">
        You're receiving this because you subscribed to PPIA Auckland updates.<br />
        <a href="${params.unsubscribeLink}" style="color:#64748B;text-decoration:underline;">Unsubscribe from this newsletter</a>
      </p>
    `,
    { preheader: params.subject }
  );
};

/**
 * Admin: send the newsletter to every active subscriber.
 *
 * Delivery is per-recipient rather than one message with many addresses, because
 * each one needs its own unsubscribe link — and because a shared To: header
 * would expose the whole subscriber list to every reader.
 *
 * The response reports how many actually went out. It used to log to the console
 * and reply "queued", which read as success while nothing was sent.
 */
export const sendNewsletter = async (req: Request, res: Response): Promise<void> => {
  try {
    // @ts-ignore
    const userId = req.user?.userId;
    // @ts-ignore
    const userRole = req.user?.role;

    if (!userId || userRole !== 'SUPER_ADMIN') {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    const { subject, content } = req.body as { subject?: string; content?: string };

    if (!subject?.trim() || !content?.trim()) {
      res.status(400).json({ error: 'Subject and content are required' });
      return;
    }

    const subscribers = await prisma.newsletterSubscriber.findMany({
      where: { isActive: true },
      select: { email: true, name: true },
      take: MAX_RECIPIENTS_PER_SEND + 1,
    });

    if (subscribers.length === 0) {
      res.status(400).json({ error: 'There are no active subscribers to send to' });
      return;
    }

    if (subscribers.length > MAX_RECIPIENTS_PER_SEND) {
      res.status(413).json({
        error:
          `This list has more than ${MAX_RECIPIENTS_PER_SEND} active subscribers. ` +
          'Sending that many in one request is not supported yet.',
      });
      return;
    }

    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').split('#')[0].trim();

    const failures: string[] = [];
    let sent = 0;

    // Fixed-size windows rather than Promise.all over the whole list, so a large
    // send does not open hundreds of sockets at once.
    for (let start = 0; start < subscribers.length; start += SEND_CONCURRENCY) {
      const window = subscribers.slice(start, start + SEND_CONCURRENCY);

      const results = await Promise.all(
        window.map((subscriber) =>
          sendEmail({
            to: subscriber.email,
            subject: subject.trim(),
            html: renderNewsletterHtml({
              subject: subject.trim(),
              content,
              recipientName: subscriber.name,
              unsubscribeLink: unsubscribeUrl(subscriber.email, frontendUrl),
            }),
            category: 'newsletter',
          }).then((result) => ({ email: subscriber.email, result }))
        )
      );

      for (const { email, result } of results) {
        if (result.ok) sent += 1;
        else failures.push(email);
      }
    }

    await createAuditLog(userId, 'SEND', 'Newsletter', 'bulk', {
      subject: subject.trim(),
      recipientCount: subscribers.length,
      sent,
      failed: failures.length,
    });

    // A partial send is reported as such rather than as plain success: the
    // sender needs to know before they resend to everyone.
    const message =
      failures.length === 0
        ? `Newsletter sent to ${sent} ${sent === 1 ? 'subscriber' : 'subscribers'}`
        : `Sent to ${sent} of ${subscribers.length} subscribers. ${failures.length} failed.`;

    res.status(failures.length === subscribers.length ? 502 : 200).json({
      message,
      recipientCount: subscribers.length,
      sent,
      failed: failures.length,
    });
  } catch (error) {
    console.error('Send newsletter error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Unsubscribe from a link in an e-mail.
 *
 * GET /api/newsletter/unsubscribe?email=…&token=…
 *
 * A GET is used because that is what a click in a mail client produces. The
 * token is what makes it safe to act on a GET: without it, anybody could
 * unsubscribe an address they knew, and link scanners would unsubscribe people
 * just by prefetching.
 *
 * Responses are deliberately uniform for valid tokens whether or not the address
 * was subscribed, so this cannot be used to test who is on the list.
 */
export const unsubscribeByToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, token } = req.query as Record<string, string | undefined>;

    if (!email || !token) {
      res.status(400).json({ error: 'This unsubscribe link is incomplete' });
      return;
    }

    if (!verifyUnsubscribeToken(email, token)) {
      res.status(400).json({ error: 'This unsubscribe link is not valid' });
      return;
    }

    const normalised = email.trim().toLowerCase();

    // updateMany: an address that is not on the list produces no error, which is
    // also what keeps the response identical either way.
    await prisma.newsletterSubscriber.updateMany({
      where: { email: normalised, isActive: true },
      data: { isActive: false, unsubscribedAt: new Date() },
    });

    res.json({ message: 'You have been unsubscribed from PPIA Auckland updates.', email: normalised });
  } catch (error) {
    console.error('Unsubscribe by token error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
