import { Router } from 'express';
import {
  registerForEvent,
  cancelRegistration,
  getMyRegistrations,
  getEventRegistrations,
  checkInAttendee,
  checkInByCode,
  updateRegistrationStatus
} from '../controllers/eventRegistrationController';
import { authenticate, authorize, optionalAuthenticate } from '../middleware/auth';

const router = Router();

// Registration is open to everyone: a signed-in member is linked to their
// account, a guest supplies their own name and e-mail.
router.post('/', optionalAuthenticate, registerForEvent);
router.get('/my', authenticate, getMyRegistrations);
router.delete('/:registrationId', authenticate, cancelRegistration);

// Admin routes — attendee lists are member data rather than website content,
// so BOARD (content editors) no longer reach them.
router.get('/event/:eventId', authenticate, authorize('SUPER_ADMIN'), getEventRegistrations);
// Check someone in from the code they show at the door, scoped to one event.
router.post('/event/:eventId/checkin-by-code', authenticate, authorize('SUPER_ADMIN'), checkInByCode);
router.patch('/:registrationId/checkin', authenticate, authorize('SUPER_ADMIN'), checkInAttendee);
router.patch('/:registrationId/status', authenticate, authorize('SUPER_ADMIN'), updateRegistrationStatus);

export default router;
