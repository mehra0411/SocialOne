import { Response } from 'express';
import { AuthenticatedRequest } from '../../types/auth';
import {
  generateReelDraft,
  publishReel,
} from './reels.service';

export async function reelsGenerate(
  req: AuthenticatedRequest,
  res: Response
) {
  const userId = req.user.id;
  const { brandId, input_image_url } = req.body;

  if (!brandId || !input_image_url) {
    return res.status(400).json({
      error: 'brandId and input_image_url are required',
    });
  }

  const result = await generateReelDraft(userId, {
    brandId,
    input_image_url,
  });

  return res.json(result);
}

export async function reelsPublish(
  req: AuthenticatedRequest,
  res: Response
) {
  const userId = req.user.id;
  const { reelId } = req.body;

  if (!reelId) {
    return res.status(400).json({ error: 'reelId is required' });
  }

  const result = await publishReel(userId, reelId);
  return res.json(result);
}
