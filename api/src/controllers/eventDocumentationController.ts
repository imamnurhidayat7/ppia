import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { createAuditLog } from './auditLogController';

interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: string;
    divisionId?: string;
  };
}

// Get documentation for an event
export const getEventDocumentation = async (req: Request, res: Response): Promise<void> => {
  try {
    // @ts-ignore
    const userId = req.user?.userId;
    // @ts-ignore
    const userRole = req.user?.role;

    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const eventId = String(req.params.eventId);

    // Check if user is admin
    if (userRole !== 'SUPER_ADMIN' && userRole !== 'BOARD') {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    const documentation = await prisma.eventDocumentation.findMany({
      where: { eventId },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ documentation });
  } catch (error) {
    console.error('Get event documentation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Public: documentation for one published event, by slug.
 *
 * GET /api/event-documentation/public/:slug
 *
 * `getEventDocumentation` above requires an admin session, which meant the
 * photos and recordings the committee uploads after an event were only ever
 * visible to the committee. This is the read path for everybody else.
 *
 * Keyed by slug rather than id because that is what the public event page has,
 * and it only answers for published events — documentation must not become a
 * side door onto an unpublished one.
 */
export const getPublicEventDocumentation = async (req: Request, res: Response): Promise<void> => {
  try {
    const slug = String(req.params.slug);

    const event = await prisma.event.findUnique({
      where: { slug },
      select: { id: true, published: true, title: true, startDate: true },
    });

    if (!event || !event.published) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    const documentation = await prisma.eventDocumentation.findMany({
      where: { eventId: event.id },
      select: {
        id: true,
        type: true,
        url: true,
        title: true,
        description: true,
        createdAt: true,
      },
      // Oldest first: an after-event gallery reads as a sequence, not a feed.
      orderBy: { createdAt: 'asc' },
    });

    res.json({
      event: { id: event.id, title: event.title, startDate: event.startDate },
      documentation,
      counts: {
        photos: documentation.filter((item) => item.type === 'PHOTO').length,
        videos: documentation.filter((item) => item.type === 'VIDEO').length,
        links: documentation.filter((item) => item.type === 'LINK').length,
      },
    });
  } catch (error) {
    console.error('Get public event documentation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Add documentation to an event
export const addEventDocumentation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const userDivisionId = req.user?.divisionId;

    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { eventId, type, url, title, description } = req.body;

    if (!eventId || !type || !url) {
      res.status(400).json({ error: 'Event ID, type, and URL are required' });
      return;
    }

    // Check event exists and user has permission
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { Division: true }
    });

    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    // BOARD can only add documentation to their division's events
    if (userRole === 'BOARD' && event.divisionId !== userDivisionId) {
      res.status(403).json({ error: 'You can only add documentation to your division events' });
      return;
    }

    const validTypes = ['PHOTO', 'VIDEO', 'LINK'];
    if (!validTypes.includes(type)) {
      res.status(400).json({ error: 'Invalid documentation type' });
      return;
    }

    const documentation = await prisma.eventDocumentation.create({
      data: {
        eventId,
        type,
        url,
        title,
        description
      }
    });

    await createAuditLog(userId, 'CREATE', 'EventDocumentation', documentation.id, {
      eventId,
      type,
      title
    });

    res.status(201).json({ documentation });
  } catch (error) {
    console.error('Add event documentation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update documentation
export const updateEventDocumentation = async (req: Request, res: Response): Promise<void> => {
  try {
    // @ts-ignore
    const userId = req.user?.userId;
    // @ts-ignore
    const userRole = req.user?.role;

    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (userRole !== 'SUPER_ADMIN' && userRole !== 'BOARD') {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    const docId = String(req.params.id);
    const { type, url, title, description } = req.body;

    const existing = await prisma.eventDocumentation.findUnique({
      where: { id: docId }
    });

    if (!existing) {
      res.status(404).json({ error: 'Documentation not found' });
      return;
    }

    const documentation = await prisma.eventDocumentation.update({
      where: { id: docId },
      data: {
        ...(type && { type }),
        ...(url && { url }),
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description })
      }
    });

    await createAuditLog(userId, 'UPDATE', 'EventDocumentation', docId, {
      changes: { type, url, title, description }
    });

    res.json({ documentation });
  } catch (error) {
    console.error('Update event documentation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete documentation
export const deleteEventDocumentation = async (req: Request, res: Response): Promise<void> => {
  try {
    // @ts-ignore
    const userId = req.user?.userId;
    // @ts-ignore
    const userRole = req.user?.role;

    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (userRole !== 'SUPER_ADMIN' && userRole !== 'BOARD') {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    const docId = String(req.params.id);

    const existing = await prisma.eventDocumentation.findUnique({
      where: { id: docId }
    });

    if (!existing) {
      res.status(404).json({ error: 'Documentation not found' });
      return;
    }

    await prisma.eventDocumentation.delete({
      where: { id: docId }
    });

    await createAuditLog(userId, 'DELETE', 'EventDocumentation', docId, {
      eventId: existing.eventId
    });

    res.json({ message: 'Documentation deleted successfully' });
  } catch (error) {
    console.error('Delete event documentation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
