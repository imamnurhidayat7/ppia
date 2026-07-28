import { Router } from 'express';
import {
  getAllTags,
  getTagById,
  getTagBySlug,
  createTag,
  updateTag,
  deleteTag
} from '../controllers/tagController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Public routes
router.get('/', getAllTags);
router.get('/:id', getTagById);
router.get('/slug/:slug', getTagBySlug);

// Admin routes
router.post('/', authenticate, authorize('SUPER_ADMIN', 'BOARD'), createTag);
router.put('/:id', authenticate, authorize('SUPER_ADMIN', 'BOARD'), updateTag);
router.delete('/:id', authenticate, authorize('SUPER_ADMIN', 'BOARD'), deleteTag);

export default router;