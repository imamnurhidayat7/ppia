import { Request, Response } from 'express';
import { NotificationType } from '@prisma/client';
import prisma from '../lib/prisma';
import { createAuditLog } from './auditLogController';
import { checkInCodeFor, normaliseCheckInCode } from '../lib/checkin-code';
import { notify } from '../lib/notify';
import {
  sendEmail,
  renderEmailLayout,
  renderEmailButton,
  renderEmailHeading,
  renderEmailDetails,
  escapeHtml,
} from '../lib/mailer';

interface EventRegistrationRequest extends Request {
  body: {
    eventId: string;
  };
}

const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split('#')[0]
  .trim()
  .replace(/\/+$/, '');

/**
 * Attach the derived check-in code to a registration before it goes out.
 *
 * Done at the edge rather than stored, so the code cannot drift out of sync with
 * the id it is derived from.
 */
const withCheckInCode = <T extends { id: string }>(registration: T): T & { checkInCode: string } => ({
  ...registration,
  checkInCode: checkInCodeFor(registration.id),
});

/**
 * Confirm a registration by e-mail and in-app notification.
 *
 * Best effort on both counts: the registration itself already succeeded, so a
 * mail or notification failure must not change the response the member sees.
 */
const confirmRegistration = async (params: {
  userId: string;
  email?: string | null;
  memberName?: string | null;
  eventTitle: string;
  eventSlug: string;
  startDate: Date;
  location?: string | null;
  waitlisted: boolean;
  registrationId: string;
}): Promise<void> => {
  const code = checkInCodeFor(params.registrationId);
  const when = params.startDate.toLocaleString('en-NZ', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'Pacific/Auckland',
  });

  const link = `/dashboard/events/${params.eventSlug}`;

  await notify({
    userId: params.userId,
    type: NotificationType.EVENT_REGISTRATION,
    title: params.waitlisted
      ? `You are on the waitlist for ${params.eventTitle}`
      : `You are registered for ${params.eventTitle}`,
    body: params.waitlisted
      ? 'We will let you know if a place opens up.'
      : `${when}. Check-in code ${code}.`,
    link,
  });

  if (!params.email) return;

  const detailRows = [
    ['When', when],
    ...(params.location ? [['Where', params.location]] : []),
    ...(params.waitlisted ? [] : [['Check-in code', code]]),
  ];

  const eventUrl = `${FRONTEND_URL}/activities/events/${params.eventSlug}`;

  const html = renderEmailLayout(
    `
      ${renderEmailHeading(params.waitlisted ? "You're on the waitlist" : 'Registration confirmed')}
      <p style="margin:0 0 16px;">Hi ${escapeHtml(params.memberName || 'there')},</p>
      <p style="margin:0 0 20px;">${
        params.waitlisted
          ? `<strong>${escapeHtml(params.eventTitle)}</strong> is full, so you've been added to the waitlist. We'll e-mail you if a place opens up.`
          : `You're registered for <strong>${escapeHtml(params.eventTitle)}</strong>.`
      }</p>
      ${renderEmailDetails(detailRows.map(([label, value]) => [label, escapeHtml(value)]))}
      ${
        params.waitlisted
          ? ''
          : `<p style="margin:0 0 8px;">Show the check-in code at the door. You can also add the event to your calendar from the event page:</p>
             ${renderEmailButton(eventUrl, 'View event details')}`
      }
    `,
    {
      preheader: params.waitlisted
        ? `Waitlisted for ${params.eventTitle}`
        : `You are registered for ${params.eventTitle}`,
    }
  );

  await sendEmail({
    to: params.email,
    subject: params.waitlisted
      ? `Waitlisted: ${params.eventTitle}`
      : `Registered: ${params.eventTitle}`,
    html,
    category: params.waitlisted ? 'event-waitlisted' : 'event-registered',
  });
};

// Register for an event
export const registerForEvent = async (req: EventRegistrationRequest, res: Response): Promise<void> => {
  try {
    // @ts-ignore
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { eventId } = req.body;

    if (!eventId) {
      res.status(400).json({ error: 'Event ID is required' });
      return;
    }

    // Check if event exists and is published
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        _count: {
          select: {
            EventRegistration: {
              where: {
                status: { in: ['REGISTERED', 'ATTENDED'] }
              }
            }
          }
        }
      }
    });

    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    if (!event.published) {
      res.status(400).json({ error: 'Event is not available for registration' });
      return;
    }

    // Check if event has already started/passed
    if (event.startDate && new Date() >= new Date(event.startDate)) {
      res.status(400).json({ error: 'Event has already started or passed' });
      return;
    }

    // Check if registration deadline has passed
    if (event.registrationDeadline && new Date() > event.registrationDeadline) {
      res.status(400).json({ error: 'Registration deadline has passed' });
      return;
    }

    // Check capacity
    if (event.capacity && event._count.EventRegistration >= event.capacity) {
      // Add to waitlist
      const registration = await prisma.eventRegistration.create({
        data: {
          eventId,
          userId,
          status: 'WAITLISTED'
        },
        include: {
          Event: true,
          User: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      await createAuditLog(userId, 'CREATE', 'EventRegistration', registration.id, {
        status: 'WAITLISTED',
        eventId
      });

      await confirmRegistration({
        userId,
        email: registration.User.email,
        memberName: registration.User.name,
        eventTitle: registration.Event.title,
        eventSlug: registration.Event.slug,
        startDate: registration.Event.startDate,
        location: registration.Event.location,
        waitlisted: true,
        registrationId: registration.id,
      });

      res.status(201).json({
        message: 'Event is full. You have been added to the waitlist.',
        registration: withCheckInCode(registration)
      });
      return;
    }

    // Check if already registered
    const existingRegistration = await prisma.eventRegistration.findFirst({
      where: {
        eventId,
        userId
      }
    });

    if (existingRegistration) {
      if (existingRegistration.status === 'CANCELLED') {
        // Reactivate registration
        const registration = await prisma.eventRegistration.update({
          where: { id: existingRegistration.id },
          data: { status: 'REGISTERED' },
          include: {
            Event: true,
            User: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        });

        await createAuditLog(userId, 'UPDATE', 'EventRegistration', registration.id, {
          oldStatus: 'CANCELLED',
          newStatus: 'REGISTERED'
        });

        await confirmRegistration({
          userId,
          email: registration.User.email,
          memberName: registration.User.name,
          eventTitle: registration.Event.title,
          eventSlug: registration.Event.slug,
          startDate: registration.Event.startDate,
          location: registration.Event.location,
          waitlisted: false,
          registrationId: registration.id,
        });

        res.json({ message: 'Registration restored', registration: withCheckInCode(registration) });
        return;
      }
      res.status(400).json({ error: 'Already registered for this event' });
      return;
    }

    // Create registration
    const registration = await prisma.eventRegistration.create({
      data: {
        eventId,
        userId,
        status: 'REGISTERED'
      },
      include: {
        Event: true,
        User: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    await createAuditLog(userId, 'CREATE', 'EventRegistration', registration.id, {
      status: 'REGISTERED',
      eventId
    });

    await confirmRegistration({
      userId,
      email: registration.User.email,
      memberName: registration.User.name,
      eventTitle: registration.Event.title,
      eventSlug: registration.Event.slug,
      startDate: registration.Event.startDate,
      location: registration.Event.location,
      waitlisted: false,
      registrationId: registration.id,
    });

    res.status(201).json({
      message: 'Successfully registered for event',
      registration: withCheckInCode(registration)
    });
  } catch (error) {
    console.error('Register for event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Cancel event registration
export const cancelRegistration = async (req: Request, res: Response): Promise<void> => {
  try {
    // @ts-ignore
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const registrationId = String(req.params.registrationId);

    const registration = await prisma.eventRegistration.findUnique({
      where: { id: registrationId }
    });

    if (!registration) {
      res.status(404).json({ error: 'Registration not found' });
      return;
    }

    // Check ownership
    if (registration.userId !== userId) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    const updated = await prisma.eventRegistration.update({
      where: { id: registrationId },
      data: { status: 'CANCELLED' },
      include: {
        Event: true
      }
    });

    await createAuditLog(userId, 'UPDATE', 'EventRegistration', registrationId, {
      oldStatus: registration.status,
      newStatus: 'CANCELLED'
    });

    res.json({ message: 'Registration cancelled', registration: updated });
  } catch (error) {
    console.error('Cancel registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get user's registrations
export const getMyRegistrations = async (req: Request, res: Response): Promise<void> => {
  try {
    // @ts-ignore
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const registrations = await prisma.eventRegistration.findMany({
      where: { userId },
      include: {
        Event: true
      },
      orderBy: { registeredAt: 'desc' }
    });

    // The member needs their own code to show at the door.
    res.json({ registrations: registrations.map(withCheckInCode) });
  } catch (error) {
    console.error('Get registrations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Admin: Get all registrations for an event
export const getEventRegistrations = async (req: Request, res: Response): Promise<void> => {
  try {
    // @ts-ignore
    const userId = req.user?.userId;
    // @ts-ignore
    const userRole = req.user?.role;

    if (!userId || userRole !== 'SUPER_ADMIN') {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    const eventId = String(req.params.eventId);

    const registrations = await prisma.eventRegistration.findMany({
      where: { eventId },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
            studentId: true,
            university: true,
            phone: true
          }
        }
      },
      orderBy: { registeredAt: 'asc' }
    });

    res.json({ registrations: registrations.map(withCheckInCode) });
  } catch (error) {
    console.error('Get event registrations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Admin: Check in attendee
export const checkInAttendee = async (req: Request, res: Response): Promise<void> => {
  try {
    // @ts-ignore
    const userId = req.user?.userId;
    // @ts-ignore
    const userRole = req.user?.role;

    if (!userId || userRole !== 'SUPER_ADMIN') {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    const registrationId = String(req.params.registrationId);

    const registration = await prisma.eventRegistration.update({
      where: { id: registrationId },
      data: {
        status: 'ATTENDED',
        checkedInAt: new Date()
      },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        Event: true
      }
    });

    await createAuditLog(userId, 'UPDATE', 'EventRegistration', registrationId, {
      action: 'CHECK_IN',
      userId: registration.userId
    });

    res.json({ message: 'Attendee checked in', registration: withCheckInCode(registration) });
  } catch (error) {
    console.error('Check in error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Admin: check someone in from the code they show at the door.
 *
 * POST /api/event-registration/event/:eventId/checkin-by-code  { code }
 *
 * Scoped to one event, which is what keeps a six-character code workable: the
 * candidate set is a single guest list, not every registration ever made.
 *
 * Distinct responses matter here because the person at the door has to act on
 * them: an unknown code means check the code, an already-checked-in code means
 * let them through, a cancelled registration means they are not on the list.
 */
export const checkInByCode = async (req: Request, res: Response): Promise<void> => {
  try {
    // @ts-ignore - user is added by auth middleware
    const userId = req.user?.userId;
    // @ts-ignore
    const userRole = req.user?.role;

    if (!userId || userRole !== 'SUPER_ADMIN') {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    const eventId = String(req.params.eventId);
    const { code } = req.body as { code?: string };

    if (!code || typeof code !== 'string') {
      res.status(400).json({ error: 'A check-in code is required' });
      return;
    }

    const wanted = normaliseCheckInCode(code);
    if (wanted.length < 6) {
      res.status(400).json({ error: 'Check-in codes are six characters' });
      return;
    }

    const registrations = await prisma.eventRegistration.findMany({
      where: { eventId },
      include: {
        User: { select: { id: true, name: true, email: true, university: true } },
        Event: { select: { id: true, title: true, slug: true } },
      },
    });

    // Codes are derived, so matching means recomputing them for this event's
    // guest list. Guest lists are small; this is a handful of hashes.
    const matches = registrations.filter(
      (registration) => checkInCodeFor(registration.id) === wanted
    );

    if (matches.length === 0) {
      res.status(404).json({ error: 'No registration for this event matches that code' });
      return;
    }

    if (matches.length > 1) {
      // Six characters over one guest list makes this vanishingly unlikely, but
      // guessing which attendee was meant is not an option.
      res.status(409).json({
        error: 'That code matches more than one registration. Check in from the list instead.',
      });
      return;
    }

    const match = matches[0];

    if (match.status === 'CANCELLED') {
      res.status(409).json({
        error: `${match.User.name} cancelled their registration for this event.`,
        registration: withCheckInCode(match),
      });
      return;
    }

    if (match.checkedInAt) {
      res.json({
        message: `${match.User.name} was already checked in`,
        alreadyCheckedIn: true,
        registration: withCheckInCode(match),
      });
      return;
    }

    const updated = await prisma.eventRegistration.update({
      where: { id: match.id },
      data: { status: 'ATTENDED', checkedInAt: new Date() },
      include: {
        User: { select: { id: true, name: true, email: true, university: true } },
        Event: { select: { id: true, title: true, slug: true } },
      },
    });

    await createAuditLog(userId, 'UPDATE', 'EventRegistration', updated.id, {
      action: 'CHECK_IN_BY_CODE',
      userId: updated.userId,
    });

    res.json({
      message: `${updated.User.name} checked in`,
      alreadyCheckedIn: false,
      registration: withCheckInCode(updated),
    });
  } catch (error) {
    console.error('Check in by code error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Admin: Update registration status
export const updateRegistrationStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    // @ts-ignore
    const userId = req.user?.userId;
    // @ts-ignore
    const userRole = req.user?.role;

    if (!userId || userRole !== 'SUPER_ADMIN') {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    const registrationId = String(req.params.registrationId);
    const status = String(req.body.status);

    const validStatuses = ['REGISTERED', 'CANCELLED', 'WAITLISTED', 'ATTENDED', 'NO_SHOW'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }

    const registration = await prisma.eventRegistration.update({
      where: { id: registrationId },
      data: { status: status as any },
      include: {
        User: {
          select: {
            id: true,
            name: true
          }
        },
        Event: true
      }
    });

    await createAuditLog(userId, 'UPDATE', 'EventRegistration', registrationId, {
      newStatus: status
    });

    res.json({ message: 'Registration updated', registration });
  } catch (error) {
    console.error('Update registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
