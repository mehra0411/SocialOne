type InstagramAccountStatus = 'connected' | 'expired';

export type InstagramAccount = {
  id: string;
  brand_id: string;
  instagram_user_id: string | null;
  page_id: string | null;
  access_token_encrypted: string | null;
  status: InstagramAccountStatus;
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

export async function getConnectedInstagramAccountByBrandId(brandId: string): Promise<InstagramAccount | null> {
  const qs = new URLSearchParams();
  qs.set('select', '*');
  qs.set('brand_id', `eq.${brandId}`);
  qs.set('status', 'eq.connected');
  qs.set('limit', '1');

  const rows = await supabaseRest<InstagramAccount[]>(
    `/rest/v1/instagram_accounts?${qs.toString()}`,
    { method: 'GET' },
  );

  return rows[0] ?? null;
}

export async function getLatestInstagramAccountByBrandId(brandId: string): Promise<InstagramAccount | null> {
  const qs = new URLSearchParams();
  qs.set('select', '*');
  qs.set('brand_id', `eq.${brandId}`);
  qs.set('order', 'created_at.desc');
  qs.set('limit', '1');

  const rows = await supabaseRest<InstagramAccount[]>(
    `/rest/v1/instagram_accounts?${qs.toString()}`,
    { method: 'GET' },
  );

  return rows[0] ?? null;
}


