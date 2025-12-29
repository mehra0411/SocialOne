import { randomUUID } from 'crypto';
import type { PlatformId } from '../../platforms/types';
import { supabaseAdmin } from '../../config/supabase';

export type FeedPostStatus = 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed';

export type FeedPost = {
  id: string;
  brand_id: string;
  platform: PlatformId;
  caption: string | null;
  image_url: string | null;
  status: FeedPostStatus;
  instagram_post_id: string | null;
  error_message: string | null;
  created_at: string;
  scheduled_at: string | null;
  published_at: string | null;
  failed_at: string | null;
  retry_count: number;
  last_retry_at: string | null;
};

type CreateDraftArgs = {
  brandId: string;
  caption: string;
  imageUrl?: string | null;
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

export async function createDraftFeedPost(args: CreateDraftArgs): Promise<FeedPost> {
  const row = {
    id: randomUUID(),
    brand_id: args.brandId,
    caption: args.caption,
    image_url: args.imageUrl ?? null,
    status: 'draft' as const,
  };

  // Use the existing service-role Supabase client to bypass RLS for server-side writes.
  const { data, error } = await supabaseAdmin.from('feed_posts').insert(row).select('*').limit(1).maybeSingle();
  if (error) throw new Error(error.message || 'Failed to create draft feed post');
  if (!data) throw new Error('Failed to create draft feed post');
  return data as FeedPost;
}

export async function getFeedPostById(feedPostId: string): Promise<FeedPost | null> {
  const qs = new URLSearchParams();
  qs.set('select', '*');
  qs.set('id', `eq.${feedPostId}`);
  qs.set('limit', '1');

  const rows = await supabaseRest<FeedPost[]>(`/rest/v1/feed_posts?${qs.toString()}`, { method: 'GET' });
  return rows[0] ?? null;
}

export async function listFeedPostsByBrand(brandId: string, limit = 50): Promise<FeedPost[]> {
  const qs = new URLSearchParams();
  qs.set('select', '*');
  qs.set('brand_id', `eq.${brandId}`);
  qs.set('order', 'created_at.desc');
  qs.set('limit', String(limit));

  return await supabaseRest<FeedPost[]>(`/rest/v1/feed_posts?${qs.toString()}`, { method: 'GET' });
}

export async function setFeedPostScheduledAt(feedPostId: string, scheduledAtIso: string | null): Promise<void> {
  const qs = new URLSearchParams();
  qs.set('id', `eq.${feedPostId}`);

  await supabaseRest<unknown>(`/rest/v1/feed_posts?${qs.toString()}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ scheduled_at: scheduledAtIso }),
  });
}

export async function updateFeedPostStatus(feedPostId: string, status: FeedPostStatus): Promise<void> {
  const qs = new URLSearchParams();
  qs.set('id', `eq.${feedPostId}`);

  await supabaseRest<unknown>(`/rest/v1/feed_posts?${qs.toString()}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ status }),
  });
}

export async function markFeedPostScheduled(feedPostId: string): Promise<void> {
  await updateFeedPostStatus(feedPostId, 'scheduled');
}

export async function markFeedPostPublishing(feedPostId: string): Promise<void> {
  const qs = new URLSearchParams();
  qs.set('id', `eq.${feedPostId}`);

  await supabaseRest<unknown>(`/rest/v1/feed_posts?${qs.toString()}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      status: 'publishing',
      failed_at: null,
      error_message: null,
    }),
  });
}

export async function markFeedPostPublished(feedPostId: string, instagramPostId: string | null): Promise<void> {
  const qs = new URLSearchParams();
  qs.set('id', `eq.${feedPostId}`);

  await supabaseRest<unknown>(`/rest/v1/feed_posts?${qs.toString()}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      status: 'published',
      published_at: new Date().toISOString(),
      failed_at: null,
      error_message: null,
      instagram_post_id: instagramPostId,
    }),
  });
}

