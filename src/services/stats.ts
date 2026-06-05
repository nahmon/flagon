import { supabase } from './supabase';
import { HikerLeaderboardEntry } from '../types';
import type { LeaderboardPeriod } from './crews';

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

function periodStart(period: LeaderboardPeriod): string | null {
  if (period === 'alltime') return null;
  const now = new Date();
  if (period === 'week') now.setDate(now.getDate() - 7);
  else now.setDate(now.getDate() - 30);
  return now.toISOString();
}

export interface ElevationLeaderboardEntry {
  user_id: string;
  display_name: string | null;
  crew_name: string | null;
  crew_color: string | null;
  total_elevation_m: number;
  flag_count: number;
}

export async function fetchElevationLeaderboard(limit = 20, period: LeaderboardPeriod = 'alltime'): Promise<ElevationLeaderboardEntry[]> {
  let query = supabase
    .from('flags')
    .select('user_id, planted_at, summits(elevation_m), users(display_name), crews(name, name_ko, color_hex)');

  const since = periodStart(period);
  if (since) query = query.gte('planted_at', since);

  const { data, error } = await query;
  if (error) throw error;

  type ElevRow = {
    user_id: string;
    planted_at: string;
    summits: { elevation_m: number } | null;
    users: { display_name: string | null } | null;
    crews: { name: string | null; name_ko: string | null; color_hex: string } | null;
  };

  const rows = (data ?? []) as unknown as ElevRow[];
  const map = new Map<string, ElevationLeaderboardEntry>();

  for (const row of rows) {
    const elev = row.summits?.elevation_m ?? 0;
    const existing = map.get(row.user_id);
    if (!existing) {
      map.set(row.user_id, {
        user_id: row.user_id,
        display_name: row.users?.display_name ?? null,
        crew_name: row.crews?.name ?? row.crews?.name_ko ?? null,
        crew_color: row.crews?.color_hex ?? null,
        total_elevation_m: elev,
        flag_count: 1,
      });
    } else {
      existing.total_elevation_m += elev;
      existing.flag_count += 1;
    }
  }

  return Array.from(map.values())
    .sort((a, b) => b.total_elevation_m - a.total_elevation_m)
    .slice(0, limit);
}

export async function fetchTopHikers(limit = 20, period: LeaderboardPeriod = 'alltime'): Promise<HikerLeaderboardEntry[]> {
  let query = supabase
    .from('flags')
    .select('user_id, planted_at, users(display_name), crews(name, name_ko, color_hex)');

  const since = periodStart(period);
  if (since) query = query.gte('planted_at', since);

  const { data, error } = await query;
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

export interface PublicProfile {
  userId: string;
  displayName: string | null;
  crewName: string | null;
  crewColor: string | null;
  totalFlags: number;
  uniqueSummits: number;
  highestPeakM: number;
  badgeCount: number;
  recentConquests: Array<{ summitName: string; elevation: number; plantedAt: string }>;
}

export async function fetchPublicProfile(userId: string): Promise<PublicProfile> {
  const { data: flagRows, error: flagErr } = await supabase
    .from('flags')
    .select('summit_id, planted_at, summits(name_ko, elevation_m), users(display_name), crews(name, name_ko, color_hex)')
    .eq('user_id', userId)
    .order('planted_at', { ascending: false });

  if (flagErr) throw flagErr;

  type FlagRow = {
    summit_id: string;
    planted_at: string;
    summits: { name_ko: string; elevation_m: number } | null;
    users: { display_name: string | null } | null;
    crews: { name: string | null; name_ko: string | null; color_hex: string } | null;
  };

  const rows = (flagRows ?? []) as unknown as FlagRow[];
  const uniqueSet = new Set(rows.map((r) => r.summit_id));
  const highestPeakM = rows.reduce((max, r) => Math.max(max, r.summits?.elevation_m ?? 0), 0);
  const first = rows[0];
  const displayName = first?.users?.display_name ?? null;
  const crewName = first?.crews?.name ?? first?.crews?.name_ko ?? null;
  const crewColor = first?.crews?.color_hex ?? null;

  const recentConquests = rows.slice(0, 5).map((r) => ({
    summitName: r.summits?.name_ko ?? '—',
    elevation: r.summits?.elevation_m ?? 0,
    plantedAt: r.planted_at,
  }));

  const badgeThresholds = [1, 5, 10, 25, 50, 100];
  const badgeCount = badgeThresholds.filter((t) => rows.length >= t).length;

  return {
    userId,
    displayName,
    crewName,
    crewColor,
    totalFlags: rows.length,
    uniqueSummits: uniqueSet.size,
    highestPeakM,
    badgeCount,
    recentConquests,
  };
}
