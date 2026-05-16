import { supabase } from './supabase';
import { SummitWithFlag } from '../types';

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
  return data as SummitWithFlag[];
}

export function summitsToGeoJSON(
  summits: SummitWithFlag[]
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
        name: s.name_ko,
        elevation: s.elevation_m,
        crewId: s.active_flag?.crew_id ?? null,
        crewColor: s.active_flag?.crew?.color_hex ?? null,
      },
    })),
  };
}
