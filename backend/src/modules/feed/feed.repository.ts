import { randomUUID } from 'crypto';
import type { PlatformId } from '../../platforms/types';

export type FeedPostStatus = 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed';

export type FeedPost = {
  id: string;
  brand_id: string;
  platform: PlatformId;
  caption: string | null;
  image_url: string | null;
  status: FeedPostStatus;
  created_at: string;
  scheduled_at: string | null;
  published_at: string | null;
  failed_at: string | null;
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

  const rows = await supabaseRest<FeedPost[]>('/rest/v1/feed_posts?select=*', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(row),
  });

  if (!rows.length) throw new Error('Failed to create draft feed post');
  return rows[0];
}

export async function getFeedPostById(feedPostId: string): Promise<FeedPost | null> {
  const qs = new URLSearchParams();
  qs.set('select', '*');
  qs.set('id', `eq.${feedPostId}`);
  qs.set('limit', '1');

  const rows = await supabaseRest<FeedPost[]>(`/rest/v1/feed_posts?${qs.toString()}`, { method: 'GET' });
  return rows[0] ?? null;
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
    }),
  });
}

export async function markFeedPostPublished(feedPostId: string): Promise<void> {
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
    }),
  });
}

export async function markFeedPostFailed(feedPostId: string): Promise<void> {
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


