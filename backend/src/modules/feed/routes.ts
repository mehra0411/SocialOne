import { Router } from 'express';
import { feedGenerate, feedPublish } from './feed.controller';
import { authenticate } from '../../middlewares/authenticate';
import { requireActiveAccount } from '../../middlewares/requireActiveAccount';
import { requireBrandAccess } from '../../middlewares/requireBrandAccess';
import { asHandler } from '../../utils/handler';

const router = Router();

router.post(
  '/generate',
  authenticate,
  requireActiveAccount,
  requireBrandAccess,
  asHandler(feedGenerate)
);

router.post(
  '/publish',
  authenticate,
  requireActiveAccount,
  requireBrandAccess,
  asHandler(feedPublish)
);

export default router;
