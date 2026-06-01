import { supabase } from './supabase';

export interface FriendFlagEntry {
  userId: string;
  displayName: string | null;
  crewColor: string | null;
  plantedAt: string;
}

export async function fetchFriendsOnSummit(summitId: string): Promise<FriendFlagEntry[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: follows } = await supabase
    .from('user_follows')
    .select('followee_id')
    .eq('follower_id', user.id);

  const followeeIds = (follows ?? []).map((r: { followee_id: string }) => r.followee_id);
  if (followeeIds.length === 0) return [];

  type Row = {
    user_id: string;
    planted_at: string;
    users: { display_name: string | null } | null;
    crews: { color_hex: string } | null;
  };

  const { data, error } = await supabase
    .from('flags')
    .select('user_id, planted_at, users(display_name), crews(color_hex)')
    .eq('summit_id', summitId)
    .in('user_id', followeeIds)
    .order('planted_at', { ascending: false })
    .limit(20);

  if (error) throw error;

  const seen = new Set<string>();
  const result: FriendFlagEntry[] = [];
  for (const row of (data ?? []) as unknown as Row[]) {
    if (seen.has(row.user_id)) continue;
    seen.add(row.user_id);
    result.push({
      userId: row.user_id,
      displayName: row.users?.display_name ?? null,
      crewColor: row.crews?.color_hex ?? null,
      plantedAt: row.planted_at,
    });
  }
  return result;
}
