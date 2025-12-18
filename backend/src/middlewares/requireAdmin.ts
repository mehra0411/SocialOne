import type { NextFunction, Request, Response } from 'express';

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const role = req.user?.role;
  if (!role) return res.status(401).json({ error: 'Unauthorized' });

  if (role !== 'super_admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  return next();
}


