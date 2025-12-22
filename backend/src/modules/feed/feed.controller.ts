import { Response } from 'express';
import { AuthenticatedRequest } from '../../types/auth';
import { generateFeedDraft } from './feed.service';
import { manualPublishFeedPost, publishFeedPost } from './feed.publish.service';
import { listFeedPostsByBrand, setFeedPostScheduledAt } from './feed.repository';

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
  const { feedPostId, scheduledAt } = req.body as { feedPostId?: string; scheduledAt?: string };

  if (!feedPostId) {
    return res.status(400).json({ message: 'feedPostId is required' });
  }

  if (scheduledAt) {
    await setFeedPostScheduledAt(feedPostId, scheduledAt);
  }

  const result = await publishFeedPost(userId, feedPostId);
  res.json(result);
}

export async function feedPublishNow(req: AuthenticatedRequest, res: Response) {
  const userId = req.user.id;
  const { feedPostId } = req.body as { feedPostId?: string };

  if (!feedPostId) {
    return res.status(400).json({ message: 'feedPostId is required' });
  }

  const result = await manualPublishFeedPost(userId, feedPostId);
  return res.json(result);
}

export async function feedListPosts(req: AuthenticatedRequest, res: Response) {
  const { brandId } = req.params as { brandId?: string };
  if (!brandId) return res.status(400).json({ message: 'brandId is required' });

  const feedPosts = await listFeedPostsByBrand(brandId, 50);
  return res.json({ feedPosts });
}
