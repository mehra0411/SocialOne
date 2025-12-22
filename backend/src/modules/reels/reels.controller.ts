import { Response } from 'express';
import { AuthenticatedRequest } from '../../types/auth';
import { generateReelDraft } from './reels.service';
import { manualPublishReel, publishReel } from './reels.publish.service';
import { listReelsByBrand, setReelScheduledAt } from './reels.repository';

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
  const { reelId, scheduledAt } = req.body as { reelId?: string; scheduledAt?: string };

  if (!reelId) {
    return res.status(400).json({ error: 'reelId is required' });
  }

  if (scheduledAt) {
    await setReelScheduledAt(reelId, scheduledAt);
  }

  const result = await publishReel(userId, reelId);
  return res.json(result);
}

export async function reelsPublishNow(req: AuthenticatedRequest, res: Response) {
  const userId = req.user.id;
  const { reelId } = req.body as { reelId?: string };
  if (!reelId) return res.status(400).json({ error: 'reelId is required' });

  const result = await manualPublishReel(userId, reelId);
  return res.json(result);
}

export async function reelsListPosts(req: AuthenticatedRequest, res: Response) {
  const { brandId } = req.params as { brandId?: string };
  if (!brandId) return res.status(400).json({ error: 'brandId is required' });

  const reels = await listReelsByBrand(brandId, 50);
  return res.json({ reels });
}
