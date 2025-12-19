import type { Request, Response } from 'express';
import { generateFeedDraft } from './feed.service';
import { publishFeedPost } from './feed.publish.service';

type GenerateBody = {
  brandId?: string;
  imageUrl?: string;
  prompt?: string;
};

type PublishBody = {
  brandId?: string;
  feedPostId?: string;
};

export async function feedGenerate(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const body = (req.body ?? {}) as GenerateBody;
    if (!body.brandId) return res.status(400).json({ error: 'Missing brandId' });

    if (body.imageUrl != null && typeof body.imageUrl !== 'string') {
      return res.status(400).json({ error: 'Invalid imageUrl' });
    }
    if (body.prompt != null && typeof body.prompt !== 'string') {
      return res.status(400).json({ error: 'Invalid prompt' });
    }

    const draft = await generateFeedDraft(userId, {
      brandId: body.brandId,
      imageUrl: body.imageUrl,
      prompt: body.prompt,
    });

    return res.json({ feedPost: draft });
  } catch {
    return res.status(500).json({ error: 'Failed to generate feed draft' });
  }
}

export async function feedPublish(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const body = (req.body ?? {}) as PublishBody;
    // Required for requireBrandAccess middleware on this endpoint.
    if (!body.brandId) return res.status(400).json({ error: 'Missing brandId' });
    if (!body.feedPostId) return res.status(400).json({ error: 'Missing feedPostId' });

    const result = await publishFeedPost(userId, body.feedPostId);
    return res.json(result);
  } catch {
    return res.status(500).json({ error: 'Failed to publish feed post' });
  }
}


