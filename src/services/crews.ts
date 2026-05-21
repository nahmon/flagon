import { supabase } from './supabase';
import { Crew, CrewLeaderboardEntry, CrewMemberDetail } from '../types';

// Alphanumeric without ambiguous chars (0/O, 1/I)
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function generateInviteCode(): string {
  return Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
}

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

export type LeaderboardPeriod = 'week' | 'month' | 'alltime';

interface RawPeriodFlag {
  crew_id: string;
  planted_at: string;
  crews: { id: string; name: string; name_ko: string | null; color_hex: string; icon_type: string } | null;
}

export async function fetchLeaderboardByPeriod(period: LeaderboardPeriod): Promise<CrewLeaderboardEntry[]> {
  if (period === 'alltime') return fetchLeaderboard();

  const since = new Date();
  if (period === 'week') since.setDate(since.getDate() - 7);
  else since.setMonth(since.getMonth() - 1);

  const { data, error } = await supabase
    .from('flags')
    .select('crew_id, planted_at, crews(id, name, name_ko, color_hex, icon_type)')
    .gte('planted_at', since.toISOString())
    .not('crew_id', 'is', null);

  if (error) throw error;

  const crewMap = new Map<string, CrewLeaderboardEntry>();
  for (const row of (data ?? []) as unknown as RawPeriodFlag[]) {
    if (!row.crew_id || !row.crews) continue;
    const crew = row.crews;
    const entry = crewMap.get(row.crew_id);
    if (entry) {
      entry.flag_count++;
      if (!entry.last_flag_at || row.planted_at > entry.last_flag_at) {
        entry.last_flag_at = row.planted_at;
      }
    } else {
      crewMap.set(row.crew_id, {
        id: crew.id,
        name: crew.name,
        name_ko: crew.name_ko,
        color_hex: crew.color_hex,
        icon_type: crew.icon_type,
        flag_count: 1,
        last_flag_at: row.planted_at,
      });
    }
  }

  return Array.from(crewMap.values()).sort((a, b) => b.flag_count - a.flag_count);
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
    .insert({ name, name_ko: nameKo, color_hex: colorHex, icon_type: iconType, created_by: user.id, invite_code: generateInviteCode() })
    .select()
    .single();
  if (crewErr) throw crewErr;

  const { error: memberErr } = await supabase
    .from('crew_members')
    .insert({ user_id: user.id, crew_id: crew.id, role: 'leader' });
  if (memberErr) throw memberErr;

  return crew as Crew;
}

export async function fetchCrew(crewId: string): Promise<Crew | null> {
  const { data, error } = await supabase.from('crews').select('*').eq('id', crewId).single();
  if (error) throw error;
  return data as Crew ?? null;
}

export async function joinCrewByCode(inviteCode: string): Promise<Crew> {
  const { data, error } = await supabase
    .from('crews')
    .select('*')
    .eq('invite_code', inviteCode.trim().toUpperCase())
    .single();
  if (error || !data) throw new Error('invalid_code');
  await joinCrew((data as Crew).id);
  return data as Crew;
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

interface RawMember {
  user_id: string;
  role: string;
  joined_at: string;
  users: { display_name: string; avatar_url: string | null } | null;
}

interface RawFlag {
  user_id: string;
}

export async function fetchCrewMemberDetails(crewId: string): Promise<CrewMemberDetail[]> {
  const { data: members, error: membErr } = await supabase
    .from('crew_members')
    .select('user_id, role, joined_at, users(display_name, avatar_url)')
    .eq('crew_id', crewId);
  if (membErr) throw membErr;
  if (!members?.length) return [];

  const typedMembers = members as unknown as RawMember[];
  const userIds = typedMembers.map((m) => m.user_id);

  const { data: flags, error: flagErr } = await supabase
    .from('flags')
    .select('user_id')
    .in('user_id', userIds)
    .eq('is_active', true);
  if (flagErr) throw flagErr;

  const countMap: Record<string, number> = {};
  for (const f of (flags ?? []) as unknown as RawFlag[]) {
    countMap[f.user_id] = (countMap[f.user_id] ?? 0) + 1;
  }

  return typedMembers
    .map((m) => ({
      user_id: m.user_id,
      role: m.role as 'leader' | 'member',
      joined_at: m.joined_at,
      display_name: m.users?.display_name ?? '알 수 없음',
      avatar_url: m.users?.avatar_url ?? null,
      flag_count: countMap[m.user_id] ?? 0,
    }))
    .sort((a, b) => b.flag_count - a.flag_count);
}
