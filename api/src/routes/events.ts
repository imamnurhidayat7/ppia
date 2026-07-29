import { Router } from 'express';
import {
  getAllEvents,
  getEventById,
  getEventBySlug,
  createEvent,
  updateEvent,
  deleteEvent,
  getAllEventsAdmin,
  getEventByIdAdmin,
  getEventIcs,
  getEventsIcsFeed
} from '../controllers/eventController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Public routes
router.get('/', getAllEvents);

// Calendar export. Declared before the `/:id` route below so the literal
// `calendar.ics` path is not swallowed as an event id.
router.get('/calendar.ics', getEventsIcsFeed);
router.get('/slug/:slug/calendar.ics', getEventIcs);

router.get('/slug/:slug', getEventBySlug);

// Admin - get all events (including unpublished) — MUST be before :id param route
router.get('/admin/all', authenticate, authorize('SUPER_ADMIN', 'BOARD'), getAllEventsAdmin);

// Admin - get a single event (including unpublished drafts) for the editor.
// Also before the public `/:id` route so it is not treated as an event id.
router.get('/admin/:id', authenticate, authorize('SUPER_ADMIN', 'BOARD'), getEventByIdAdmin);

// Protected routes (admin only)
router.post('/', authenticate, authorize('SUPER_ADMIN', 'BOARD'), createEvent);
router.put('/:id', authenticate, authorize('SUPER_ADMIN', 'BOARD'), updateEvent);
router.delete('/:id', authenticate, authorize('SUPER_ADMIN', 'BOARD'), deleteEvent);

// Public single-event routes (must be after admin/all to avoid route hijack)
router.get('/:id', getEventById);

export default router;
