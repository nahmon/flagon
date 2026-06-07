import { supabase } from './supabase';

export interface TopConquerer {
  userId: string;
  displayName: string;
  crewColor: string | null;
  flagCount: number;
  lastPlantedAt: string;
}

type FlagRow = {
  user_id: string;
  planted_at: string;
  users: { display_name: string | null } | null;
  crews: { color_hex: string } | null;
};

export async function fetchTopConquerers(summitId: string, limit = 10): Promise<TopConquerer[]> {
  const { data, error } = await supabase
    .from('flags')
    .select('user_id, planted_at, users(display_name), crews(color_hex)')
    .eq('summit_id', summitId)
    .order('planted_at', { ascending: false });

  if (error) throw error;

  const byUser = new Map<string, { name: string; color: string | null; count: number; last: string }>();
  for (const row of ((data ?? []) as unknown) as FlagRow[]) {
    const uid = row.user_id;
    const existing = byUser.get(uid);
    if (existing) {
      existing.count++;
    } else {
      byUser.set(uid, {
        name: row.users?.display_name ?? '?',
        color: row.crews?.color_hex ?? null,
        count: 1,
        last: row.planted_at,
      });
    }
  }

  return Array.from(byUser.entries())
    .map(([userId, v]) => ({
      userId,
      displayName: v.name,
      crewColor: v.color,
      flagCount: v.count,
      lastPlantedAt: v.last,
    }))
    .sort((a, b) => b.flagCount - a.flagCount)
    .slice(0, limit);
}
