import { Router } from 'express';
import { getYouTubeFeed } from '../controllers/youtubeController';

const router = Router();

// Public feed of the PPI Auckland YouTube channel (cached server-side).
router.get('/feed', getYouTubeFeed);

export default router;
