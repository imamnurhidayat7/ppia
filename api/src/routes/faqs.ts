import { Router } from 'express';
import { listFaqs, getFaq, createFaq, updateFaq, deleteFaq } from '../controllers/faqController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

/**
 * Reading FAQs is public — the contact and landing pages render them for
 * anonymous visitors.
 *
 * Writing is not. These three routes previously carried no middleware at all,
 * so anyone on the internet could create, rewrite or delete any FAQ entry with
 * a plain HTTP request. They now match the authorisation used by every other
 * content resource (see routes/articles.ts).
 */

// Public
router.get('/', listFaqs);
router.get('/:id', getFaq);

// Admin only
router.post('/', authenticate, authorize('SUPER_ADMIN', 'BOARD'), createFaq);
router.put('/:id', authenticate, authorize('SUPER_ADMIN', 'BOARD'), updateFaq);
router.delete('/:id', authenticate, authorize('SUPER_ADMIN', 'BOARD'), deleteFaq);

export default router;
