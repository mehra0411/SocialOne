import { randomUUID } from 'crypto';

function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

/**
 * Shared helper for Feed publishing (service + scheduler).
 * Supports:
 * - Public http(s) URLs (passed through)
 * - data: URLs (base64) uploaded to Supabase Storage
 */
export async function uploadImageIfNeeded(imageUrlOrData: string): Promise<string> {
  // If it's already a public URL, return as-is
  if (/^https?:\/\//i.test(imageUrlOrData)) return imageUrlOrData;

  // Handle data URLs (base64 images)
  if (imageUrlOrData.startsWith('data:')) {
    const supabaseUrl = requiredEnv('SUPABASE_URL').replace(/\/+$/, '');
    const serviceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
    const bucket = requiredEnv('SUPABASE_STORAGE_BUCKET');

    const match = /^data:(?<mime>[^;]+);base64,(?<b64>.+)$/i.exec(imageUrlOrData);
    const mime = match?.groups?.mime;
    const b64 = match?.groups?.b64;

    if (!mime || !b64) {
      throw new Error('Invalid data URL');
    }

    const bytes = Buffer.from(b64, 'base64');

    const ext =
      mime === 'image/png'
        ? 'png'
        : mime === 'image/webp'
        ? 'webp'
        : 'jpg';

    const objectPath = `feed/${randomUUID()}.${ext}`;

    const putUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${objectPath}`;

    const resp = await fetch(putUrl, {
      method: 'PUT', // ✅ MUST be PUT
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': mime,
        'Content-Length': bytes.length.toString(), // ✅ important
        'x-upsert': 'true',
      },
      body: bytes,
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(`Storage upload failed: ${resp.status} ${text}`);
    }

    // Bucket must be public
    return `${supabaseUrl}/storage/v1/object/public/${bucket}/${objectPath}`;
  }

  throw new Error('Unsupported image_url format (must be http(s) URL or data: URL)');
}
