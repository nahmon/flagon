import { supabase } from './supabase';
import { SummitRating, SummitRatingAggregate } from '../types';

export async function submitRating(
  summitId: string,
  difficulty: number,
  views: number,
  trailCondition: 'good' | 'fair' | 'poor',
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('summit_ratings')
    .upsert(
      { summit_id: summitId, user_id: user.id, difficulty, views, trail_condition: trailCondition },
      { onConflict: 'summit_id,user_id' },
    );
  if (error) throw error;
}

export async function fetchSummitRatingAggregate(
  summitId: string,
): Promise<SummitRatingAggregate | null> {
  const { data, error } = await supabase
    .from('summit_ratings')
    .select('difficulty, views, trail_condition')
    .eq('summit_id', summitId);
  if (error) throw error;
  if (!data || data.length === 0) return null;

  type Row = { difficulty: number; views: number; trail_condition: string };
  const rows = data as Row[];
  const count = rows.length;
  const avg_difficulty = rows.reduce((s: number, r: Row) => s + r.difficulty, 0) / count;
  const avg_views = rows.reduce((s: number, r: Row) => s + r.views, 0) / count;
  const trail_good = rows.filter((r: Row) => r.trail_condition === 'good').length;
  const trail_fair = rows.filter((r: Row) => r.trail_condition === 'fair').length;
  const trail_poor = rows.filter((r: Row) => r.trail_condition === 'poor').length;

  return { count, avg_difficulty, avg_views, trail_good, trail_fair, trail_poor };
}

export async function getUserRatingForSummit(summitId: string): Promise<SummitRating | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('summit_ratings')
    .select('*')
    .eq('summit_id', summitId)
    .eq('user_id', user.id)
    .maybeSingle();
  return (data as SummitRating | null) ?? null;
}
