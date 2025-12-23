import { supabaseAdmin } from '../../config/supabase';
import { randomUUID } from 'crypto';

export async function ensurePublicUserExists(args: { id: string; email?: string }): Promise<void> {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', args.id)
      .maybeSingle();

    if (error) throw error;
    if (data?.id) return;

    let email = args.email ?? null;
    if (!email) {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.getUserById(args.id);
      if (authError) throw authError;
      email = authData.user?.email ?? null;
    }

    if (!email) throw new Error('Missing user email');

    const { error: insertError } = await supabaseAdmin.from('users').insert({
      id: args.id,
      email,
      created_at: new Date().toISOString(),
    });

    // If a concurrent request inserted the row first, ignore the duplicate-key error.
    if (insertError && (insertError as any).code !== '23505') throw insertError;
  } catch (error) {
    console.error('ensurePublicUserExists failed:', JSON.stringify(error, null, 2));
    throw error;
  }
}

export async function listBrands(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('brands')
    .select('*')
    .eq('owner_user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function createBrand(
  userId: string,
  payload: {
    name: string;
    instagram_handle?: string;
    tone?: string;
  }
) {
  const { data, error } = await supabaseAdmin
    .from('brands')
    .insert({
      id: randomUUID(),
      owner_user_id: userId,
      created_at: new Date().toISOString(),
      ...payload
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
