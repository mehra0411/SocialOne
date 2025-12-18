import { randomUUID } from 'crypto';

export type FeedPostStatus = 'draft' | 'published' | 'failed';

export type FeedPost = {
  id: string;
  brand_id: string;
  caption: string | null;
  image_url: string | null;
  status: FeedPostStatus;
  created_at: string;
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


