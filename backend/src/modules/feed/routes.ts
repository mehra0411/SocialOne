import { Router } from 'express';
import multer from 'multer';
import {
  deleteFeedDraft,
  feedGenerate,
  feedImageGenerate,
  feedImageRemove,
  feedListPosts,
  feedPublish,
  feedPublishNow,
} from './feed.controller';
import { authenticate } from '../../middlewares/authenticate';
import { requireActiveAccount } from '../../middlewares/requireActiveAccount';
import { requireBrandAccess } from '../../middlewares/requireBrandAccess';
import { asHandler } from '../../utils/handler';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

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
  (req, res, next) => {
    const ct = String(req.headers['content-type'] ?? '');
    if (ct.includes('multipart/form-data')) {
      return upload.single('referenceImage')(req, res, next);
    }
    return next();
  },
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
