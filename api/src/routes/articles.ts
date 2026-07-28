import { Router } from 'express';
import {
  getAllArticles,
  getArticleById,
  getArticleBySlug,
  createArticle,
  updateArticle,
  deleteArticle,
  getAllArticlesAdmin
} from '../controllers/articleController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Public routes
router.get('/', getAllArticles);
router.get('/slug/:slug', getArticleBySlug);

// Admin - get all articles (including unpublished) — MUST be before :id param route
router.get('/admin/all', authenticate, authorize('SUPER_ADMIN', 'BOARD'), getAllArticlesAdmin);

// Protected routes (admin only)
router.post('/', authenticate, authorize('SUPER_ADMIN', 'BOARD'), createArticle);
router.put('/:id', authenticate, authorize('SUPER_ADMIN', 'BOARD'), updateArticle);
router.delete('/:id', authenticate, authorize('SUPER_ADMIN', 'BOARD'), deleteArticle);

// Public single-article routes (must be after admin/all to avoid route hijack)
router.get('/:id', getArticleById);

export default router;
