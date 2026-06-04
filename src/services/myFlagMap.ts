import { supabase } from './supabase';

export interface FlagMapPin {
  id: string;
  summit_id: string;
  name_ko: string;
  name_en: string | null;
  name_ja: string | null;
  elevation_m: number;
  lng: number;
  lat: number;
  planted_at: string;
  expires_at: string;
}

export async function fetchFlagMapPins(): Promise<FlagMapPin[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('flags')
    .select('id, planted_at, expires_at, summit_id, summits(name_ko, name_en, name_ja, elevation_m, location)')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('planted_at', { ascending: false });

  if (error) throw error;

  // PostgREST returns PostGIS geometry as GeoJSON: { type: 'Point', coordinates: [lng, lat] }
  return (data ?? []).flatMap((row: any) => {
    const s = row.summits;
    if (!s?.location?.coordinates) return [];
    return [{
      id: row.id,
      summit_id: row.summit_id,
      name_ko: s.name_ko ?? '알 수 없음',
      name_en: s.name_en ?? null,
      name_ja: s.name_ja ?? null,
      elevation_m: s.elevation_m ?? 0,
      lng: s.location.coordinates[0],
      lat: s.location.coordinates[1],
      planted_at: row.planted_at,
      expires_at: row.expires_at,
    }];
  });
}
