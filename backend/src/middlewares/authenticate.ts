import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase';

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing Authorization header' });
  }

  const token = authHeader.replace('Bearer ', '');

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }

  // 👇 SAFE assignment (runtime)
  (req as any).user = {
    id: data.user.id,
    email: data.user.email ?? undefined,
  };

  next();
}
