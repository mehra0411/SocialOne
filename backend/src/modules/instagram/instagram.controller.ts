import type { Response } from 'express';
import { randomBytes } from 'crypto';
import { AuthenticatedRequest } from '../../types/auth';
import { getBrandById } from '../brands/brand.repository';

type OAuthStartBody = {
  brandId?: string;
};

function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function buildMetaOAuthUrl(state: string): string {
  const clientId = requiredEnv('META_APP_ID');
  const redirectUri = requiredEnv('META_REDIRECT_URI');

  const dialogBase =
    process.env.META_OAUTH_DIALOG_URL?.trim() ||
    'https://www.facebook.com/v21.0/dialog/oauth';

  const scope =
    process.env.META_OAUTH_SCOPES?.trim() ||
    'instagram_basic';

  const url = new URL(dialogBase);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('state', state);
  url.searchParams.set('scope', scope);

  return url.toString();
}

/**
 * POST /api/instagram/oauth/start
 */
export async function instagramOAuthStart(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const userId = req.user.id;

    const body = (req.body ?? {}) as OAuthStartBody;
    const brandId = body.brandId;

    if (!brandId) {
      return res.status(400).json({ error: 'Missing brandId' });
    }

    // Ensure brand belongs to this user
    const brand = await getBrandById(brandId, userId);
    if (!brand) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const nonce = randomBytes(16).toString('hex');
    const state = `${brandId}:${nonce}`;

    const redirectUrl = buildMetaOAuthUrl(state);
    return res.json({ redirectUrl });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to start OAuth' });
  }
}
