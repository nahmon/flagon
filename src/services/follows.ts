import { supabase } from './supabase';

export interface FollowCounts {
  followers: number;
  following: number;
}

export interface FollowEntry {
  userId: string;
  displayName: string | null;
  crewName: string | null;
  crewColor: string | null;
}

export async function followUser(followeeId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('not_authenticated');
  const { error } = await supabase
    .from('user_follows')
    .insert({ follower_id: user.id, followee_id: followeeId });
  if (error) throw error;
}

export async function unfollowUser(followeeId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('not_authenticated');
  const { error } = await supabase
    .from('user_follows')
    .delete()
    .eq('follower_id', user.id)
    .eq('followee_id', followeeId);
  if (error) throw error;
}

export async function isFollowing(followeeId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from('user_follows')
    .select('followee_id')
    .eq('follower_id', user.id)
    .eq('followee_id', followeeId)
    .maybeSingle();
  return !!data;
}

export async function fetchFollowCounts(userId: string): Promise<FollowCounts> {
  const [{ count: followers }, { count: following }] = await Promise.all([
    supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('followee_id', userId),
    supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
  ]);
  return { followers: followers ?? 0, following: following ?? 0 };
}

export async function fetchFollowingList(userId: string): Promise<FollowEntry[]> {
  type Row = {
    followee_id: string;
    users: { display_name: string | null; crews: { name: string | null; name_ko: string | null; color_hex: string } | null } | null;
  };
  const { data, error } = await supabase
    .from('user_follows')
    .select('followee_id, users!user_follows_followee_id_fkey(display_name, crews(name, name_ko, color_hex))')
    .eq('follower_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as Row[]).map((row) => ({
    userId: row.followee_id,
    displayName: row.users?.display_name ?? null,
    crewName: row.users?.crews?.name ?? row.users?.crews?.name_ko ?? null,
    crewColor: row.users?.crews?.color_hex ?? null,
  }));
}
