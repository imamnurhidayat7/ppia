import { Router } from 'express';
import {
  getAllMembers,
  getMemberById,
  updateMember,
  deleteMember,
  getMembersStats,
  approveMember,
  rejectMember,
  getMemberDirectory,
  getMemberDocumentUrl
} from '../controllers/memberController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Public route - get member stats
router.get('/stats', getMembersStats);

// Member directory — any signed-in member, no role gate. Returns a narrower
// field set than the admin list (no contact details); see USER_DIRECTORY_SELECT.
// Declared before `/:id` so the literal path is not read as a member id.
router.get('/directory', authenticate, getMemberDirectory);

// Protected routes
router.get('/', authenticate, authorize('SUPER_ADMIN'), getAllMembers);
router.get('/:id', authenticate, getMemberById);
// Short-lived signed URL for the member's private proof-of-studentship document.
router.get('/:id/document-url', authenticate, authorize('SUPER_ADMIN'), getMemberDocumentUrl);
router.put('/:id', authenticate, authorize('SUPER_ADMIN'), updateMember);
router.patch('/:id/approve', authenticate, authorize('SUPER_ADMIN'), approveMember);
router.patch('/:id/reject', authenticate, authorize('SUPER_ADMIN'), rejectMember);
router.delete('/:id', authenticate, authorize('SUPER_ADMIN'), deleteMember);

export default router;
