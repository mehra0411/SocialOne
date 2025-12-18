import type { NextFunction, Request, Response } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';

type UserRole = 'user' | 'super_admin';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: 'user' | 'super_admin' };
    }
  }
}

type JwtHeader = {
  alg?: string;
  typ?: string;
  kid?: string;
};

type JwtPayload = {
  sub?: string;
  role?: unknown;
  exp?: number;
  nbf?: number;
  app_metadata?: { role?: unknown } | null;
  user_metadata?: { role?: unknown } | null;
};

function base64UrlToBuffer(input: string): Buffer {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + '='.repeat(padLen);
  return Buffer.from(padded, 'base64');
}

function bufferToBase64Url(buf: Buffer): string {
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function readBearerToken(req: Request): string | null {
  const header = req.header('authorization') ?? req.header('Authorization');
  if (!header) return null;

  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return null;

  return token.trim();
}

function extractRole(payload: JwtPayload): UserRole | null {
  const candidates = [payload.role, payload.app_metadata?.role, payload.user_metadata?.role];
  for (const c of candidates) {
    if (c === 'user' || c === 'super_admin') return c;
  }
  return null;
}

function verifySupabaseJwtHs256(token: string, secret: string): { id: string; role: UserRole } {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Malformed JWT');

  const [headerB64, payloadB64, sigB64] = parts;

  const headerJson = base64UrlToBuffer(headerB64).toString('utf8');
  const payloadJson = base64UrlToBuffer(payloadB64).toString('utf8');

  const header = JSON.parse(headerJson) as JwtHeader;
  const payload = JSON.parse(payloadJson) as JwtPayload;

  if (header.alg !== 'HS256') throw new Error('Unsupported JWT alg');

  const signingInput = `${headerB64}.${payloadB64}`;
  const expectedSig = createHmac('sha256', secret).update(signingInput).digest();
  const actualSig = base64UrlToBuffer(sigB64);

  if (expectedSig.length !== actualSig.length || !timingSafeEqual(expectedSig, actualSig)) {
    throw new Error('Invalid JWT signature');
  }

  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.nbf === 'number' && now < payload.nbf) throw new Error('JWT not active');
  if (typeof payload.exp === 'number' && now >= payload.exp) throw new Error('JWT expired');

  if (!payload.sub) throw new Error('Missing sub');
  const role = extractRole(payload);
  if (!role) throw new Error('Missing/invalid role');

  return { id: payload.sub, role };
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const token = readBearerToken(req);
    if (!token) return res.status(401).json({ error: 'Missing Authorization Bearer token' });

    const secret = process.env.SUPABASE_JWT_SECRET ?? process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ error: 'Server missing JWT secret' });

    const { id, role } = verifySupabaseJwtHs256(token, secret);
    req.user = { id, role };

    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}


