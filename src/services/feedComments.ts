import { supabase } from './supabase';

export interface FeedComment {
  id: string;
  flag_id: string;
  user_id: string;
  display_name: string | null;
  body: string;
  created_at: string;
}

export async function fetchComments(flagId: string): Promise<FeedComment[]> {
  const { data, error } = await supabase
    .from('flag_comments')
    .select('id, flag_id, user_id, body, created_at, users(display_name)')
    .eq('flag_id', flagId)
    .order('created_at', { ascending: true })
    .limit(50);
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    flag_id: row.flag_id,
    user_id: row.user_id,
    display_name: row.users?.display_name ?? null,
    body: row.body,
    created_at: row.created_at,
  }));
}

export async function addComment(flagId: string, body: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const trimmed = body.trim().slice(0, 140);
  if (!trimmed) throw new Error('Empty comment');
  const { error } = await supabase.from('flag_comments').insert({
    flag_id: flagId,
    user_id: user.id,
    body: trimmed,
  });
  if (error) throw error;
}

export async function deleteComment(commentId: string): Promise<void> {
  const { error } = await supabase.from('flag_comments').delete().eq('id', commentId);
  if (error) throw error;
}

export async function fetchCommentCount(flagId: string): Promise<number> {
  const { count, error } = await supabase
    .from('flag_comments')
    .select('id', { count: 'exact', head: true })
    .eq('flag_id', flagId);
  if (error) return 0;
  return count ?? 0;
}
