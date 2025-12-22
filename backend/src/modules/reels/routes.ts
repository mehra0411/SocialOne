import { Router } from 'express';
import { reelsGenerate, reelsListPosts, reelsPublish, reelsPublishNow } from './reels.controller';
import { authenticate } from '../../middlewares/authenticate';
import { requireActiveAccount } from '../../middlewares/requireActiveAccount';
import { requireBrandAccess } from '../../middlewares/requireBrandAccess';
import { asHandler } from '../../types/asHandler';

const router = Router();

router.get(
  '/:brandId/posts',
  authenticate,
  requireActiveAccount,
  requireBrandAccess,
  asHandler(reelsListPosts)
);

router.post(
  '/generate',
  authenticate,
  requireActiveAccount,
  requireBrandAccess,
  asHandler(reelsGenerate)
);

router.post(
  '/publish',
  authenticate,
  requireActiveAccount,
  requireBrandAccess,
  asHandler(reelsPublish)
);

router.post(
  '/publish-now',
  authenticate,
  requireActiveAccount,
  requireBrandAccess,
  asHandler(reelsPublishNow)
);

export default router;
