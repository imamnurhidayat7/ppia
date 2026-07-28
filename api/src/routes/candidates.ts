import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  getCandidates,
  registerCandidate,
  approveCandidate,
  rejectCandidate,
  withdrawCandidate,
} from '../controllers/candidateController';

const router = Router();

router.get('/elections/:id/candidates', getCandidates);
router.post('/elections/:id/candidates', authenticate, registerCandidate);
router.patch('/candidates/:id/approve', authenticate, authorize('SUPER_ADMIN'), approveCandidate);
router.patch('/candidates/:id/reject', authenticate, authorize('SUPER_ADMIN'), rejectCandidate);
router.delete('/candidates/:id', authenticate, withdrawCandidate);

export default router;
