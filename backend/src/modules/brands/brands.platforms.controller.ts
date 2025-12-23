import type { Response } from 'express';
import type { AuthenticatedRequest } from '../../types/auth';
import { getLatestInstagramAccountByBrandId } from '../instagram/instagram-accounts.repository';

/**
 * GET /api/brands/:brandId/platforms
 * Read-only: returns platform connection status for this brand.
 */
export async function brandPlatformsStatus(req: AuthenticatedRequest, res: Response) {
  const brandId = req.params.brandId;
  if (!brandId) return res.status(400).json({ error: 'Missing brandId' });

  // Brand access is enforced by existing middleware on the route.
  const ig = await getLatestInstagramAccountByBrandId(brandId);

  if (!ig) {
    return res.json({
      platform: 'instagram',
      connected: false,
      accountName: null,
      expiresAt: null,
    });
  }

  const hasToken = Boolean(ig.access_token_encrypted);
  const isConnected = ig.status === 'connected' && hasToken;

  return res.json({
    platform: 'instagram',
    connected: isConnected,
    // We don't have "account name" stored; return a stable identifier if present.
    accountName: ig.instagram_user_id ?? null,
    // Not available in current schema. Kept for forward compatibility.
    expiresAt: null,
  });
}


