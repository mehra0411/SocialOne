import { randomUUID } from 'crypto';
import { supabaseAdmin } from '../../config/supabase';

function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export async function uploadImageBufferToPublicUrl(args: {
  bytes: Buffer;
  mime: string;
  prefix?: string;
}): Promise<string> {
  const bucket = requiredEnv('SUPABASE_STORAGE_BUCKET');
  const ext = args.mime === 'image/png' ? 'png' : args.mime === 'image/webp' ? 'webp' : 'jpg';
  const objectPath = `${args.prefix ?? 'feed'}/${randomUUID()}.${ext}`;

  const { error: uploadError } = await supabaseAdmin.storage.from(bucket).upload(objectPath, args.bytes, {
    contentType: args.mime,
    upsert: true,
  });
  if (uploadError) throw new Error(uploadError.message || 'Storage upload failed');

  const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(objectPath);
  if (!data?.publicUrl) throw new Error('Failed to get public URL');
  return data.publicUrl;
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
    const match = /^data:(?<mime>[^;]+);base64,(?<b64>.+)$/i.exec(imageUrlOrData);
    const mime = match?.groups?.mime;
    const b64 = match?.groups?.b64;

    if (!mime || !b64) {
      throw new Error('Invalid data URL');
    }

    const bytes = Buffer.from(b64, 'base64');
    return await uploadImageBufferToPublicUrl({ bytes, mime, prefix: 'feed' });
  }

  throw new Error('Unsupported image_url format (must be http(s) URL or data: URL)');
}
