import { getBrandById } from '../brands/brand.repository';
import { createDraftFeedPost, getFeedPostById, type FeedPost } from './feed.repository';
import { uploadImageIfNeeded } from './uploadImageIfNeeded';

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

type GeneratedFeedImageResult = {
  imageUrl: string;
  revisedPrompt: string | null;
  imageMode: 'prompt_only' | 'image_edit';
  costCents: number;
};

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

async function readOpenAIError(resp: Response): Promise<string> {
  try {
    const data = (await resp.json()) as any;
    const msg = data?.error?.message ?? data?.message ?? '';
    return msg || `HTTP ${resp.status}`;
  } catch {
    return `HTTP ${resp.status}`;
  }
}

async function openAIImageGeneration(args: {
  apiKey: string;
  prompt: string;
  size: '1024x1024';
}): Promise<{ imageUrl: string; revisedPrompt: string | null }> {
  const model = process.env.OPENAI_IMAGE_MODEL?.trim() || 'gpt-image-1';

  const resp = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      prompt: args.prompt,
      size: args.size,
      n: 1,
    }),
  });

  if (!resp.ok) throw new Error(`OpenAI image generation error: ${await readOpenAIError(resp)}`);

  const data = (await resp.json()) as {
    data?: Array<{ url?: string; b64_json?: string; revised_prompt?: string }>;
  };

  const first = data.data?.[0];
  const url = first?.url;
  const b64 = first?.b64_json;
  const revisedPrompt = first?.revised_prompt ?? null;

  if (url) return { imageUrl: url, revisedPrompt };
  if (b64) {
    // Many OpenAI image models return base64; upload to our existing public storage and return a URL.
    const publicUrl = await uploadImageIfNeeded(`data:image/png;base64,${b64}`);
    return { imageUrl: publicUrl, revisedPrompt };
  }
  throw new Error('OpenAI image generation returned no url or b64_json');
}

async function openAIImageEdit(args: {
  apiKey: string;
  prompt: string;
  size: '1024x1024';
  referenceImageUrl: string;
}): Promise<{ imageUrl: string; revisedPrompt: string | null }> {
  const model = process.env.OPENAI_IMAGE_MODEL?.trim() || 'gpt-image-1';

  const imgResp = await fetch(args.referenceImageUrl);
  if (!imgResp.ok) throw new Error(`Failed to fetch reference image: ${imgResp.status}`);
  const contentType = imgResp.headers.get('content-type') || 'image/png';
  const bytes = await imgResp.arrayBuffer();

  const form = new FormData();
  form.set('model', model);
  form.set('prompt', args.prompt);
  form.set('size', args.size);
  // Some OpenAI image edit endpoints expect `image` as a file upload.
  form.set('image', new Blob([bytes], { type: contentType }), 'reference.png');
  form.set('n', '1');

  const resp = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
    },
    body: form,
  });

  if (!resp.ok) throw new Error(`OpenAI image edit error: ${await readOpenAIError(resp)}`);

  const data = (await resp.json()) as {
    data?: Array<{ url?: string; b64_json?: string; revised_prompt?: string }>;
  };

  const first = data.data?.[0];
  const url = first?.url;
  const b64 = first?.b64_json;
  const revisedPrompt = first?.revised_prompt ?? null;

  if (url) return { imageUrl: url, revisedPrompt };
  if (b64) {
    const publicUrl = await uploadImageIfNeeded(`data:image/png;base64,${b64}`);
    return { imageUrl: publicUrl, revisedPrompt };
  }
  throw new Error('OpenAI image edit returned no url or b64_json');
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

  function toBrandHashtag(name: string): string {
    // Convert brand name to a hashtag-friendly token (letters/numbers only, no spaces).
    // Example: "Brand 23" -> "#Brand23"
    const cleaned = name.replace(/[^a-zA-Z0-9]+/g, ' ').trim();
    const token = cleaned.split(/\s+/).join('');
    return `#${token || 'Brand'}`;
  }

  const brandHashtag = input.brandName ? toBrandHashtag(input.brandName) : null;

  const system = `You are a social media copywriter.
Write a short, engaging Instagram caption followed by 5–10 relevant hashtags.

Output format (exactly):
1) Caption sentence(s)
2) A blank line
3) A single line of space-separated hashtags (no commas)

Hashtag rules:
- Total hashtags: 5–10
- Include topical/content hashtags derived from the prompt and context
- Include a few generic Instagram-friendly hashtags where appropriate
- Include exactly ONE brand hashtag (provided below if available)

Return ONLY the combined caption+hashtags text in this format.`;
  const user = [
    input.brandName ? `Brand name: ${input.brandName}` : null,
    input.brandCategory ? `Category: ${input.brandCategory}` : null,
    brandHashtag ? `Brand hashtag (include exactly once): ${brandHashtag}` : null,
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

export async function generateFeedImage(
  userId: string,
  brandId: string,
  feedDraftId: string,
  prompt: string,
  referenceImageUrl?: string
): Promise<GeneratedFeedImageResult> {
  if (!userId) throw new Error('Missing userId');
  if (!brandId) throw new Error('Missing brandId');
  if (!feedDraftId) throw new Error('Missing feedDraftId');
  if (!isNonEmptyString(prompt)) throw new Error('prompt must be non-empty');

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set in environment variables');
  }

  // Enforce brand ownership before generating for a brand-scoped draft.
  const brand = await getBrandById(brandId, userId);
  if (!brand) throw new Error('Forbidden');

  const draft = await getFeedPostById(feedDraftId);
  if (!draft) throw new FeedDraftNotFoundError();
  if (draft.brand_id !== brandId) throw new Error('Feed draft does not belong to the provided brandId');

  const cleanedRef = isNonEmptyString(referenceImageUrl) ? referenceImageUrl.trim() : null;
  const imageMode: GeneratedFeedImageResult['imageMode'] = cleanedRef ? 'image_edit' : 'prompt_only';
  const size: '1024x1024' = '1024x1024';

  const result =
    imageMode === 'image_edit'
      ? await openAIImageEdit({ apiKey, prompt: prompt.trim(), size, referenceImageUrl: cleanedRef! })
      : await openAIImageGeneration({ apiKey, prompt: prompt.trim(), size });

  // Estimate only (acceptable per requirements). Keep simple and deterministic.
  const costCents = imageMode === 'image_edit' ? 15 : 10;

  return {
    imageUrl: result.imageUrl,
    revisedPrompt: result.revisedPrompt,
    imageMode,
    costCents,
  };
}

export async function generateFeedImagePreview(args: {
  prompt: string;
  referenceImageUrl?: string;
}): Promise<GeneratedFeedImageResult> {
  if (!isNonEmptyString(args.prompt)) throw new Error('prompt must be non-empty');

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set in environment variables');
  }

  const cleanedRef = isNonEmptyString(args.referenceImageUrl) ? args.referenceImageUrl.trim() : null;
  const imageMode: GeneratedFeedImageResult['imageMode'] = cleanedRef ? 'image_edit' : 'prompt_only';
  const size: '1024x1024' = '1024x1024';

  const result =
    imageMode === 'image_edit'
      ? await openAIImageEdit({ apiKey, prompt: args.prompt.trim(), size, referenceImageUrl: cleanedRef! })
      : await openAIImageGeneration({ apiKey, prompt: args.prompt.trim(), size });

  const costCents = imageMode === 'image_edit' ? 15 : 10;

  return {
    imageUrl: result.imageUrl,
    revisedPrompt: result.revisedPrompt,
    imageMode,
    costCents,
  };
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


