import { Response } from 'express';
import { AuthenticatedRequest } from '../../types/auth';
import { deleteFeedDraft as deleteFeedDraftService, FeedDraftNotFoundError, generateFeedDraft, generateFeedImage, generateFeedImagePreview } from './feed.service';
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

async function supabaseGetFeedImageUsage(feedDraftId: string): Promise<{
  id: string;
  brand_id: string;
  image_generation_count_total: number | null;
  image_generation_day: string | null;
  image_generation_count_day: number | null;
} | null> {
  const { supabaseUrl, serviceRoleKey } = getSupabaseConfig();
  const qs = new URLSearchParams();
  qs.set('select', 'id,brand_id,image_generation_count_total,image_generation_day,image_generation_count_day');
  qs.set('id', `eq.${feedDraftId}`);
  qs.set('limit', '1');

  const resp = await fetch(`${supabaseUrl}/rest/v1/feed_posts?${qs.toString()}`, {
    method: 'GET',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Accept: 'application/json',
    },
  });

  if (!resp.ok) throw new Error(`Supabase REST error: ${resp.status}`);
  const rows = (await resp.json()) as any[];
  return (rows?.[0] as any) ?? null;
}

async function supabaseGetBrandDailyImageCountCapped(brandId: string, dayIso: string, cap: number): Promise<number> {
  const { supabaseUrl, serviceRoleKey } = getSupabaseConfig();
  const qs = new URLSearchParams();
  qs.set('select', 'image_generation_count_day');
  qs.set('brand_id', `eq.${brandId}`);
  qs.set('image_generation_day', `eq.${dayIso}`);
  // Keep bounded; we only need to know if we're at/over cap.
  qs.set('limit', '2000');

  const resp = await fetch(`${supabaseUrl}/rest/v1/feed_posts?${qs.toString()}`, {
    method: 'GET',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Accept: 'application/json',
    },
  });

  if (!resp.ok) throw new Error(`Supabase REST error: ${resp.status}`);
  const rows = (await resp.json()) as Array<{ image_generation_count_day?: number | null }>;
  let sum = 0;
  for (const r of rows) {
    sum += typeof r.image_generation_count_day === 'number' ? r.image_generation_count_day : 0;
    if (sum >= cap) return sum;
  }
  return sum;
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
  if (!prompt || !prompt.trim()) return res.status(400).json({ message: 'prompt is required' });

  // PREVIEW-ONLY MODE (no draft yet): exit before ANY Supabase logic runs.
  if (!feedDraftId) {
    try {
      const result = await generateFeedImagePreview({ prompt, referenceImageUrl });
      return res.json({
        imageUrl: result.imageUrl,
        revisedPrompt: result.revisedPrompt,
        imageMode: result.imageMode,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return res.status(500).json({ message: msg || 'Internal server error' });
    }
  }

  // DRAFT-BASED MODE (existing behavior): Supabase validation + limits + persistence.
  try {
    // Abuse/cost guards (best-effort; deterministic, no background jobs).
    const usage = await supabaseGetFeedImageUsage(feedDraftId!);
    if (!usage) return res.status(404).json({ message: 'Not found' });
    if (usage.brand_id !== brandId) return res.status(400).json({ message: 'Feed draft does not belong to the provided brandId' });

    const maxPerDraft = 5;
    const maxPerBrandPerDay = 20;

    const totalSoFar = typeof usage.image_generation_count_total === 'number' ? usage.image_generation_count_total : 0;
    if (totalSoFar >= maxPerDraft) {
      return res.status(429).json({ message: 'Image generation limit reached for this draft (max 5).' });
    }

    const today = new Date();
    const dayIso = today.toISOString().slice(0, 10); // YYYY-MM-DD
    const brandDaily = await supabaseGetBrandDailyImageCountCapped(brandId, dayIso, maxPerBrandPerDay);
    if (brandDaily >= maxPerBrandPerDay) {
      return res.status(429).json({ message: 'Daily image generation limit reached for this brand (max 20 per day).' });
    }

    const result = await generateFeedImage(userId, brandId, feedDraftId!, prompt, referenceImageUrl);

    // Update counters for this draft (total + per-day) and persist output fields.
    const nextTotal = totalSoFar + 1;
    const sameDay = usage.image_generation_day === dayIso;
    const dayCountSoFar = typeof usage.image_generation_count_day === 'number' ? usage.image_generation_count_day : 0;
    const nextDayCount = sameDay ? dayCountSoFar + 1 : 1;

    // Persist to the existing draft row. Column naming is expected to be snake_case in Postgres.
    await supabasePatchFeedPostById(feedDraftId!, {
      image_url: result.imageUrl,
      image_prompt: result.revisedPrompt ?? prompt,
      image_mode: result.imageMode,
      image_status: 'generated',
      image_cost_cents: result.costCents,
      image_generated_at: new Date().toISOString(),
      image_generation_count_total: nextTotal,
      image_generation_day: dayIso,
      image_generation_count_day: nextDayCount,
    });

    return res.json({
      imageUrl: result.imageUrl,
      revisedPrompt: result.revisedPrompt,
      imageMode: result.imageMode,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(500).json({ message: msg || 'Internal server error' });
  }
}

export async function feedImageRemove(req: AuthenticatedRequest, res: Response) {
  const { brandId, feedDraftId } = req.body as { brandId?: string; feedDraftId?: string };

  if (!brandId) return res.status(400).json({ message: 'brandId is required' });
  if (!feedDraftId) return res.status(400).json({ message: 'feedDraftId is required' });

  try {
    const usage = await supabaseGetFeedImageUsage(feedDraftId);
    if (!usage) return res.status(404).json({ message: 'Not found' });
    if (usage.brand_id !== brandId) {
      return res.status(400).json({ message: 'Feed draft does not belong to the provided brandId' });
    }

    // Clear AI image-related fields only. Do NOT touch generation counters.
    await supabasePatchFeedPostById(feedDraftId, {
      image_url: null,
      image_prompt: null,
      image_mode: null,
      image_status: null,
      image_cost_cents: null,
      image_generated_at: null,
    });

    return res.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(500).json({ message: msg || 'Internal server error' });
  }
}
