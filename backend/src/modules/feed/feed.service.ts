import { getBrandById } from '../brands/brand.repository';
import { createDraftFeedPost, getFeedPostById, type FeedPost } from './feed.repository';

export type GenerateFeedDraftPayload = {
  brandId: string;
  imageUrl?: string;
  /**
   * Optional extra context for the model (product, offer, tone, etc).
   * Keep it short—this is not business logic, just prompt context.
   */
  prompt?: string;
};

function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export class FeedDraftNotFoundError extends Error {
  constructor() {
    super('Feed draft not found');
  }
}

function getSupabaseConfig() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase env (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)');
  }

  return {
    supabaseUrl: supabaseUrl.replace(/\/+$/, ''),
    serviceRoleKey,
  };
}

async function supabaseRest<T>(pathWithQuery: string, init?: RequestInit): Promise<T> {
  const { supabaseUrl, serviceRoleKey } = getSupabaseConfig();

  const resp = await fetch(`${supabaseUrl}${pathWithQuery}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Accept: 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!resp.ok) {
    throw new Error(`Supabase REST error: ${resp.status}`);
  }

  // Supabase returns JSON for delete when using return=representation; otherwise may be empty.
  const text = await resp.text();
  return (text ? (JSON.parse(text) as T) : (undefined as unknown as T));
}

async function generateCaptionWithOpenAI(input: {
  brandName?: string | null;
  brandCategory?: string | null;
  voiceGuidelines?: string | null;
  prompt?: string;
}): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set in environment variables');
  }
  const model = process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini';

  const system = `You write short, high-quality Instagram captions. Keep it concise, natural, and on-brand. Return ONLY the caption text.`;
  const user = [
    input.brandName ? `Brand name: ${input.brandName}` : null,
    input.brandCategory ? `Category: ${input.brandCategory}` : null,
    input.voiceGuidelines ? `Voice guidelines: ${input.voiceGuidelines}` : null,
    input.prompt ? `Additional context: ${input.prompt}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.8,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user || 'Write an Instagram caption.' },
      ],
    }),
  });

  if (!resp.ok) throw new Error(`OpenAI error: ${resp.status}`);
  const data = (await resp.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const caption = data.choices?.[0]?.message?.content?.trim();
  if (!caption) throw new Error('OpenAI returned empty caption');
  return caption;
}

/**
 * Generates a caption using OpenAI and saves a draft row in `feed_posts`.
 * No publishing happens here.
 */
export async function generateFeedDraft(userId: string, payload: GenerateFeedDraftPayload): Promise<FeedPost> {
  if (!userId) throw new Error('Missing userId');
  if (!payload.brandId) throw new Error('Missing brandId');

  // Enforce brand ownership before creating a post for that brand.
  const brand = await getBrandById(payload.brandId, userId);
  if (!brand) throw new Error('Forbidden');

  const caption = await generateCaptionWithOpenAI({
    brandName: brand.name,
    brandCategory: brand.category,
    voiceGuidelines: brand.voice_guidelines,
    prompt: payload.prompt,
  });

  return await createDraftFeedPost({
    brandId: payload.brandId,
    caption,
    imageUrl: payload.imageUrl ?? null,
  });
}

export async function deleteFeedDraft(userId: string, feedPostId: string): Promise<void> {
  if (!userId) throw new Error('Missing userId');
  if (!feedPostId) throw new Error('Missing feedPostId');

  const post = await getFeedPostById(feedPostId);
  if (!post) throw new FeedDraftNotFoundError();

  // Enforce brand ownership (service-level; middleware currently only checks brandId presence).
  const brand = await getBrandById(post.brand_id, userId);
  if (!brand) throw new Error('Forbidden');

  if (post.status !== 'draft') {
    throw new Error('Only drafts can be deleted');
  }

  // Safety: only delete if still draft at time of delete.
  const qs = new URLSearchParams();
  qs.set('id', `eq.${feedPostId}`);
  qs.set('status', 'eq.draft');
  qs.set('select', '*');

  const deleted = await supabaseRest<FeedPost[]>(`/rest/v1/feed_posts?${qs.toString()}`, {
    method: 'DELETE',
    headers: {
      Prefer: 'return=representation',
    },
  });

  if (!deleted?.length) {
    // If the row existed but was not deleted, treat it as no longer a draft (race safety).
    throw new Error('Only drafts can be deleted');
  }
}
export async function publishFeedPost(
  userId: string,
  feedPostId: string
): Promise<{ success: true }> {
  if (!userId) throw new Error('Missing userId');
  if (!feedPostId) throw new Error('Missing feedPostId');

  // TEMP: publishing logic will be added later
  return { success: true };
}


