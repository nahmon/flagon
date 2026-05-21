import { supabase } from './supabase';

export interface MountainGroupEntry {
  group: string;
  total: number;
  flagged: number;
}

interface RawSummit {
  id: string;
  mountain_group: string | null;
}

interface RawFlag {
  summit_id: string;
}

export async function fetchMountainGroupProgress(userId: string): Promise<MountainGroupEntry[]> {
  const [summitsRes, flagsRes] = await Promise.all([
    supabase
      .from('summits')
      .select('id, mountain_group')
      .not('mountain_group', 'is', null),
    supabase
      .from('flags')
      .select('summit_id')
      .eq('user_id', userId)
      .eq('is_active', true),
  ]);

  if (summitsRes.error) throw summitsRes.error;
  if (flagsRes.error) throw flagsRes.error;

  const summits = (summitsRes.data ?? []) as RawSummit[];
  const flaggedIds = new Set((flagsRes.data ?? []).map((f: RawFlag) => f.summit_id));

  const groupMap = new Map<string, { total: number; flagged: number }>();
  for (const s of summits) {
    const g = s.mountain_group!;
    const entry = groupMap.get(g) ?? { total: 0, flagged: 0 };
    entry.total++;
    if (flaggedIds.has(s.id)) entry.flagged++;
    groupMap.set(g, entry);
  }

  return Array.from(groupMap.entries())
    .map(([group, { total, flagged }]) => ({ group, total, flagged }))
    .sort((a, b) => b.flagged - a.flagged || b.total - a.total);
}
