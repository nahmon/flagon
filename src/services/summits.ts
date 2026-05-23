import { supabase } from './supabase';
import { SummitWithFlag } from '../types';
import { Lang, summitName } from '../i18n/strings';

export interface HotSummit {
  id: string;
  name_ko: string;
  name_en: string | null;
  name_ja: string | null;
  elevation_m: number;
  mountain_group: string | null;
  flag_count: number;
}

export async function fetchHotSummits(limit = 20): Promise<HotSummit[]> {
  const { data, error } = await supabase
    .from('flags')
    .select('summit_id, summits!inner(id, name_ko, name_en, name_ja, elevation_m, mountain_group)');
  if (error) throw error;

  const map = new Map<string, HotSummit>();
  for (const row of (data ?? []) as unknown as Array<{ summit_id: string; summits: { id: string; name_ko: string; name_en: string | null; name_ja: string | null; elevation_m: number; mountain_group: string | null } }>) {
    const s = row.summits;
    const existing = map.get(row.summit_id);
    if (existing) {
      existing.flag_count++;
    } else {
      map.set(row.summit_id, {
        id: s.id,
        name_ko: s.name_ko,
        name_en: s.name_en,
        name_ja: s.name_ja,
        elevation_m: s.elevation_m,
        mountain_group: s.mountain_group,
        flag_count: 1,
      });
    }
  }

  return Array.from(map.values())
    .sort((a, b) => b.flag_count - a.flag_count)
    .slice(0, limit);
}

type SummitsNearRow = {
  id: string;
  name_ko: string;
  name_en: string | null;
  name_ja: string | null;
  location: { type: 'Point'; coordinates: [number, number] };
  elevation_m: number;
  country: string;
  mountain_group: string | null;
  is_featured: boolean;
  created_at: string;
  flag_id: string | null;
  flag_planted_at: string | null;
  flag_expires_at: string | null;
  crew_id: string | null;
  crew_color_hex: string | null;
  crew_name: string | null;
  crew_name_ko: string | null;
  crew_icon_type: string | null;
};

export async function fetchSummitsNear(
  lat: number,
  lng: number,
  radiusM = 10_000
): Promise<SummitWithFlag[]> {
  const { data, error } = await supabase.rpc('summits_near', {
    lat,
    lng,
    radius_m: radiusM,
  });
  if (error) throw error;

  return (data as SummitsNearRow[]).map((row) => ({
    id: row.id,
    name_ko: row.name_ko,
    name_en: row.name_en,
    name_ja: row.name_ja,
    location: row.location,
    elevation_m: row.elevation_m,
    country: row.country,
    mountain_group: row.mountain_group,
    is_featured: row.is_featured,
    created_at: row.created_at,
    active_flag: row.flag_id
      ? {
          id: row.flag_id,
          summit_id: row.id,
          user_id: '',
          crew_id: row.crew_id,
          planted_at: row.flag_planted_at ?? '',
          expires_at: row.flag_expires_at ?? '',
          is_active: true,
          crew: row.crew_id
            ? {
                id: row.crew_id,
                name: row.crew_name ?? '',
                name_ko: row.crew_name_ko,
                color_hex: row.crew_color_hex ?? '#71717A',
                icon_type: (row.crew_icon_type ?? 'SA') as 'ME' | 'SA' | 'NK',
                description: null,
                created_by: null,
                created_at: '',
              }
            : undefined,
        }
      : undefined,
  }));
}

export function summitsToGeoJSON(
  summits: SummitWithFlag[],
  userCrewId?: string | null,
  lang: Lang = 'ko',
): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: summits.map((s) => ({
      type: 'Feature',
      id: s.id,
      geometry: {
        type: 'Point',
        coordinates: [s.location.coordinates[0], s.location.coordinates[1]],
      },
      properties: {
        id: s.id,
        name: summitName(s, lang),
        elevation: s.elevation_m,
        crewId: s.active_flag?.crew_id ?? null,
        crewColor: s.active_flag?.crew?.color_hex ?? null,
        isOwnCrew: userCrewId && s.active_flag?.crew_id === userCrewId ? 1 : 0,
      },
    })),
  };
}
