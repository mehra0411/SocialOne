import { supabase } from './supabaseClient';

export async function uploadImageAndGetPublicUrl(file: File): Promise<string> {
  const bucket = (import.meta.env.VITE_SUPABASE_STORAGE_BUCKET as string | undefined)?.trim();
  if (!bucket) throw new Error('Missing VITE_SUPABASE_STORAGE_BUCKET');

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `uploads/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || undefined,
  });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  if (!data.publicUrl) throw new Error('Failed to get public URL');
  return data.publicUrl;
}


