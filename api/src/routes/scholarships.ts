import { Router } from 'express';
import {
  getAllScholarships,
  getAllScholarshipsAdmin,
  getScholarshipById,
  getScholarshipByIdAdmin,
  getScholarshipBySlug,
  createScholarship,
  updateScholarship,
  deleteScholarship,
} from '../controllers/scholarshipController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Scholarships are website content: only SUPER_ADMIN and BOARD may manage
// them, exactly like articles, events and research.
const manage = authorize('SUPER_ADMIN', 'BOARD');

// Board listings must be declared before '/:id' so they are not swallowed by it.
router.get('/admin/all', authenticate, manage, getAllScholarshipsAdmin);
router.get('/admin/:id', authenticate, manage, getScholarshipByIdAdmin);

// Public routes (published rows only)
router.get('/', getAllScholarships);
router.get('/slug/:slug', getScholarshipBySlug);
router.get('/:id', getScholarshipById);

// Board mutations
router.post('/', authenticate, manage, createScholarship);
router.put('/:id', authenticate, manage, updateScholarship);
router.delete('/:id', authenticate, manage, deleteScholarship);

export default router;
