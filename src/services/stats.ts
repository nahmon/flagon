import { supabase } from './supabase';

export interface UserStats {
  totalFlags: number;
  uniqueSummits: number;
  highestPeakM: number;
  activeFlags: number;
}

export async function fetchUserStats(userId: string): Promise<UserStats> {
  const { data, error } = await supabase
    .from('flags')
    .select('summit_id, is_active, summits(elevation_m)')
    .eq('user_id', userId);

  if (error) throw error;

  type Row = { summit_id: string; is_active: boolean; summits: { elevation_m: number } | null };
  const rows = (data ?? []) as unknown as Row[];

  const uniqueSummits = new Set(rows.map((r) => r.summit_id)).size;
  const highestPeakM = rows.reduce((max, r) => Math.max(max, r.summits?.elevation_m ?? 0), 0);
  const activeFlags = rows.filter((r) => r.is_active).length;

  return { totalFlags: rows.length, uniqueSummits, highestPeakM, activeFlags };
}
