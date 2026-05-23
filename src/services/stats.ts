import { supabase } from './supabase';
import { HikerLeaderboardEntry } from '../types';

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

interface RawFlagRow {
  user_id: string;
  planted_at: string;
  users: { display_name: string | null } | null;
  crews: { name: string | null; name_ko: string | null; color_hex: string } | null;
}

export async function fetchTopHikers(limit = 20): Promise<HikerLeaderboardEntry[]> {
  const { data, error } = await supabase
    .from('flags')
    .select('user_id, planted_at, users(display_name), crews(name, name_ko, color_hex)');

  if (error) throw error;

  const rows = (data ?? []) as unknown as RawFlagRow[];

  const map = new Map<string, HikerLeaderboardEntry>();
  for (const row of rows) {
    const existing = map.get(row.user_id);
    const last = existing?.last_flag_at;
    const isNewer = !last || row.planted_at > last;
    if (!existing) {
      map.set(row.user_id, {
        user_id: row.user_id,
        display_name: row.users?.display_name ?? null,
        crew_name: row.crews?.name ?? row.crews?.name_ko ?? null,
        crew_color: row.crews?.color_hex ?? null,
        total_flags: 1,
        last_flag_at: row.planted_at,
      });
    } else {
      existing.total_flags += 1;
      if (isNewer) existing.last_flag_at = row.planted_at;
    }
  }

  return Array.from(map.values())
    .sort((a, b) => b.total_flags - a.total_flags)
    .slice(0, limit);
}
