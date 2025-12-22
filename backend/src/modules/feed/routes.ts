import { Router } from 'express';
import { feedGenerate, feedListPosts, feedPublish, feedPublishNow } from './feed.controller';
import { authenticate } from '../../middlewares/authenticate';
import { requireActiveAccount } from '../../middlewares/requireActiveAccount';
import { requireBrandAccess } from '../../middlewares/requireBrandAccess';
import { asHandler } from '../../utils/handler';

const router = Router();

router.get(
  '/:brandId/posts',
  authenticate,
  requireActiveAccount,
  requireBrandAccess,
  asHandler(feedListPosts)
);

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

router.post(
  '/publish-now',
  authenticate,
  requireActiveAccount,
  requireBrandAccess,
  asHandler(feedPublishNow)
);

export default router;
