import { Router } from 'express';
import { deleteFeedDraft, feedGenerate, feedImageGenerate, feedImageRemove, feedListPosts, feedPublish, feedPublishNow } from './feed.controller';
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

router.post(
  '/image/generate',
  authenticate,
  requireActiveAccount,
  requireBrandAccess,
  asHandler(feedImageGenerate)
);

router.post(
  '/image/remove',
  authenticate,
  requireActiveAccount,
  requireBrandAccess,
  asHandler(feedImageRemove)
);

router.delete(
  '/:feedPostId',
  authenticate,
  requireActiveAccount,
  requireBrandAccess,
  asHandler(deleteFeedDraft)
);

export default router;
