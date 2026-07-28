import { Router } from 'express';
import {
  getAllSections,
  getSectionByKey,
  getAllSectionsAdmin,
  createSection,
  updateSection,
  deleteSection,
  reorderSections,
  createBlock,
  updateBlock,
  deleteBlock,
  reorderBlocks,
} from '../controllers/landingSectionController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// ============================================
// PUBLIC ROUTES
// ============================================

// Get all enabled sections (public)
router.get('/', getAllSections);

// Get section by key (public)
router.get('/key/:key', getSectionByKey);

// ============================================
// ADMIN ROUTES (require authentication + authorization)
// ============================================

// Get all sections with blocks (admin only)
router.get(
  '/admin',
  authenticate,
  authorize('SUPER_ADMIN'),
  getAllSectionsAdmin
);

// Create new section (admin only)
router.post(
  '/',
  authenticate,
  authorize('SUPER_ADMIN'),
  createSection
);

// Reorder sections (admin only)
router.put(
  '/reorder',
  authenticate,
  authorize('SUPER_ADMIN'),
  reorderSections
);

// Update section (admin only)
router.put(
  '/:id',
  authenticate,
  authorize('SUPER_ADMIN'),
  updateSection
);

// Delete section (admin only) - soft delete
router.delete(
  '/:id',
  authenticate,
  authorize('SUPER_ADMIN'),
  deleteSection
);

// ============================================
// BLOCK ROUTES (nested under sections)
// ============================================

// Create block in section (admin only)
router.post(
  '/:id/blocks',
  authenticate,
  authorize('SUPER_ADMIN'),
  createBlock
);

// Reorder blocks within section (admin only)
router.put(
  '/:id/blocks/reorder',
  authenticate,
  authorize('SUPER_ADMIN'),
  reorderBlocks
);

// Update block (admin only)
router.put(
  '/:id/blocks/:blockId',
  authenticate,
  authorize('SUPER_ADMIN'),
  updateBlock
);

// Delete block (admin only)
router.delete(
  '/:id/blocks/:blockId',
  authenticate,
  authorize('SUPER_ADMIN'),
  deleteBlock
);

export default router;
