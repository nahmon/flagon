import { supabase } from './supabase';
import { GpsPoint } from '../types';

export interface HikeRecord {
  id: string;
  summit_name: string | null;
  elevation_m: number | null;
  started_at: string | null;
  summit_verified_at: string | null;
  flag_planted: boolean;
  gps_track: GpsPoint[];
  created_at: string;
}

export async function fetchUserRecentHikes(userId: string, limit = 12): Promise<HikeRecord[]> {
  const { data, error } = await supabase
    .from('hikes')
    .select('id, started_at, summit_verified_at, flag_planted, gps_track, created_at, summits(name_ko, name_en, elevation_m)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    summit_name: row.summits?.name_ko ?? row.summits?.name_en ?? null,
    elevation_m: row.summits?.elevation_m ?? null,
    started_at: row.started_at,
    summit_verified_at: row.summit_verified_at,
    flag_planted: row.flag_planted,
    gps_track: row.gps_track ?? [],
    created_at: row.created_at,
  }));
}

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
