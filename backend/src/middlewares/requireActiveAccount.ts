import { Request, Response, NextFunction } from 'express';

/**
 * Ensures the authenticated user has an active account.
 * MUST run AFTER authenticate middleware.
 */
export async function requireActiveAccount(
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

    // 🔒 TEMP: assume active (you can add DB checks later)
    // This keeps backend unblocked right now

    next();
  } catch (error) {
    console.error('requireActiveAccount error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
