import { getBrandByIdUnsafe } from '../modules/brands/brand.repository';
import { getReelById, setAiReelResult, updateReelStatus } from '../modules/reels/reels.repository';

type AiVideoProviderResponse = {
  videoUrl: string;
  durationSeconds: number;
  providerJobId?: string;
};

function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function buildVideoPrompt(input: {
  brandName?: string | null;
  category?: string | null;
  voiceGuidelines?: string | null;
}): string {
  return [
    'Create a vertical 9:16 Instagram Reel video.',
    'Target duration: 20 seconds.',
    input.brandName ? `Brand: ${input.brandName}` : null,
    input.category ? `Category: ${input.category}` : null,
    input.voiceGuidelines ? `Voice: ${input.voiceGuidelines}` : null,
    'Return a video suitable for posting (no watermarks).',
  ]
    .filter(Boolean)
    .join('\n');
}

async function callAiVideoProvider(prompt: string): Promise<AiVideoProviderResponse> {
  const url = requiredEnv('AI_VIDEO_PROVIDER_URL');
  const apiKey = process.env.AI_VIDEO_PROVIDER_API_KEY;

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({ prompt }),
  });

  if (!resp.ok) throw new Error(`AI video provider error: ${resp.status}`);

  const data = (await resp.json()) as Partial<AiVideoProviderResponse>;
  if (!data.videoUrl || typeof data.videoUrl !== 'string') throw new Error('Provider returned no videoUrl');
  if (typeof data.durationSeconds !== 'number') throw new Error('Provider returned no durationSeconds');

  return { videoUrl: data.videoUrl, durationSeconds: data.durationSeconds, providerJobId: data.providerJobId };
}

function validateDurationSeconds(durationSeconds: number) {
  if (!Number.isFinite(durationSeconds)) throw new Error('Invalid durationSeconds');
  if (durationSeconds < 15 || durationSeconds > 30) {
    throw new Error('Video duration must be between 15 and 30 seconds');
  }
}

/**
 * AI Reel generation worker (primary).
 *
 * Responsibilities:
 * - Accept reelId
 * - Build video prompt
 * - Call AI video provider
 * - Validate video duration (15–30s)
 * - Save video metadata (stored as `reels.video_url` and provider response returned)
 * - Update status to `ready` (generation_method is orthogonal)
 *
 * Does not handle fallback logic.
 */
export async function runAiReelWorker(reelId: string): Promise<AiVideoProviderResponse> {
  if (!reelId) throw new Error('Missing reelId');

  const reel = await getReelById(reelId);
  if (!reel) throw new Error('Reel not found');

  await updateReelStatus(reelId, 'generating');

  try {
    // Workers do not have a userId; use internal service-role query for brand context.
    const brand = await getBrandByIdUnsafe(reel.brand_id);
    const prompt = buildVideoPrompt({
      brandName: brand?.name ?? null,
      category: brand?.category ?? null,
      voiceGuidelines: brand?.voice_guidelines ?? null,
    });

    const result = await callAiVideoProvider(prompt);
    validateDurationSeconds(result.durationSeconds);

    // Persist what we can with the current schema: video URL + status.
    await setAiReelResult({
      reelId,
      videoUrl: result.videoUrl,
      generationMethod: 'ai',
      status: 'ready',
    });

    return result;
  } catch (e) {
    await updateReelStatus(reelId, 'failed');
    throw e;
  }
}


