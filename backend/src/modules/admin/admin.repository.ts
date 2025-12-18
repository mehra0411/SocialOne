export type AdminUser = {
  id: string;
  email: string;
  role: 'user' | 'super_admin';
  account_status: 'active' | 'paused' | 'restricted' | 'suspended';
  created_at: string;
};

export type BrandMetadata = {
  id: string;
  owner_user_id: string;
  name: string | null;
  category: string | null;
  voice_guidelines: string | null;
  brand_colors: unknown | null;
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

  // Some operations may return empty body; treat as null.
  const text = await resp.text();
  return (text ? (JSON.parse(text) as T) : (null as T));
}

export async function listAllUsers(): Promise<AdminUser[]> {
  const qs = new URLSearchParams();
  qs.set('select', 'id,email,role,account_status,created_at');
  qs.set('order', 'created_at.desc');

  return await supabaseRest<AdminUser[]>(`/rest/v1/users?${qs.toString()}`, { method: 'GET' });
}

export async function updateUserAccountStatus(args: {
  userId: string;
  accountStatus: AdminUser['account_status'];
}): Promise<AdminUser | null> {
  const qs = new URLSearchParams();
  qs.set('id', `eq.${args.userId}`);
  qs.set('select', 'id,email,role,account_status,created_at');

  const rows = await supabaseRest<AdminUser[]>(`/rest/v1/users?${qs.toString()}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({ account_status: args.accountStatus }),
  });

  return rows?.[0] ?? null;
}

export async function listBrandMetadata(): Promise<BrandMetadata[]> {
  // "not raw media": brands table contains metadata only (no media URLs).
  const qs = new URLSearchParams();
  qs.set('select', 'id,owner_user_id,name,category,voice_guidelines,brand_colors,created_at');
  qs.set('order', 'created_at.desc');

  return await supabaseRest<BrandMetadata[]>(`/rest/v1/brands?${qs.toString()}`, { method: 'GET' });
}


