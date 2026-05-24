import { supabase } from './supabase';

export interface MyActiveFlag {
  id: string;
  summit_id: string;
  summit_name_ko: string;
  summit_name_en: string | null;
  summit_name_ja: string | null;
  elevation_m: number;
  planted_at: string;
  expires_at: string;
}

export async function fetchMyActiveFlags(): Promise<MyActiveFlag[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('flags')
    .select('id, summit_id, planted_at, expires_at, summits(name_ko, name_en, name_ja, elevation_m)')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('expires_at', { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: row.id,
    summit_id: row.summit_id,
    summit_name_ko: row.summits?.name_ko ?? '알 수 없음',
    summit_name_en: row.summits?.name_en ?? null,
    summit_name_ja: row.summits?.name_ja ?? null,
    elevation_m: row.summits?.elevation_m ?? 0,
    planted_at: row.planted_at,
    expires_at: row.expires_at,
  }));
}
