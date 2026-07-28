import { Router } from 'express';
import {
  getAllDivisions,
  getDivisionById,
  createDivision,
  updateDivision,
  deleteDivision
} from '../controllers/divisionController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Public routes
router.get('/', getAllDivisions);
router.get('/:id', getDivisionById);

// Protected routes (super admin only)
router.post('/', authenticate, authorize('SUPER_ADMIN'), createDivision);
router.put('/:id', authenticate, authorize('SUPER_ADMIN'), updateDivision);
router.delete('/:id', authenticate, authorize('SUPER_ADMIN'), deleteDivision);

export default router;
