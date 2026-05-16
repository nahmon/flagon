import { supabase } from './supabase';

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