export async function markFeedPostFailed(feedPostId: string, errorMessage: string | null): Promise<void> {
  const qs = new URLSearchParams();
  qs.set('id', `eq.${feedPostId}`);

  await supabaseRest<unknown>(`/rest/v1/feed_posts?${qs.toString()}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      status: 'failed',
      failed_at: new Date().toISOString(),
      error_message: errorMessage,
    }),
  });
}

export async function listDueScheduledFeedPosts(limit: number, nowIso: string): Promise<FeedPost[]> {
  const qs = new URLSearchParams();
  qs.set('select', '*');
  qs.set('status', 'eq.scheduled');
  qs.set('scheduled_at', `lte.${nowIso}`);
  qs.set('order', 'scheduled_at.asc');
  qs.set('limit', String(limit));

  return await supabaseRest<FeedPost[]>(`/rest/v1/feed_posts?${qs.toString()}`, { method: 'GET' });
}

/**
 * Concurrency-safe claim: transitions scheduled -> publishing only if still scheduled and due.
 * Returns the updated row if claimed; otherwise null.
 */
export async function claimDueScheduledFeedPost(feedPostId: string, nowIso: string): Promise<FeedPost | null> {
  const qs = new URLSearchParams();
  qs.set('id', `eq.${feedPostId}`);
  qs.set('status', 'eq.scheduled');
  qs.set('scheduled_at', `lte.${nowIso}`);
  qs.set('select', '*');

  const rows = await supabaseRest<FeedPost[]>(`/rest/v1/feed_posts?${qs.toString()}`, {
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

export async function listFailedFeedPostsForRetry(limit: number, maxRetries: number): Promise<FeedPost[]> {
  const qs = new URLSearchParams();
  qs.set('select', '*');
  qs.set('status', 'eq.failed');
  qs.set('retry_count', `lt.${maxRetries}`);
  qs.set('order', 'failed_at.desc');
  qs.set('limit', String(limit));

  return await supabaseRest<FeedPost[]>(`/rest/v1/feed_posts?${qs.toString()}`, { method: 'GET' });
}

/**
 * Concurrency-safe retry claim:
 * - Only claims if still failed and retry_count matches expected (prevents double increment)
 * - Increments retry_count and sets last_retry_at
 * - Moves status to publishing
 */
export async function claimRetryFailedFeedPost(args: {
  feedPostId: string;
  nowIso: string;
  expectedRetryCount: number;
  expectedLastRetryAt: string | null;
}): Promise<FeedPost | null> {
  const qs = new URLSearchParams();
  qs.set('id', `eq.${args.feedPostId}`);
  qs.set('status', 'eq.failed');
  qs.set('retry_count', `eq.${args.expectedRetryCount}`);
  if (args.expectedLastRetryAt) {
    qs.set('last_retry_at', `eq.${args.expectedLastRetryAt}`);
  } else {
    qs.set('last_retry_at', 'is.null');
  }
  qs.set('select', '*');

  const rows = await supabaseRest<FeedPost[]>(`/rest/v1/feed_posts?${qs.toString()}`, {
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

/**
 * Manual override claim for scheduled posts:
 * scheduled -> publishing (ignores scheduled_at).
 */
export async function claimManualScheduledFeedPost(feedPostId: string): Promise<FeedPost | null> {
  const qs = new URLSearchParams();
  qs.set('id', `eq.${feedPostId}`);
  qs.set('status', 'eq.scheduled');
  qs.set('select', '*');

  const rows = await supabaseRest<FeedPost[]>(`/rest/v1/feed_posts?${qs.toString()}`, {
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

/**
 * Manual override claim for failed retries:
 * - ignores backoff window
 * - increments retry_count and sets last_retry_at
 * - failed -> publishing
 *
 * Concurrency safety:
 * - requires retry_count to match expected value.
 */
export async function claimManualRetryFailedFeedPost(args: {
  feedPostId: string;
  nowIso: string;
  expectedRetryCount: number;
}): Promise<FeedPost | null> {
  const qs = new URLSearchParams();
  qs.set('id', `eq.${args.feedPostId}`);
  qs.set('status', 'eq.failed');
  qs.set('retry_count', `eq.${args.expectedRetryCount}`);
  qs.set('select', '*');

  const rows = await supabaseRest<FeedPost[]>(`/rest/v1/feed_posts?${qs.toString()}`, {
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


