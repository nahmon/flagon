import { supabase } from './supabase';

export interface NearbyFlagEntry {
  flag_id: string;
  user_id: string;
  display_name: string | null;
  crew_name: string | null;
  crew_color: string | null;
  summit_id: string;
  summit_name_ko: string;
  summit_name_en: string | null;
  summit_name_ja: string | null;
  elevation_m: number;
  distance_km: number;
  planted_at: string;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

type SummitRow = {
  id: string;
  name_ko: string;
  name_en: string | null;
  name_ja: string | null;
  elevation_m: number;
  lat: number;
  lng: number;
};

type FlagRow = {
  id: string;
  user_id: string;
  summit_id: string;
  planted_at: string;
  users: { display_name: string | null } | null;
  crews: { name: string; color_hex: string } | null;
};

export async function fetchNearbyActivity(
  lat: number,
  lng: number,
  radiusKm = 10,
): Promise<NearbyFlagEntry[]> {
  const delta = radiusKm / 111;
  const lngDelta = delta / Math.max(Math.cos((lat * Math.PI) / 180), 0.01);

  const { data: summitsData, error: se } = await supabase
    .from('summits')
    .select('id, name_ko, name_en, name_ja, elevation_m, lat, lng')
    .gte('lat', lat - delta)
    .lte('lat', lat + delta)
    .gte('lng', lng - lngDelta)
    .lte('lng', lng + lngDelta);

  if (se || !summitsData || summitsData.length === 0) return [];

  const summitsInRadius = (summitsData as SummitRow[]).filter(
    (s) => haversineKm(lat, lng, s.lat, s.lng) <= radiusKm,
  );
  if (summitsInRadius.length === 0) return [];

  const summitMap = new Map<string, SummitRow>(summitsInRadius.map((s) => [s.id, s]));
  const summitIds = summitsInRadius.map((s) => s.id);

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: flagsData, error: fe } = await supabase
    .from('flags')
    .select('id, user_id, summit_id, planted_at, users(display_name), crews(name, color_hex)')
    .in('summit_id', summitIds)
    .gte('planted_at', since)
    .order('planted_at', { ascending: false })
    .limit(60);

  if (fe || !flagsData) return [];

  return (flagsData as FlagRow[])
    .map((f) => {
      const s = summitMap.get(f.summit_id);
      if (!s) return null;
      return {
        flag_id: f.id,
        user_id: f.user_id,
        display_name: f.users?.display_name ?? null,
        crew_name: f.crews?.name ?? null,
        crew_color: f.crews?.color_hex ?? null,
        summit_id: f.summit_id,
        summit_name_ko: s.name_ko,
        summit_name_en: s.name_en,
        summit_name_ja: s.name_ja,
        elevation_m: s.elevation_m,
        distance_km: Math.round(haversineKm(lat, lng, s.lat, s.lng) * 10) / 10,
        planted_at: f.planted_at,
      };
    })
    .filter((e): e is NearbyFlagEntry => e !== null)
    .sort((a, b) => a.distance_km - b.distance_km);
}
