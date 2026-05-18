import { supabase } from './supabase';
import { RecentFlag } from '../types';

export interface FlagHistoryEntry {
  id: string;
  planted_at: string;
  expires_at: string;
  is_active: boolean;
  user_display_name: string;
  crew_name: string | null;
  crew_name_ko: string | null;
  crew_color_hex: string | null;
}

export async function plantFlag(summitId: string, crewId: string | null): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase.from('flags').insert({
    summit_id: summitId,
    user_id: user.id,
    crew_id: crewId,
  });
  if (error) throw error;
}

export async function getUserCrewId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('crew_members')
    .select('crew_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  return data?.crew_id ?? null;
}

export async function fetchSummitFlagHistory(summitId: string, limit = 8): Promise<FlagHistoryEntry[]> {
  const { data, error } = await supabase
    .from('flags')
    .select('id, planted_at, expires_at, is_active, users(display_name), crews(name, name_ko, color_hex)')
    .eq('summit_id', summitId)
    .order('planted_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    planted_at: row.planted_at,
    expires_at: row.expires_at,
    is_active: row.is_active,
    user_display_name: row.users?.display_name ?? '알 수 없음',
    crew_name: row.crews?.name ?? null,
    crew_name_ko: row.crews?.name_ko ?? null,
    crew_color_hex: row.crews?.color_hex ?? null,
  }));
}

export async function fetchUserRecentFlags(userId: string, limit = 10): Promise<RecentFlag[]> {
  const { data, error } = await supabase
    .from('flags')
    .select('id, planted_at, expires_at, is_active, summits(id, name_ko, name_en, elevation_m)')
    .eq('user_id', userId)
    .order('planted_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    planted_at: row.planted_at,
    expires_at: row.expires_at,
    is_active: row.is_active,
    summit: row.summits ?? null,
  }));
}
