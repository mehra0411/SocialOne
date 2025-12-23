import { Response } from 'express';
import { AuthenticatedRequest } from '../../types/auth';
import {
  listBrands,
  createBrand,
  ensurePublicUserExists,
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

  await ensurePublicUserExists({ id: userId, email: req.user.email });
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
  try {
    const userId = req.user.id;
    const { name, instagram_handle, tone } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    await ensurePublicUserExists({ id: userId, email: req.user.email });

    const brand = await createBrand(userId, {
      name,
      instagram_handle,
      tone,
    });

    return res.status(201).json(brand);
  } catch (error) {
    console.error('Create brand failed:', JSON.stringify(error, null, 2));
    throw error;
  }
}