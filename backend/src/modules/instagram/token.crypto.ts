import { createDecipheriv } from 'crypto';

/**
 * Decrypts access tokens stored as:
 *   v1:<iv_b64url>:<tag_b64url>:<ciphertext_b64url>
 *
 * - Key must be 32 bytes (AES-256-GCM), provided via env `IG_TOKEN_ENCRYPTION_KEY_B64`
 * - Plaintext tokens are rejected to avoid storing tokens in plaintext.
 */
export function decryptAccessToken(accessTokenEncrypted: string): string {
  if (!accessTokenEncrypted) throw new Error('Missing encrypted token');
  if (!accessTokenEncrypted.startsWith('v1:')) {
    throw new Error('Token is not encrypted (expected v1:...)');
  }

  const parts = accessTokenEncrypted.split(':');
  if (parts.length !== 4) throw new Error('Invalid encrypted token format');

  const [, ivB64Url, tagB64Url, ctB64Url] = parts;

  const keyB64 = process.env.IG_TOKEN_ENCRYPTION_KEY_B64;
  if (!keyB64) throw new Error('Missing env: IG_TOKEN_ENCRYPTION_KEY_B64');
  const key = Buffer.from(keyB64, 'base64');
  if (key.length !== 32) throw new Error('IG_TOKEN_ENCRYPTION_KEY_B64 must decode to 32 bytes');

  const iv = base64UrlToBuffer(ivB64Url);
  const tag = base64UrlToBuffer(tagB64Url);
  const ct = base64UrlToBuffer(ctB64Url);

  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);

  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString('utf8');
}

function base64UrlToBuffer(input: string): Buffer {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + '='.repeat(padLen);
  return Buffer.from(padded, 'base64');
}


