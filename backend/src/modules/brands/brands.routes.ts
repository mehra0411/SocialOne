import { Router } from 'express';
import { brandsList, brandsCreate } from './brands.controller';
import { brandPlatformsStatus } from './brands.platforms.controller';
import { authenticate } from '../../middlewares/authenticate';
import { requireActiveAccount } from '../../middlewares/requireActiveAccount';
import { requireBrandAccess } from '../../middlewares/requireBrandAccess';
import { asHandler } from '../../types/asHandler';

const router = Router();

/**
 * GET /api/brands
 */
router.get(
  '/',
  authenticate,
  requireActiveAccount,
  asHandler(brandsList)
);

/**
 * POST /api/brands
 */
router.post(
  '/',
  authenticate,
  requireActiveAccount,
  asHandler(brandsCreate)
);

/**
 * GET /api/brands/:brandId/platforms
 */
router.get(
  '/:brandId/platforms',
  authenticate,
  requireActiveAccount,
  requireBrandAccess,
  asHandler(brandPlatformsStatus),
);

export default router;
