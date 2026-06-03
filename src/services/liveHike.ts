import { supabase } from './supabase';

export interface LiveBroadcast {
  id: string;
  user_id: string;
  display_name: string | null;
  summit_name_ko: string | null;
  summit_name_en: string | null;
  lat: number | null;
  lng: number | null;
  elev_gain_m: number;
  dist_km: number;
  elapsed_ms: number;
  started_at: string;
}

type RawLive = {
  id: string;
  user_id: string;
  summit_name_ko: string | null;
  summit_name_en: string | null;
  lat: number | null;
  lng: number | null;
  elev_gain_m: number;
  dist_km: number;
  elapsed_ms: number;
  started_at: string;
  user: { display_name: string | null } | null;
};

export async function startBroadcast(
  summitNameKo?: string,
  summitNameEn?: string,
): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('live_hikes')
    .insert({
      user_id: user.id,
      summit_name_ko: summitNameKo ?? null,
      summit_name_en: summitNameEn ?? null,
      lat: null,
      lng: null,
      elev_gain_m: 0,
      dist_km: 0,
      elapsed_ms: 0,
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) { console.error('[liveHike] start', error); return null; }
  return (data as { id: string } | null)?.id ?? null;
}

export async function stopBroadcast(broadcastId: string): Promise<void> {
  await supabase.from('live_hikes').delete().eq('id', broadcastId);
}

export async function updatePosition(
  broadcastId: string,
  lat: number,
  lng: number,
  elevGainM: number,
  distKm: number,
  elapsedMs: number,
): Promise<void> {
  await supabase
    .from('live_hikes')
    .update({ lat, lng, elev_gain_m: Math.round(elevGainM), dist_km: distKm, elapsed_ms: elapsedMs })
    .eq('id', broadcastId);
}

export async function fetchLiveFollowing(): Promise<LiveBroadcast[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: followData } = await supabase
    .from('user_follows')
    .select('followee_id')
    .eq('follower_id', user.id);

  const ids = ((followData ?? []) as { followee_id: string }[]).map((f) => f.followee_id);
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from('live_hikes')
    .select(`id, user_id, summit_name_ko, summit_name_en,
      lat, lng, elev_gain_m, dist_km, elapsed_ms, started_at,
      user:users(display_name)`)
    .in('user_id', ids)
    .order('started_at', { ascending: false });

  if (error) { console.error('[liveHike] fetch', error); return []; }

  return ((data ?? []) as RawLive[]).map((r) => ({
    id: r.id,
    user_id: r.user_id,
    display_name: r.user?.display_name ?? null,
    summit_name_ko: r.summit_name_ko,
    summit_name_en: r.summit_name_en,
    lat: r.lat,
    lng: r.lng,
    elev_gain_m: r.elev_gain_m,
    dist_km: r.dist_km,
    elapsed_ms: r.elapsed_ms,
    started_at: r.started_at,
  }));
}
