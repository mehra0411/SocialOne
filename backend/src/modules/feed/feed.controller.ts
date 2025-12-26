import { Response } from 'express';
import { AuthenticatedRequest } from '../../types/auth';
import { deleteFeedDraft as deleteFeedDraftService, FeedDraftNotFoundError, generateFeedDraft, generateFeedImage } from './feed.service';
import { manualPublishFeedPost, publishFeedPost } from './feed.publish.service';
import { listFeedPostsByBrand, setFeedPostScheduledAt } from './feed.repository';

function getSupabaseConfig() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase env (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)');
  }
  return { supabaseUrl: supabaseUrl.replace(/\/+$/, ''), serviceRoleKey };
}

async function supabasePatchFeedPostById(feedPostId: string, patch: Record<string, unknown>): Promise<void> {
  const { supabaseUrl, serviceRoleKey } = getSupabaseConfig();
  const qs = new URLSearchParams();
  qs.set('id', `eq.${feedPostId}`);

  const resp = await fetch(`${supabaseUrl}/rest/v1/feed_posts?${qs.toString()}`, {
    method: 'PATCH',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(patch),
  });

  if (!resp.ok) {
    throw new Error(`Supabase REST error: ${resp.status}`);
  }
}

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

export async function feedImageGenerate(req: AuthenticatedRequest, res: Response) {
  const userId = req.user.id;
  const { brandId, feedDraftId, prompt, referenceImageUrl } = req.body as {
    brandId?: string;
    feedDraftId?: string;
    prompt?: string;
    referenceImageUrl?: string;
  };

  if (!brandId) return res.status(400).json({ message: 'brandId is required' });
  if (!feedDraftId) return res.status(400).json({ message: 'feedDraftId is required' });
  if (!prompt || !prompt.trim()) return res.status(400).json({ message: 'prompt is required' });

  const result = await generateFeedImage(userId, brandId, feedDraftId, prompt, referenceImageUrl);

  // Persist to the existing draft row. Column naming is expected to be snake_case in Postgres.
  await supabasePatchFeedPostById(feedDraftId, {
    image_url: result.imageUrl,
    image_prompt: result.revisedPrompt ?? prompt,
    image_mode: result.imageMode,
    image_status: 'generated',
    image_cost_cents: result.costCents,
  });

  return res.json({
    imageUrl: result.imageUrl,
    revisedPrompt: result.revisedPrompt,
    imageMode: result.imageMode,
  });
}
