import { Router } from 'express';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from '../controllers/notificationController';
import { authenticate } from '../middleware/auth';

const router = Router();

// A notification belongs to exactly one member, so authentication is the only
// gate; there is no role dimension and no create endpoint (see lib/notify.ts).
router.use(authenticate);

router.get('/', getNotifications);

// Declared before `/:id/...` so the literal path is not read as an id.
router.post('/read-all', markAllNotificationsRead);

router.patch('/:id/read', markNotificationRead);
router.delete('/:id', deleteNotification);

export default router;
