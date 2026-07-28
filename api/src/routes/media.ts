import { Router } from 'express';
import { getAllMedia, deleteMedia, updateMedia } from '../controllers/mediaController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// The media library is website content, so BOARD keeps access. The routes used
// to run on `authenticate` alone and relied entirely on controller-side checks.
router.get('/', authenticate, authorize('SUPER_ADMIN', 'BOARD'), getAllMedia);
router.patch('/:id', authenticate, authorize('SUPER_ADMIN', 'BOARD'), updateMedia);
router.delete('/:id', authenticate, authorize('SUPER_ADMIN', 'BOARD'), deleteMedia);

export default router;
