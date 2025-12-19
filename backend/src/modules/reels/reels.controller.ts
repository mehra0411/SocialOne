import type { Request, Response } from 'express';

import { runAiReelWorker } from '../../workers/ai-reel.worker';
import { createReel, type Reel } from './reels.repository';
import { publishReel } from './reels.publish.service';

type GenerateBody = {
  brandId?: string;
  inputImageUrl?: string;
};

type PublishBody = {
  brandId?: string;
  reelId?: string;
};

export async function reelsGenerate(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const body = (req.body ?? {}) as GenerateBody;

    if (!body.brandId) {
      return res.status(400).json({ error: 'Missing brandId' });
    }

    if (!body.inputImageUrl || typeof body.inputImageUrl !== 'string') {
      return res.status(400).json({ error: 'Invalid inputImageUrl' });
    }

    // Create reel record
    const reel: Reel = await createReel({
      brandId: body.brandId,
      inputImageUrl: body.inputImageUrl,
      generationMethod: 'ai',
    });

    // Trigger AI worker (fire-and-forget)
    runAiReelWorker(reel.id).catch(() => {
      // Worker handles its own failure state
    });

    return res.json({
      success: true,
      data: {
        reelId: reel.id,
        status: reel.status,
      },
    });
  } catch {
    return res.status(500).json({ error: 'Failed to generate reel' });
  }
}

export async function reelsPublish(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const body = (req.body ?? {}) as PublishBody;

    // Required for requireBrandAccess middleware
    if (!body.brandId) {
      return res.status(400).json({ error: 'Missing brandId' });
    }

    if (!body.reelId) {
      return res.status(400).json({ error: 'Missing reelId' });
    }

    const result = await publishReel(userId, body.reelId);
    return res.json({ success: true, data: result });
  } catch {
    return res.status(500).json({ error: 'Failed to publish reel' });
  }
}
