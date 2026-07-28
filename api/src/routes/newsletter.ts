import { Router } from 'express';
import {
  subscribe,
  unsubscribe,
  unsubscribeByToken,
  getSubscribers,
  sendNewsletter
} from '../controllers/newsletterController';
import { authenticate, authorize } from '../middleware/auth';
import { publicWriteLimiter } from '../middleware/rate-limit';

const router = Router();

// Public routes. Both write to the subscriber table on behalf of an
// unauthenticated caller, so they are rate limited per client address.
router.post('/subscribe', publicWriteLimiter, subscribe);
router.post('/unsubscribe', publicWriteLimiter, unsubscribe);

// One-click unsubscribe from a link in an e-mail. A GET because that is what a
// mail client produces; the signed token is what makes acting on it safe.
router.get('/unsubscribe', publicWriteLimiter, unsubscribeByToken);

// Admin routes — subscriber emails and broadcasts are not website content, so
// they stay with SUPER_ADMIN. These previously ran on `authenticate` alone,
// which let any signed-in member read the whole subscriber list.
router.get('/subscribers', authenticate, authorize('SUPER_ADMIN'), getSubscribers);
router.post('/send', authenticate, authorize('SUPER_ADMIN'), sendNewsletter);

export default router;
