import { Router } from 'express';
import { instagramOAuthStart } from './instagram.controller';
import { authenticate } from '../../middlewares/authenticate';
import { requireActiveAccount } from '../../middlewares/requireActiveAccount';
import { requireBrandAccess } from '../../middlewares/requireBrandAccess';
import { asHandler } from '../../utils/handler';

const router = Router();

router.post(
  '/oauth/start',
  authenticate,
  requireActiveAccount,
  requireBrandAccess,
  asHandler(instagramOAuthStart)
);

export default router;
