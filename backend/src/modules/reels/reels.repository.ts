export type ReelGenerationMethod = 'ai' | 'fallback';

export type ReelStatus = 'draft' | 'generating' | 'ready' | 'published' | 'failed';

export type Reel = {
  id: string;
  brand_id: string;
  video_url: string | null;
  generation_method: ReelGenerationMethod;
  status: ReelStatus;
  created_at: string;
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


