import type { PlatformId } from '../../platforms/types';

export type ReelGenerationMethod = 'ai' | 'fallback';

export type ReelStatus = 'draft' | 'scheduled' | 'publishing' | 'generating' | 'ready' | 'published' | 'failed';

export type Reel = {
  id: string;
  brand_id: string;
  platform: PlatformId;
  input_image_url: string | null;
  video_url: string | null;
  generation_method: ReelGenerationMethod;
  status: ReelStatus;
  created_at: string;
  scheduled_at: string | null;
  published_at: string | null;
  failed_at: string | null;
  retry_count: number;
  last_retry_at: string | null;
};

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

  return (await resp.json()) as T;
}

export async function getReelById(reelId: string): Promise<Reel | null> {
  const qs = new URLSearchParams();
  qs.set('select', '*');
  qs.set('id', `eq.${reelId}`);
  qs.set('limit', '1');

  const rows = await supabaseRest<Reel[]>(`/rest/v1/reels?${qs.toString()}`, { method: 'GET' });
  return rows[0] ?? null;
}

export async function updateReelStatus(reelId: string, status: ReelStatus): Promise<void> {
  const qs = new URLSearchParams();
  qs.set('id', `eq.${reelId}`);

  await supabaseRest<unknown>(`/rest/v1/reels?${qs.toString()}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ status }),
  });
}

export async function markReelScheduled(reelId: string): Promise<void> {
  await updateReelStatus(reelId, 'scheduled');
}

export async function markReelPublishing(reelId: string): Promise<void> {
  const qs = new URLSearchParams();
  qs.set('id', `eq.${reelId}`);

  await supabaseRest<unknown>(`/rest/v1/reels?${qs.toString()}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      status: 'publishing',
      failed_at: null,
    }),
  });
}

export async function markReelPublished(reelId: string): Promise<void> {
  const qs = new URLSearchParams();
  qs.set('id', `eq.${reelId}`);

  await supabaseRest<unknown>(`/rest/v1/reels?${qs.toString()}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      status: 'published',
      published_at: new Date().toISOString(),
      failed_at: null,
    }),
  });
}

export async function markReelFailed(reelId: string): Promise<void> {
  const qs = new URLSearchParams();
  qs.set('id', `eq.${reelId}`);

  await supabaseRest<unknown>(`/rest/v1/reels?${qs.toString()}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      status: 'failed',
      failed_at: new Date().toISOString(),
    }),
  });
}

export async function listDueScheduledReels(limit: number, nowIso: string): Promise<Reel[]> {
  const qs = new URLSearchParams();
  qs.set('select', '*');
  qs.set('status', 'eq.scheduled');
  qs.set('scheduled_at', `lte.${nowIso}`);
  qs.set('order', 'scheduled_at.asc');
  qs.set('limit', String(limit));

  return await supabaseRest<Reel[]>(`/rest/v1/reels?${qs.toString()}`, { method: 'GET' });
}

/**
 * Concurrency-safe claim: transitions scheduled -> publishing only if still scheduled and due.
 * Returns the updated row if claimed; otherwise null.
 */
export async function claimDueScheduledReel(reelId: string, nowIso: string): Promise<Reel | null> {
  const qs = new URLSearchParams();
  qs.set('id', `eq.${reelId}`);
  qs.set('status', 'eq.scheduled');
  qs.set('scheduled_at', `lte.${nowIso}`);
  qs.set('select', '*');

  const rows = await supabaseRest<Reel[]>(`/rest/v1/reels?${qs.toString()}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      status: 'publishing',
      failed_at: null,
    }),
  });

  return rows?.[0] ?? null;
}

export async function listFailedReelsForRetry(limit: number, maxRetries: number): Promise<Reel[]> {
  const qs = new URLSearchParams();
  qs.set('select', '*');
  qs.set('status', 'eq.failed');
  qs.set('retry_count', `lt.${maxRetries}`);
  qs.set('order', 'failed_at.desc');
  qs.set('limit', String(limit));

  return await supabaseRest<Reel[]>(`/rest/v1/reels?${qs.toString()}`, { method: 'GET' });
}

export async function claimRetryFailedReel(args: {
  reelId: string;
  nowIso: string;
  expectedRetryCount: number;
  expectedLastRetryAt: string | null;
}): Promise<Reel | null> {
  const qs = new URLSearchParams();
  qs.set('id', `eq.${args.reelId}`);
  qs.set('status', 'eq.failed');
  qs.set('retry_count', `eq.${args.expectedRetryCount}`);
  if (args.expectedLastRetryAt) {
    qs.set('last_retry_at', `eq.${args.expectedLastRetryAt}`);
  } else {
    qs.set('last_retry_at', 'is.null');
  }
  qs.set('select', '*');

  const rows = await supabaseRest<Reel[]>(`/rest/v1/reels?${qs.toString()}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      status: 'publishing',
      retry_count: args.expectedRetryCount + 1,
      last_retry_at: args.nowIso,
      failed_at: null,
    }),
  });

  return rows?.[0] ?? null;
}

export async function setAiReelResult(args: {
  reelId: string;
  videoUrl: string;
  generationMethod: ReelGenerationMethod;
  status: ReelStatus;
}): Promise<void> {
  const qs = new URLSearchParams();
  qs.set('id', `eq.${args.reelId}`);

  await supabaseRest<unknown>(`/rest/v1/reels?${qs.toString()}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      video_url: args.videoUrl,
      generation_method: args.generationMethod,
      status: args.status,
    }),
  });
}

export async function createReel(args: {
  brandId: string;
  inputImageUrl: string;
  generationMethod: ReelGenerationMethod;
}): Promise<Reel> {
  const { randomUUID } = await import('crypto');

  const row = {
    id: randomUUID(),
    brand_id: args.brandId,
    input_image_url: args.inputImageUrl,
    generation_method: args.generationMethod,
    status: 'draft' as const,
  };

  const rows = await supabaseRest<Reel[]>('/rest/v1/reels?select=*', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(row),
  });

  if (!rows.length) throw new Error('Failed to create reel');
  return rows[0];
}


