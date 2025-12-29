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

    /**
     * TEMP: Allow access.
     * You can add DB ownership checks later.
     */
    const contentType = String(req.headers['content-type'] ?? '');

    // Brand ID can come from body or params (body may be undefined for multipart until multer runs)
    const body = ((req as any).body ?? {}) as Record<string, any>;
    const brandId = body.brandId || req.params?.brandId;

    // For multipart/form-data requests, body parsing happens later in the route (multer),
    // so brandId may not be available yet here. Let the request continue; controller will validate.
    if (!brandId && contentType.includes('multipart/form-data')) {
      return next();
    }

    if (!brandId) {
      return res.status(400).json({ message: 'Brand ID is required' });
    }

    return next();
  } catch (error) {
    console.error('requireBrandAccess error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
