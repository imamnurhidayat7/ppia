import { Router } from 'express';
import {
  getAllResearch,
  getAllResearchAdmin,
  getResearchById,
  getResearchByIdAdmin,
  getResearchBySlug,
  trackResearchView,
  createResearch,
  updateResearch,
  deleteResearch
} from '../controllers/researchController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Admin listings must be declared before '/:id' so they are not swallowed by it.
// Research is website content, so BOARD keeps access alongside SUPER_ADMIN.
router.get('/admin/all', authenticate, authorize('SUPER_ADMIN', 'BOARD'), getAllResearchAdmin);
router.get('/admin/:id', authenticate, authorize('SUPER_ADMIN', 'BOARD'), getResearchByIdAdmin);

// Public routes
router.get('/', getAllResearch);
router.get('/slug/:slug', getResearchBySlug);
router.get('/:id', getResearchById);

// Track view (public, called from client-side useEffect — NOT SSR)
router.post('/:id/view', trackResearchView);

// Admin mutations
router.post('/', authenticate, authorize('SUPER_ADMIN', 'BOARD'), createResearch);
router.put('/:id', authenticate, authorize('SUPER_ADMIN', 'BOARD'), updateResearch);
router.delete('/:id', authenticate, authorize('SUPER_ADMIN', 'BOARD'), deleteResearch);

export default router;
