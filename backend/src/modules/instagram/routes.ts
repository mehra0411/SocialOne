import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { requireActiveAccount } from '../../middlewares/requireActiveAccount';
import { instagramOAuthStart } from './instagram.controller';

const router = Router();

// POST /api/instagram/oauth/start
router.post('/oauth/start', authenticate, requireActiveAccount, instagramOAuthStart);

export default router;


