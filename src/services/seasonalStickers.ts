import { supabase } from './supabase';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export const SEASON_META: Record<Season, { icon: string; label_ko: string; label_en: string; label_ja: string }> = {
  spring: { icon: '🌸', label_ko: '봄',   label_en: 'Spring', label_ja: '春' },
  summer: { icon: '☀️', label_ko: '여름', label_en: 'Summer', label_ja: '夏' },
  autumn: { icon: '🍁', label_ko: '가을', label_en: 'Autumn', label_ja: '秋' },
  winter: { icon: '❄️', label_ko: '겨울', label_en: 'Winter', label_ja: '冬' },
};

export const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter'];

function monthToSeason(month: number): Season {
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

export interface SummitSeasonEntry {
  summitId: string;
  summitName_ko: string;
  summitName_en: string | null;
  summitName_ja: string | null;
  elevation_m: number;
  seasons: Set<Season>;
  complete: boolean;
}

export interface SeasonalStickerResult {
  entries: SummitSeasonEntry[];
  completedCount: number;
}

interface RawFlag {
  planted_at: string;
  summits: {
    id: string;
    name_ko: string;
    name_en: string | null;
    name_ja: string | null;
    elevation_m: number;
  } | null;
}

export async function fetchSeasonalStickers(userId: string): Promise<SeasonalStickerResult> {
  const { data, error } = await supabase
    .from('flags')
    .select('planted_at, summits(id, name_ko, name_en, name_ja, elevation_m)')
    .eq('user_id', userId)
    .order('planted_at', { ascending: true });

  if (error || !data) return { entries: [], completedCount: 0 };

  const flags = data as unknown as RawFlag[];
  const map = new Map<string, SummitSeasonEntry>();

  for (const flag of flags) {
    if (!flag.summits) continue;
    const summit = flag.summits;
    const month = new Date(flag.planted_at).getMonth() + 1;
    const season = monthToSeason(month);

    if (!map.has(summit.id)) {
      map.set(summit.id, {
        summitId: summit.id,
        summitName_ko: summit.name_ko,
        summitName_en: summit.name_en,
        summitName_ja: summit.name_ja,
        elevation_m: summit.elevation_m,
        seasons: new Set(),
        complete: false,
      });
    }
    map.get(summit.id)!.seasons.add(season);
  }

  const entries = Array.from(map.values()).map((e) => ({
    ...e,
    complete: e.seasons.size === 4,
  }));

  entries.sort((a, b) => {
    if (a.complete !== b.complete) return a.complete ? -1 : 1;
    if (b.seasons.size !== a.seasons.size) return b.seasons.size - a.seasons.size;
    return b.elevation_m - a.elevation_m;
  });

  return { entries, completedCount: entries.filter((e) => e.complete).length };
}
