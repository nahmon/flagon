import { supabase } from './supabase';
import { GpsPoint } from '../types';

export async function saveHike(params: {
  summitId: string;
  track: GpsPoint[];
  startedAt: string | null;
  summitVerifiedAt: string | null;
}): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase.from('hikes').insert({
    user_id: user.id,
    summit_id: params.summitId,
    gps_track: params.track,
    started_at: params.startedAt,
    summit_verified_at: params.summitVerifiedAt,
    flag_planted: true,
  });

  if (error) throw error;
}
