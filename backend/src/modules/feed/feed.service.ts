import { getBrandById } from '../brands/brand.repository';
import { createDraftFeedPost, type FeedPost } from './feed.repository';

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

async function generateCaptionWithOpenAI(input: {
  brandName?: string | null;
  brandCategory?: string | null;
  voiceGuidelines?: string | null;
  prompt?: string;
}): Promise<string> {
  const apiKey = requiredEnv('OPENAI_API_KEY');
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


