import { Router } from 'express';
import { brandsList, brandsCreate } from './brands.controller';
import { authenticate } from '../../middlewares/authenticate';
import { requireActiveAccount } from '../../middlewares/requireActiveAccount';
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

export default router;
