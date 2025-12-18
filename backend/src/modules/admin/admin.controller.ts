import type { Request, Response } from 'express';
import { listAllUsers, listBrandMetadata, updateUserAccountStatus } from './admin.repository';

const allowedAccountStatuses = new Set(['active', 'paused', 'restricted', 'suspended'] as const);
type AllowedAccountStatus = (typeof allowedAccountStatuses extends Set<infer T> ? T : never) & string;

export async function adminListUsers(_req: Request, res: Response) {
  try {
    const users = await listAllUsers();
    return res.json({ users });
  } catch {
    return res.status(500).json({ error: 'Failed to list users' });
  }
}

export async function adminUpdateUserAccountStatus(req: Request, res: Response) {
  try {
    const userId = (req.params as { userId?: string } | undefined)?.userId;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    const body = (req.body ?? {}) as { accountStatus?: string };
    if (!body.accountStatus) return res.status(400).json({ error: 'Missing accountStatus' });
    if (!allowedAccountStatuses.has(body.accountStatus as AllowedAccountStatus)) {
      return res.status(400).json({ error: 'Invalid accountStatus' });
    }

    const updated = await updateUserAccountStatus({
      userId,
      accountStatus: body.accountStatus as AllowedAccountStatus,
    });

    if (!updated) return res.status(404).json({ error: 'User not found' });
    return res.json({ user: updated });
  } catch {
    return res.status(500).json({ error: 'Failed to update account status' });
  }
}

export async function adminListBrandMetadata(_req: Request, res: Response) {
  try {
    const brands = await listBrandMetadata();
    return res.json({ brands });
  } catch {
    return res.status(500).json({ error: 'Failed to list brands' });
  }
}


