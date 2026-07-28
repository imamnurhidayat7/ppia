import { Router } from 'express';
import { getAuditLogs, getEntityAuditLogs } from '../controllers/auditLogController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Audit trails are SUPER_ADMIN only. The controllers already checked the role,
// but the route now rejects earlier instead of relying on that alone.
router.get('/', authenticate, authorize('SUPER_ADMIN'), getAuditLogs);
router.get('/entity/:entity/:entityId', authenticate, authorize('SUPER_ADMIN'), getEntityAuditLogs);

export default router;
