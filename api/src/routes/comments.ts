import { Router } from 'express';
import {
  getArticleComments,
  getResearchComments,
  createPublicComment,
  createComment,
  getAllComments,
  toggleCommentVisibility,
  deleteComment,
  getCommentStats
} from '../controllers/commentController';
import { authenticate, authorize } from '../middleware/auth';
import { publicWriteLimiter } from '../middleware/rate-limit';

const router = Router();

// Public routes
// GET /api/comments/article/:articleId - Get comments for an article
router.get('/article/:articleId', getArticleComments);

// GET /api/comments/research/:researchId - Get comments for a research
router.get('/research/:researchId', getResearchComments);

// POST /api/comments/public - Create a public comment (no auth required).
// Rate limited: an unauthenticated endpoint that writes rows is otherwise an
// open door for comment spam.
router.post('/public', publicWriteLimiter, createPublicComment);

// Protected routes (authenticated users)
router.post('/', authenticate, createComment);

// Admin routes
router.get('/', authenticate, authorize('SUPER_ADMIN', 'BOARD'), getAllComments);
router.get('/stats', authenticate, authorize('SUPER_ADMIN', 'BOARD'), getCommentStats);
router.patch('/:id/visibility', authenticate, authorize('SUPER_ADMIN', 'BOARD'), toggleCommentVisibility);
router.delete('/:id', authenticate, authorize('SUPER_ADMIN', 'BOARD'), deleteComment);

export default router;
