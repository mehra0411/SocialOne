import { randomUUID } from 'crypto';

type Brand = {
  id: string;
  owner_user_id: string;
  name: string | null;
  category: string | null;
  voice_guidelines: string | null;
  brand_colors: unknown | null;
  created_at: string;
};

export type CreateBrandPayload = {
  name: string;
  category: string;
  voice_guidelines: string;
  brand_colors: unknown;
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

export async function createBrand(userId: string, payload: CreateBrandPayload): Promise<Brand> {
  const brand = {
    id: randomUUID(),
    owner_user_id: userId,
    name: payload.name,
    category: payload.category,
    voice_guidelines: payload.voice_guidelines,
    brand_colors: payload.brand_colors,
    created_at: new Date().toISOString(),
  };

  const rows = await supabaseRest<Brand[]>('/rest/v1/brands?select=*', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(brand),
  });

  if (!rows.length) throw new Error('Failed to create brand');
  return rows[0];
}

export async function getBrandsByUser(userId: string): Promise<Brand[]> {
  const qs = new URLSearchParams();
  qs.set('select', '*');
  qs.set('owner_user_id', `eq.${userId}`);

  return await supabaseRest<Brand[]>(`/rest/v1/brands?${qs.toString()}`, { method: 'GET' });
}

export async function getBrandById(brandId: string, userId: string): Promise<Brand | null> {
  const qs = new URLSearchParams();
  qs.set('select', '*');
  qs.set('id', `eq.${brandId}`);
  qs.set('owner_user_id', `eq.${userId}`);
  qs.set('limit', '1');

  const rows = await supabaseRest<Brand[]>(`/rest/v1/brands?${qs.toString()}`, { method: 'GET' });
  return rows[0] ?? null;
}


