import { Router } from 'express';
import { getBlockData } from '../controllers/blockDataController';

const router = Router();

router.get('/data', getBlockData);

export default router;
