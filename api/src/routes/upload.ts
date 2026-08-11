import { Router } from 'express';
import { upload, uploadFile, uploadDocument, uploadDocumentFile } from '../controllers/uploadController';
import { authenticate, authorize } from '../middleware/auth';
import { publicWriteLimiter } from '../middleware/rate-limit';

const router = Router();

// Upload file — authenticated users only
router.post('/', authenticate, upload.single('file'), uploadFile);

// Upload registration document (PDF, max 2MB) — public, used during registration.
// Rate-limited to stop anonymous abuse (storage flooding, scanner bait).
router.post('/document', publicWriteLimiter, uploadDocument.single('file'), uploadDocumentFile);

export default router;
