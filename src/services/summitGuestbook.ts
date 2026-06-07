import { supabase } from './supabase';

export interface GuestbookEntry {
  id: string;
  userId: string;
  displayName: string;
  message: string;
  createdAt: string;
}

type RawEntry = {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  users: { display_name: string | null } | null;
};

export async function fetchGuestbook(summitId: string, limit = 30): Promise<GuestbookEntry[]> {
  const { data, error } = await supabase
    .from('summit_guestbook')
    .select('id, user_id, message, created_at, users(display_name)')
    .eq('summit_id', summitId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return ((data ?? []) as unknown as RawEntry[]).map((row) => ({
    id: row.id,
    userId: row.user_id,
    displayName: row.users?.display_name ?? '?',
    message: row.message,
    createdAt: row.created_at,
  }));
}

export async function postGuestbookEntry(summitId: string, message: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('summit_guestbook')
    .insert({ summit_id: summitId, user_id: user.id, message: message.trim() });

  if (error) throw error;
}

export async function deleteGuestbookEntry(entryId: string): Promise<void> {
  const { error } = await supabase
    .from('summit_guestbook')
    .delete()
    .eq('id', entryId);

  if (error) throw error;
}
