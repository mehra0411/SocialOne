import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { requireActiveAccount } from '../../middlewares/requireActiveAccount';
import { requireBrandAccess } from '../../middlewares/requireBrandAccess';
import { reelsGenerate, reelsPublish } from './reels.controller';

const router = Router();

// POST /api/reels/generate
router.post('/generate', authenticate, requireActiveAccount, requireBrandAccess, reelsGenerate);

// POST /api/reels/publish
router.post('/publish', authenticate, requireActiveAccount, requireBrandAccess, reelsPublish);

export default router;


