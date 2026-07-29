import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { buildIcsCalendar, icsFilename } from '../lib/ics';
import { sanitizeRegistrationFields } from '../lib/event-registration';
import { sanitizeMapEmbedUrl } from '../lib/maps';

interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: string;
    divisionId?: string;
  };
}

// Get all events (public - only published)
export const getAllEvents = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '10', search = '' } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where = {
      published: true,
      ...(search && {
        OR: [
          { title: { contains: search as string, mode: 'insensitive' as const } },
          { description: { contains: search as string, mode: 'insensitive' as const } }
        ]
      })
    };

    // Newest first, same convention as articles/research: the most recently
    // added event leads. `startDate: 'asc'` used to run this list, which put
    // the single oldest event of all time first the moment anything had
    // published — effectively hiding newer events behind it once the list
    // held more rows than the page size.
    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          User: {
            select: { id: true, name: true, avatar: true }
          }
        }
      }),
      prisma.event.count({ where })
    ]);

    res.json({
      events,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get single event (public - only published)
export const getEventById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        User: {
          select: { id: true, name: true, avatar: true }
        }
      }
    });

    if (!event || !event.published) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    res.json({ event });
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get event by slug (public)
export const getEventBySlug = async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params as { slug: string };

    const event = await prisma.event.findUnique({
      where: { slug },
      include: {
        User: {
          select: { id: true, name: true, avatar: true }
        }
      }
    });

    if (!event || !event.published) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    res.json({ event });
  } catch (error) {
    console.error('Get event by slug error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create event (admin only - BOARD must be in same division)
export const createEvent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const userDivisionId = req.user?.divisionId;

    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const {
      title,
      slug,
      description,
      content,
      imageUrl,
      startDate,
      endDate,
      location,
      locationMapUrl,
      divisionId,
      published,
      registrationFields
    } = req.body;

    const cleanedFields = sanitizeRegistrationFields(registrationFields);
    const cleanedMapUrl = sanitizeMapEmbedUrl(locationMapUrl);

    // BOARD can only create events for their own division. Leaving the division
    // unset is allowed — the create below falls back to the member's own
    // division — so only an explicit *other* division is refused. Comparing
    // strictly also rejected the common "no division selected" case.
    if (userRole === 'BOARD' && divisionId && divisionId !== userDivisionId) {
      res.status(403).json({ error: 'You can only create events for your division' });
      return;
    }

    // Check if slug already exists
    const existingEvent = await prisma.event.findUnique({
      where: { slug }
    });

    if (existingEvent) {
      res.status(400).json({ error: 'Slug already exists' });
      return;
    }

    const event = await prisma.event.create({
      data: {
        title,
        slug,
        description,
        content: content || {},
        imageUrl,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        location,
        locationMapUrl: cleanedMapUrl,
        divisionId: divisionId || userDivisionId || null,
        published: published || false,
        ...(cleanedFields !== undefined && {
          registrationFields: cleanedFields as unknown as Prisma.InputJsonValue,
        }),
        authorId: userId
      },
      include: {
        User: {
          select: { id: true, name: true, avatar: true }
        },
        Division: {
          select: { id: true, name: true, slug: true }
        }
      }
    });

    res.status(201).json({ event });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update event (admin only - BOARD can only update their division's events)
export const updateEvent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const userDivisionId = req.user?.divisionId;

    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { id } = req.params as { id: string };
    const {
      title,
      slug,
      description,
      content,
      imageUrl,
      startDate,
      endDate,
      location,
      locationMapUrl,
      divisionId,
      published,
      registrationFields
    } = req.body;

    const cleanedFields = sanitizeRegistrationFields(registrationFields);

    // Check if event exists
    const event = await prisma.event.findUnique({
      where: { id },
      include: { Division: true }
    });

    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    // BOARD can update its own division's events and events with no division.
    if (userRole === 'BOARD' && event.divisionId && event.divisionId !== userDivisionId) {
      res.status(403).json({ error: 'You can only update events in your division' });
      return;
    }

    // BOARD cannot change division
    if (userRole === 'BOARD' && divisionId && divisionId !== userDivisionId) {
      res.status(403).json({ error: 'You cannot change the division' });
      return;
    }

    // BOARD cannot change division
    if (userRole === 'BOARD' && divisionId && divisionId !== userDivisionId) {
      res.status(403).json({ error: 'You cannot change the division' });
      return;
    }

    // Check slug uniqueness if changed
    if (slug && slug !== event.slug) {
      const slugExists = await prisma.event.findUnique({ where: { slug } });
      if (slugExists) {
        res.status(400).json({ error: 'Slug already exists' });
        return;
      }
    }

    // `locationMapUrl` may be cleared, so an explicit empty string must reach
    // the update as null rather than being skipped like an unset field.
    const cleanedMapUrl =
      locationMapUrl !== undefined ? sanitizeMapEmbedUrl(locationMapUrl) : undefined;

    const updatedEvent = await prisma.event.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(slug && { slug }),
        ...(description && { description }),
        ...(content && { content }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(location !== undefined && { location }),
        ...(cleanedMapUrl !== undefined && { locationMapUrl: cleanedMapUrl }),
        ...(divisionId !== undefined && { divisionId }),
        ...(published !== undefined && { published }),
        ...(cleanedFields !== undefined && {
          registrationFields: cleanedFields as unknown as Prisma.InputJsonValue,
        })
      },
      include: {
        User: {
          select: { id: true, name: true, avatar: true }
        },
        Division: {
          select: { id: true, name: true, slug: true }
        }
      }
    });

    res.json({ event: updatedEvent });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete event (admin only - BOARD can only delete their division's events)
export const deleteEvent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const userDivisionId = req.user?.divisionId;

    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { id } = req.params as { id: string };

    const event = await prisma.event.findUnique({
      where: { id },
      include: { Division: true }
    });

    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    // BOARD can delete its own division's events and events with no division.
    if (userRole === 'BOARD' && event.divisionId && event.divisionId !== userDivisionId) {
      res.status(403).json({ error: 'You can only delete events in your division' });
      return;
    }

    await prisma.event.delete({ where: { id } });

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all events (admin - BOARD only sees their division)
/**
 * Fetch a single event for the admin editor, including unpublished drafts.
 *
 * The public `getEventById` 404s anything not published, which meant an admin
 * could never open a draft to edit or publish it. This admin-only variant
 * returns the event regardless of status; BOARD is still limited to its own
 * division, matching the admin listing.
 */
export const getEventByIdAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const userDivisionId = req.user?.divisionId;

    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { id } = req.params as { id: string };

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        User: { select: { id: true, name: true, avatar: true } },
        Division: { select: { id: true, name: true, slug: true } }
      }
    });

    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    // BOARD can view its own division's events and events with no division,
    // matching what the admin listing shows.
    if (userRole === 'BOARD' && event.divisionId && event.divisionId !== userDivisionId) {
      res.status(403).json({ error: 'You can only view events in your division' });
      return;
    }

    res.json({ event });
  } catch (error) {
    console.error('Get event (admin) error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export const getAllEventsAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const userDivisionId = req.user?.divisionId;

    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { page = '1', limit = '10' } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    /**
     * BOARD sees its own division's events plus any event with no division.
     *
     * Filtering on `divisionId` alone returned nothing for a BOARD member,
     * because events created without picking a division are stored with
     * `divisionId: null` and so matched no division at all — the events list
     * looked empty even though events existed.
     */
    const where: any = {};
    if (userRole === 'BOARD') {
      where.OR = [{ divisionId: userDivisionId ?? null }, { divisionId: null }];
    }

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          User: {
            select: { id: true, name: true, avatar: true }
          }
        }
      }),
      // Count the same set that is listed; an unfiltered count reported totals
      // (and page counts) that did not match what BOARD could actually see.
      prisma.event.count({ where })
    ]);

    res.json({
      events,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get events admin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ===========================================
// CALENDAR EXPORT (iCalendar / .ics)
// ===========================================

/**
 * Public base URL of the website, used to build the canonical event link that
 * goes inside the calendar entry.
 */
const CALENDAR_FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split('#')[0]
  .trim()
  .replace(/\/+$/, '');

const eventPublicUrl = (slug: string): string =>
  `${CALENDAR_FRONTEND_URL}/activities/events/${slug}`;

/** Fields needed to serialise a VEVENT — nothing more leaves the database. */
const CALENDAR_EVENT_SELECT = {
  id: true,
  title: true,
  slug: true,
  description: true,
  location: true,
  startDate: true,
  endDate: true,
  updatedAt: true,
} as const;

/**
 * Send an .ics document.
 *
 * `text/calendar` is what makes a browser or mail client hand the file to the
 * calendar app instead of displaying it. The filename is sanitised in
 * `icsFilename` because event titles are CMS-controlled.
 */
const sendIcs = (res: Response, body: string, filename: string, cacheSeconds: number): void => {
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Cache-Control', `public, max-age=${cacheSeconds}`);
  res.send(body);
};

/**
 * One event as a downloadable calendar entry.
 *
 * GET /api/events/slug/:slug/calendar.ics
 *
 * Only published events are exposed, matching `getEventBySlug`. Unpublished
 * events must not become readable through a second door.
 */
export const getEventIcs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params as { slug: string };

    const event = await prisma.event.findUnique({
      where: { slug },
      select: { ...CALENDAR_EVENT_SELECT, published: true },
    });

    if (!event || !event.published) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    const body = buildIcsCalendar(
      [
        {
          id: event.id,
          title: event.title,
          description: event.description,
          location: event.location,
          startDate: event.startDate,
          endDate: event.endDate,
          updatedAt: event.updatedAt,
          url: eventPublicUrl(event.slug),
        },
      ],
      { calendarName: `PPIA Auckland — ${event.title}` }
    );

    // A single entry is effectively immutable once downloaded; a short cache is
    // enough to absorb repeat clicks.
    sendIcs(res, body, icsFilename(event.slug), 300);
  } catch (error) {
    console.error('Get event ics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Subscribable feed of the whole programme.
 *
 * GET /api/events/calendar.ics
 *
 * Clients poll this URL, so it includes recently finished events as well as
 * upcoming ones: dropping an event the moment it ends would delete it from a
 * subscriber's calendar history.
 */
export const getEventsIcsFeed = async (_req: Request, res: Response): Promise<void> => {
  try {
    const sixMonthsAgo = new Date(Date.now() - 182 * 24 * 60 * 60 * 1000);

    const events = await prisma.event.findMany({
      where: {
        published: true,
        startDate: { gte: sixMonthsAgo },
      },
      select: CALENDAR_EVENT_SELECT,
      orderBy: { startDate: 'asc' },
      // Guard against an unbounded response if the calendar ever grows large.
      take: 500,
    });

    const body = buildIcsCalendar(
      events.map((event) => ({
        id: event.id,
        title: event.title,
        description: event.description,
        location: event.location,
        startDate: event.startDate,
        endDate: event.endDate,
        updatedAt: event.updatedAt,
        url: eventPublicUrl(event.slug),
      })),
      { calendarName: 'PPIA Auckland Events' }
    );

    // Subscribers refetch on their own schedule; an hour keeps them current
    // without hammering the API.
    sendIcs(res, body, 'ppia-auckland-events.ics', 3600);
  } catch (error) {
    console.error('Get events ics feed error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
