import { Router } from 'express';
import {
  getPublicSettings,
  getMemberSettings,
  getAllSettings,
  updateSettings
} from '../controllers/settingsController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Public route — safe subset only. The WhatsApp invite is no longer part of it.
router.get('/', getPublicSettings);

// Signed-in members. This is where the dashboard reads the WhatsApp invite from;
// it needs a session because the link is a credential for joining the group.
router.get('/member', authenticate, getMemberSettings);

// Admin-only routes
router.get('/all', authenticate, authorize('SUPER_ADMIN'), getAllSettings);
router.put('/', authenticate, authorize('SUPER_ADMIN'), updateSettings);

export default router;
