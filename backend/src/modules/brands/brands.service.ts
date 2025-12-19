import { supabaseAdmin } from '../../config/supabase';

export async function listBrands(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('brands')
    .select('*')
    .eq('user_id', userId)
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
      user_id: userId,
      ...payload
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
