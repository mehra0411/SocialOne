import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { requireAdmin } from '../../middlewares/requireAdmin';
import { adminListBrandMetadata, adminListUsers, adminUpdateUserAccountStatus } from './admin.controller';

const router = Router();

router.get('/users', authenticate, requireAdmin, adminListUsers);
router.patch('/users/:userId/account-status', authenticate, requireAdmin, adminUpdateUserAccountStatus);
router.get('/brands', authenticate, requireAdmin, adminListBrandMetadata);

export default router;


