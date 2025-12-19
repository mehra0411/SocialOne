import { Response } from 'express';
import { AuthenticatedRequest } from '../../types/auth';
import {
  listBrands,
  createBrand,
} from './brands.service';

/**
 * GET /api/brands
 * List brands for the logged-in user
 */
export async function brandsList(
  req: AuthenticatedRequest,
  res: Response
) {
  const userId = req.user.id;

  const brands = await listBrands(userId);
  return res.json(brands);
}

/**
 * POST /api/brands
 * Create a new brand for the logged-in user
 */
export async function brandsCreate(
  req: AuthenticatedRequest,
  res: Response
) {
  const userId = req.user.id;
  const { name, instagram_handle, tone } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'name is required' });
  }

  const brand = await createBrand(userId, {
    name,
    instagram_handle,
    tone,
  });

  return res.status(201).json(brand);
}
