import { supabase } from './supabase';
import { RecentFlag } from '../types';

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

export async function fetchUserRecentFlags(userId: string, limit = 10): Promise<RecentFlag[]> {
  const { data, error } = await supabase
    .from('flags')
    .select('id, planted_at, expires_at, is_active, summits(id, name_ko, elevation_m)')
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
