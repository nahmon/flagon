import { supabase } from './supabase';
import { fetchStreak, type StreakInfo } from './streaks';

export interface CompareStats {
  userId: string;
  displayName: string | null;
  totalFlags: number;
  uniqueSummits: number;
  highestPeakM: number;
  currentStreak: number;
  bestStreak: number;
  totalElevationM: number;
  flagsThisWeek: number;
}

type FlagRow = {
  summit_id: string;
  planted_at: string;
  summits: { elevation_m: number } | null;
};

async function buildStats(userId: string): Promise<Omit<CompareStats, 'userId' | 'displayName'>> {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [{ data: flags, error }, streak] = await Promise.all([
    supabase
      .from('flags')
      .select('summit_id, planted_at, summits(elevation_m)')
      .eq('user_id', userId),
    fetchStreak(userId),
  ]);

  if (error) throw error;

  const rows = (flags ?? []) as unknown as FlagRow[];
  const uniqueSummits = new Set(rows.map((r) => r.summit_id)).size;
  const highestPeakM = rows.reduce((m, r) => Math.max(m, r.summits?.elevation_m ?? 0), 0);
  const totalElevationM = rows.reduce((s, r) => s + (r.summits?.elevation_m ?? 0), 0);
  const flagsThisWeek = rows.filter((r) => new Date(r.planted_at) >= weekAgo).length;

  return {
    totalFlags: rows.length,
    uniqueSummits,
    highestPeakM,
    currentStreak: (streak as StreakInfo).current,
    bestStreak: (streak as StreakInfo).best,
    totalElevationM,
    flagsThisWeek,
  };
}

export async function fetchCompareStats(targetUserId: string): Promise<{ me: CompareStats; them: CompareStats }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('not_authenticated');

  const myId = user.id;

  const [meData, themData, { data: profiles }] = await Promise.all([
    buildStats(myId),
    buildStats(targetUserId),
    supabase.from('users').select('id, display_name').in('id', [myId, targetUserId]),
  ]);

  type PRow = { id: string; display_name: string | null };
  const profileMap = new Map<string, string | null>(
    ((profiles ?? []) as PRow[]).map((p) => [p.id, p.display_name]),
  );

  return {
    me: { userId: myId, displayName: profileMap.get(myId) ?? null, ...meData },
    them: { userId: targetUserId, displayName: profileMap.get(targetUserId) ?? null, ...themData },
  };
}
