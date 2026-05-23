import { supabase } from './supabase';
import { Summit } from '../types';

export interface DailyChallenge {
  summit: Summit;
  conquerors_today: number;
}

function todaySeed(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function seededIndex(seed: string, max: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash * 31) + seed.charCodeAt(i)) >>> 0;
  }
  return hash % max;
}

export async function fetchDailyChallenge(): Promise<DailyChallenge | null> {
  const { data: summits, error: sErr } = await supabase
    .from('summits')
    .select('id, name_ko, name_en, name_ja, location, elevation_m, country, mountain_group, is_featured, created_at')
    .order('id');

  if (sErr || !summits || summits.length === 0) return null;

  const idx = seededIndex(todaySeed(), summits.length);
  const summit = summits[idx] as Summit;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { count, error: cErr } = await supabase
    .from('flags')
    .select('*', { count: 'exact', head: true })
    .eq('summit_id', summit.id)
    .gte('planted_at', todayStart.toISOString());

  if (cErr) return { summit, conquerors_today: 0 };

  return { summit, conquerors_today: count ?? 0 };
}
