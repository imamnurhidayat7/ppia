import { Router } from 'express';
import { upload, uploadFile, uploadDocument, uploadDocumentFile } from '../controllers/uploadController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Upload file — authenticated users only
router.post('/', authenticate, upload.single('file'), uploadFile);

// Upload registration document (PDF, max 2MB) — public, used during registration
router.post('/document', uploadDocument.single('file'), uploadDocumentFile);

export default router;
