import { Router } from 'express';
import {
  getAllPages,
  getPageById,
  getPageBySlug,
  createPage,
  updatePage,
  deletePage,
  getPagesAdmin,
  getPageAdmin,
  createBlock,
  updateBlock,
  deleteBlock,
  reorderBlocks
} from '../controllers/pageController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Public routes
router.get('/', getAllPages);
router.get('/slug/*slug', getPageBySlug);

// Admin - get all pages (including unpublished) — MUST be before :id param route
router.get('/admin/all', authenticate, authorize('SUPER_ADMIN'), getPagesAdmin);

// Admin - get single page (including unpublished + all blocks)
router.get('/admin/:id', authenticate, authorize('SUPER_ADMIN'), getPageAdmin);

// Protected routes (admin only)
router.post('/', authenticate, authorize('SUPER_ADMIN'), createPage);
router.put('/:id', authenticate, authorize('SUPER_ADMIN'), updatePage);
router.delete('/:id', authenticate, authorize('SUPER_ADMIN'), deletePage);

// Page Block routes (admin only)
router.post('/:id/blocks', authenticate, authorize('SUPER_ADMIN'), createBlock);
router.put('/blocks/:blockId', authenticate, authorize('SUPER_ADMIN'), updateBlock);
router.delete('/blocks/:blockId', authenticate, authorize('SUPER_ADMIN'), deleteBlock);
router.put('/:id/blocks/reorder', authenticate, authorize('SUPER_ADMIN'), reorderBlocks);

// Public single-page routes (must be after admin routes to avoid route hijack)
router.get('/:id', getPageById);

export default router;
