import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { castVote, getMyVote } from '../controllers/voteController';

const router = Router();

router.post('/elections/:id/vote', authenticate, castVote);
router.get('/elections/:id/my-vote', authenticate, getMyVote);

export default router;
