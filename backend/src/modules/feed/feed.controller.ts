import { Response } from 'express';
import { AuthenticatedRequest } from '../../types/auth';
import {
  generateFeedDraft,
  publishFeedPost,
} from './feed.service';

export async function feedGenerate(
  req: AuthenticatedRequest,
  res: Response
) {
  const userId = req.user.id;
  const { brandId, imageUrl, prompt } = req.body;

  if (!brandId) {
    return res.status(400).json({ message: 'brandId is required' });
  }

  const result = await generateFeedDraft(userId, {
    brandId,
    imageUrl,
    prompt,
  });

  res.json(result);
}

export async function feedPublish(
  req: AuthenticatedRequest,
  res: Response
) {
  const userId = req.user.id;
  const { feedPostId } = req.body;

  if (!feedPostId) {
    return res.status(400).json({ message: 'feedPostId is required' });
  }

  const result = await publishFeedPost(userId, feedPostId);
  res.json(result);
}
