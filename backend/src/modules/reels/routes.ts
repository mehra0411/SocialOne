import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { requireActiveAccount } from '../../middlewares/requireActiveAccount';

const router = Router();

// Reel generation
router.post('/generate', authenticate, requireActiveAccount, (_req, res) => {
  return res.status(501).json({ error: 'Not implemented' });
});

// Reel publishing
router.post('/publish', authenticate, requireActiveAccount, (_req, res) => {
  return res.status(501).json({ error: 'Not implemented' });
});

export default router;


