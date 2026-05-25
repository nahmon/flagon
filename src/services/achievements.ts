import { supabase } from './supabase';

export interface Badge {
  id: string;
  icon: string;
  label: string;
  desc: string;
  earned: boolean;
  progress: number;
  max: number;
}

export interface AchievementStats {
  totalFlags: number;
  distinctSummits: number;
  hasHighPeak: boolean;
}

export async function fetchAchievementStats(userId: string): Promise<AchievementStats> {
  const { data, error } = await supabase
    .from('flags')
    .select('summit_id, summits(elevation_m)')
    .eq('user_id', userId);

  if (error) throw error;

  const rows = (data ?? []) as unknown as Array<{ summit_id: string; summits: { elevation_m: number } | null }>;
  const distinctSummits = new Set(rows.map((r) => r.summit_id)).size;
  const hasHighPeak = rows.some((r) => (r.summits?.elevation_m ?? 0) >= 1000);

  return { totalFlags: rows.length, distinctSummits, hasHighPeak };
}

export function computeBadges(stats: AchievementStats): Badge[] {
  return [
    {
      id: 'first_flag',
      icon: '🚩',
      label: '첫 깃발',
      desc: '첫 번째 정상 정복',
      earned: stats.totalFlags >= 1,
      progress: Math.min(stats.totalFlags, 1),
      max: 1,
    },
    {
      id: 'explorer',
      icon: '🌟',
      label: '탐험가',
      desc: '3개 이상 다른 정상',
      earned: stats.distinctSummits >= 3,
      progress: Math.min(stats.distinctSummits, 3),
      max: 3,
    },
    {
      id: 'high_peak',
      icon: '⛰️',
      label: '고산 정복자',
      desc: '1000m 이상 정상 정복',
      earned: stats.hasHighPeak,
      progress: stats.hasHighPeak ? 1 : 0,
      max: 1,
    },
    {
      id: 'ten_flags',
      icon: '🗻',
      label: '열 번의 정복',
      desc: '깃발 10개 달성',
      earned: stats.totalFlags >= 10,
      progress: Math.min(stats.totalFlags, 10),
      max: 10,
    },
    {
      id: 'wanderer',
      icon: '🏔️',
      label: '산악 탐험가',
      desc: '10개 이상 다른 정상',
      earned: stats.distinctSummits >= 10,
      progress: Math.min(stats.distinctSummits, 10),
      max: 10,
    },
    {
      id: 'flag_king',
      icon: '👑',
      label: '등산왕',
      desc: '깃발 50개 달성',
      earned: stats.totalFlags >= 50,
      progress: Math.min(stats.totalFlags, 50),
      max: 50,
    },
  ];
}
