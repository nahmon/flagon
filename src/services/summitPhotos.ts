import { supabase } from './supabase';

export interface SummitPhoto {
  id: string;
  summit_id: string;
  user_id: string;
  user_display_name: string;
  storage_key: string;
  url: string;
  created_at: string;
}

export async function fetchSummitPhotos(summitId: string): Promise<SummitPhoto[]> {
  const { data, error } = await supabase
    .from('summit_photos')
    .select('*, profiles(display_name)')
    .eq('summit_id', summitId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    summit_id: row.summit_id,
    user_id: row.user_id,
    user_display_name: row.profiles?.display_name ?? 'Unknown',
    storage_key: row.storage_key,
    url: row.url,
    created_at: row.created_at,
  }));
}

export async function uploadSummitPhoto(summitId: string, localUri: string): Promise<SummitPhoto> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const ext = localUri.split('.').pop()?.toLowerCase() ?? 'jpg';
  const key = `${summitId}/${user.id}_${Date.now()}.${ext}`;

  const resp = await fetch(localUri);
  const blob = await resp.blob();

  const { error: uploadError } = await supabase.storage
    .from('summit-photos')
    .upload(key, blob, { contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}` });
  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage.from('summit-photos').getPublicUrl(key);

  const { data, error } = await supabase
    .from('summit_photos')
    .insert({ summit_id: summitId, user_id: user.id, storage_key: key, url: publicUrl })
    .select('*, profiles(display_name)')
    .single();
  if (error) throw error;

  return {
    id: data.id,
    summit_id: data.summit_id,
    user_id: data.user_id,
    user_display_name: data.profiles?.display_name ?? 'Unknown',
    storage_key: data.storage_key,
    url: data.url,
    created_at: data.created_at,
  };
}

export async function deleteSummitPhoto(photoId: string, storageKey: string): Promise<void> {
  await supabase.storage.from('summit-photos').remove([storageKey]);
  const { error } = await supabase.from('summit_photos').delete().eq('id', photoId);
  if (error) throw error;
}
