import type { NextFunction, Request, Response } from 'express';

type AccountStatus = 'active' | 'paused' | 'restricted' | 'suspended';

async function fetchAccountStatus(userId: string): Promise<AccountStatus | null> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase env (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)');
  }

  const url = new URL(`${supabaseUrl.replace(/\/+$/, '')}/rest/v1/users`);
  url.searchParams.set('select', 'account_status');
  url.searchParams.set('id', `eq.${userId}`);
  url.searchParams.set('limit', '1');

  const resp = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Accept: 'application/json',
    },
  });

  if (!resp.ok) {
    throw new Error(`Supabase REST error: ${resp.status}`);
  }

  const rows = (await resp.json()) as Array<{ account_status?: AccountStatus }>;
  if (!rows.length) return null;
  return rows[0]?.account_status ?? null;
}

export async function requireActiveAccount(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const accountStatus = await fetchAccountStatus(userId);
    if (!accountStatus) return res.status(401).json({ error: 'Unauthorized' });

    if (accountStatus !== 'active') {
      return res.status(403).json({ error: 'Account is not active' });
    }

    return next();
  } catch {
    return res.status(500).json({ error: 'Failed to verify account status' });
  }
}


