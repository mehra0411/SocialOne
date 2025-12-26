import { Response } from 'express';
import { AuthenticatedRequest } from '../../types/auth';
import { deleteFeedDraft as deleteFeedDraftService, FeedDraftNotFoundError, generateFeedDraft } from './feed.service';
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

export async function deleteFeedDraft(req: AuthenticatedRequest, res: Response) {
  const userId = req.user.id;
  const { feedPostId } = req.params as { feedPostId?: string };

  if (!feedPostId) {
    return res.status(400).json({ message: 'feedPostId is required' });
  }

  try {
    await deleteFeedDraftService(userId, feedPostId);
    return res.json({ success: true });
  } catch (e) {
    if (e instanceof FeedDraftNotFoundError) {
      return res.status(404).json({ message: 'Not found' });
    }
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === 'Forbidden') return res.status(403).json({ message: 'Forbidden' });
    if (msg === 'Only drafts can be deleted') return res.status(400).json({ message: msg });
    return res.status(500).json({ message: 'Internal server error' });
  }
}
