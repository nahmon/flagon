import { supabase } from './supabase';
import { Crew, CrewLeaderboardEntry } from '../types';

export async function fetchCrews(): Promise<Crew[]> {
  const { data, error } = await supabase
    .from('crews')
    .select('*')
    .order('name');
  if (error) throw error;
  return data ?? [];
}

export async function fetchLeaderboard(): Promise<CrewLeaderboardEntry[]> {
  const { data, error } = await supabase.rpc('crew_leaderboard');
  if (error) throw error;
  return (data ?? []) as CrewLeaderboardEntry[];
}

export async function createCrew(
  name: string,
  nameKo: string,
  colorHex: string,
  iconType: 'ME' | 'SA' | 'NK',
): Promise<Crew> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: crew, error: crewErr } = await supabase
    .from('crews')
    .insert({ name, name_ko: nameKo, color_hex: colorHex, icon_type: iconType, created_by: user.id })
    .select()
    .single();
  if (crewErr) throw crewErr;

  const { error: memberErr } = await supabase
    .from('crew_members')
    .insert({ user_id: user.id, crew_id: crew.id, role: 'leader' });
  if (memberErr) throw memberErr;

  return crew as Crew;
}

export async function joinCrew(crewId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('crew_members')
    .insert({ user_id: user.id, crew_id: crewId, role: 'member' });
  if (error) throw error;
}

export async function leaveCrew(crewId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('crew_members')
    .delete()
    .eq('user_id', user.id)
    .eq('crew_id', crewId);
  if (error) throw error;
}

export interface UserProfile {
  display_name: string;
  avatar_url: string | null;
  crew_id: string | null;
  crew_name: string | null;
  crew_name_ko: string | null;
  crew_color_hex: string | null;
  crew_icon_type: string | null;
  flag_count: number;
}

export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase.rpc('user_profile', { p_user_id: userId });
  if (error) throw error;
  return data?.[0] ?? null;
}
