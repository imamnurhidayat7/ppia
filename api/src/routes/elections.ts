import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  getElections,
  getActiveElection,
  getElectionById,
  createElection,
  updateElection,
  deleteElection,
  getResults,
  getVoters,
} from '../controllers/electionController';

const router = Router();

router.get('/', getElections);
router.get('/active', getActiveElection);
router.get('/:id', getElectionById);
router.get('/:id/results', getResults);
router.post('/', authenticate, authorize('SUPER_ADMIN'), createElection);
router.patch('/:id', authenticate, authorize('SUPER_ADMIN'), updateElection);
router.delete('/:id', authenticate, authorize('SUPER_ADMIN'), deleteElection);
router.get('/:id/voters', authenticate, authorize('SUPER_ADMIN'), getVoters);

export default router;
