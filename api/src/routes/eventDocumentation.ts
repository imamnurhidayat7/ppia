import { Router } from 'express';
import {
  getEventDocumentation,
  getPublicEventDocumentation,
  addEventDocumentation,
  updateEventDocumentation,
  deleteEventDocumentation
} from '../controllers/eventDocumentationController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Public: after-event gallery for a published event, by slug. No authentication
// — this is material meant for visitors, and it was previously admin-only.
router.get('/public/:slug', getPublicEventDocumentation);

// Get documentation for an event (admin only)
router.get('/event/:eventId', authenticate, getEventDocumentation);

// Add documentation to an event (admin only - same division or super admin)
router.post('/', authenticate, authorize('SUPER_ADMIN', 'BOARD'), addEventDocumentation);

// Update documentation
router.put('/:id', authenticate, authorize('SUPER_ADMIN', 'BOARD'), updateEventDocumentation);

// Delete documentation
router.delete('/:id', authenticate, authorize('SUPER_ADMIN', 'BOARD'), deleteEventDocumentation);

export default router;
