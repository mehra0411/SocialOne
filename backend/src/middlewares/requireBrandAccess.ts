import type { NextFunction, Request, Response } from 'express';
import { getBrandById } from '../modules/brands/brand.repository';

export async function requireBrandAccess(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const brandId =
      (req.params as { brandId?: string } | undefined)?.brandId ??
      ((req.body as { brandId?: string } | undefined)?.brandId ?? undefined);
    if (!brandId) return res.status(400).json({ error: 'Missing brandId' });

    const brand = await getBrandById(brandId, userId);
    if (!brand) return res.status(403).json({ error: 'Forbidden' });

    return next();
  } catch {
    return res.status(500).json({ error: 'Failed to verify brand access' });
  }
}


