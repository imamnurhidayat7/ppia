import { Router } from 'express';
import {
  getArticleAnalytics,
  getResearchAnalytics,
  getDashboardAnalytics,
  trackDownload,
  getResearchDownloadAnalytics,
  getEngagementOverTime
} from '../controllers/analyticsController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Public analytics routes (for public data)
router.get('/articles', getArticleAnalytics);
router.get('/research', getResearchAnalytics);

// Protected routes (admin only)
router.get('/dashboard', authenticate, authorize('SUPER_ADMIN', 'BOARD'), getDashboardAnalytics);
router.get('/engagement', authenticate, authorize('SUPER_ADMIN', 'BOARD'), getEngagementOverTime);

// Download tracking
router.post('/download/:researchId', trackDownload);
router.get('/downloads/:researchId', authenticate, authorize('SUPER_ADMIN', 'BOARD'), getResearchDownloadAnalytics);

export default router;
