import { Router } from 'express';
import { getPublicProfileByUsername } from '../controllers/authController';

const router = Router();

// Public profile by username — no auth, returns safe fields only
router.get('/username/:username', getPublicProfileByUsername);

export default router;
