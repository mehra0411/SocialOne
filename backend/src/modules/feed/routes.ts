import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { requireActiveAccount } from '../../middlewares/requireActiveAccount';
import { requireBrandAccess } from '../../middlewares/requireBrandAccess';
import { feedGenerate, feedPublish } from './feed.controller';

const router = Router();

// POST /api/feed/generate
router.post('/generate', authenticate, requireActiveAccount, requireBrandAccess, feedGenerate);

// POST /api/feed/publish
router.post('/publish', authenticate, requireActiveAccount, requireBrandAccess, feedPublish);

export default router;


