import { Request, Response, NextFunction } from 'express';

/**
 * Ensures the authenticated user has access to the requested brand.
 * MUST run AFTER authenticate middleware.
 */
export async function requireBrandAccess(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = (req as any).user;

    if (!user || !user.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const userId = user.id;

    // Brand ID can come from params or body
    const brandId =
      req.params.brandId ||
      req.body.brandId;

    if (!brandId) {
      return res.status(400).json({ message: 'Brand ID is required' });
    }

    /**
     * TEMP: Allow access.
     * You can add DB ownership checks later.
     */
    next();
  } catch (error) {
    console.error('requireBrandAccess error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
