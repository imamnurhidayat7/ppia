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
import {
  getFormFields,
  createFormField,
  updateFormField,
  deleteFormField,
  reorderFormFields,
} from '../controllers/formFieldController';

const router = Router();

router.get('/', getElections);
router.get('/active', getActiveElection);
router.get('/:id', getElectionById);
router.get('/:id/results', getResults);
router.post('/', authenticate, authorize('SUPER_ADMIN'), createElection);
router.patch('/:id', authenticate, authorize('SUPER_ADMIN'), updateElection);
router.delete('/:id', authenticate, authorize('SUPER_ADMIN'), deleteElection);
router.get('/:id/voters', authenticate, authorize('SUPER_ADMIN'), getVoters);

// Custom registration form fields — Super Admin only.
router.get('/:id/form-fields', getFormFields);
router.post('/:id/form-fields', authenticate, authorize('SUPER_ADMIN'), createFormField);
router.post('/:id/form-fields/reorder', authenticate, authorize('SUPER_ADMIN'), reorderFormFields);
router.patch('/form-fields/:fieldId', authenticate, authorize('SUPER_ADMIN'), updateFormField);
router.delete('/form-fields/:fieldId', authenticate, authorize('SUPER_ADMIN'), deleteFormField);

export default router;
