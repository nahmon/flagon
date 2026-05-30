import { supabase } from './supabase';
import { fetchFollowingList } from './follows';
import type { FollowEntry } from './follows';

export type { FollowEntry };

export interface HikeBuddyInvite {
  id: string;
  inviter_id: string;
  invitee_id: string;
  summit_id: string;
  planned_date: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
}

export async function fetchMyFollowingForInvite(): Promise<FollowEntry[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  return fetchFollowingList(user.id);
}

export async function fetchBuddiesForHike(
  summitId: string,
  plannedDate: string,
): Promise<HikeBuddyInvite[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('hike_buddy_invites')
    .select('id, inviter_id, invitee_id, summit_id, planned_date, status, created_at')
    .eq('inviter_id', user.id)
    .eq('summit_id', summitId)
    .eq('planned_date', plannedDate);
  if (error || !data) return [];
  return data as HikeBuddyInvite[];
}

export async function inviteBuddy(
  summitId: string,
  inviteeId: string,
  plannedDate: string,
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('not_authenticated');
  const { error } = await supabase.from('hike_buddy_invites').upsert(
    {
      inviter_id: user.id,
      invitee_id: inviteeId,
      summit_id: summitId,
      planned_date: plannedDate,
      status: 'pending',
    },
    { onConflict: 'inviter_id,invitee_id,summit_id,planned_date' },
  );
  if (error) throw error;
}
