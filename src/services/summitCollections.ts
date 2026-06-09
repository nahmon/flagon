import { supabase } from './supabase';

export type CollectionId = 'starter' | 'mid_range' | 'high_peaks' | 'elite' | 'featured';

export type CollectionDef = {
  id: CollectionId;
  nameKo: string;
  nameEn: string;
  nameJa: string;
  emoji: string;
  color: string;
  descKo: string;
  descEn: string;
  descJa: string;
};

export const COLLECTIONS: readonly CollectionDef[] = [
  {
    id: 'starter',
    nameKo: '입문 봉우리',
    nameEn: 'Starter Peaks',
    nameJa: '初級峰',
    emoji: '🌱',
    color: '#71A846',
    descKo: '해발 500m 미만 봉우리 30선',
    descEn: 'Top 30 peaks under 500m',
    descJa: '標高500m未満トップ30の峰',
  },
  {
    id: 'mid_range',
    nameKo: '중급 봉우리',
    nameEn: 'Mid-Range Peaks',
    nameJa: '中級峰',
    emoji: '⛰️',
    color: '#4A7C59',
    descKo: '해발 500m~999m 봉우리',
    descEn: 'Peaks between 500m – 999m',
    descJa: '標高500〜999mの峰',
  },
  {
    id: 'high_peaks',
    nameKo: '1000m 클럽',
    nameEn: '1000m Club',
    nameJa: '1000mクラブ',
    emoji: '🏔️',
    color: '#5B7FA6',
    descKo: '해발 1,000m~1,499m 봉우리',
    descEn: 'Peaks from 1,000m – 1,499m',
    descJa: '標高1,000〜1,499mの峰',
  },
  {
    id: 'elite',
    nameKo: '고산 정복자',
    nameEn: 'Alpine Elite',
    nameJa: 'アルパインエリート',
    emoji: '🗻',
    color: '#8B6BA8',
    descKo: '해발 1,500m 이상 봉우리',
    descEn: 'Peaks at 1,500m and above',
    descJa: '標高1,500m以上の峰',
  },
  {
    id: 'featured',
    nameKo: '명산 완등',
    nameEn: 'Famous Peaks',
    nameJa: '名山制覇',
    emoji: '⭐',
    color: '#C0A44A',
    descKo: '추천 명산 전부 정복',
    descEn: 'Conquer all featured summits',
    descJa: '注目の名山をすべて制覇',
  },
] as const;

export type CollectionSummit = {
  id: string;
  name_ko: string;
  name_en: string | null;
  name_ja: string | null;
  elevation_m: number;
  conquered: boolean;
};

export type CollectionProgress = {
  def: CollectionDef;
  summits: CollectionSummit[];
  conquered: number;
  total: number;
  isComplete: boolean;
};

interface RawSummit {
  id: string;
  name_ko: string;
  name_en: string | null;
  name_ja: string | null;
  elevation_m: number;
  is_featured: boolean;
}

interface RawFlag {
  summit_id: string;
}

function filterForCollection(summits: RawSummit[], id: CollectionId): RawSummit[] {
  const byElevDesc = (a: RawSummit, b: RawSummit) => b.elevation_m - a.elevation_m;
  switch (id) {
    case 'starter':
      return summits.filter((s) => s.elevation_m < 500).sort(byElevDesc).slice(0, 30);
    case 'mid_range':
      return summits.filter((s) => s.elevation_m >= 500 && s.elevation_m < 1000).sort(byElevDesc);
    case 'high_peaks':
      return summits.filter((s) => s.elevation_m >= 1000 && s.elevation_m < 1500).sort(byElevDesc);
    case 'elite':
      return summits.filter((s) => s.elevation_m >= 1500).sort(byElevDesc);
    case 'featured':
      return summits.filter((s) => s.is_featured).sort(byElevDesc);
  }
}

export async function fetchAllCollectionProgress(userId: string): Promise<CollectionProgress[]> {
  const [summitsRes, flagsRes] = await Promise.all([
    supabase.from('summits').select('id, name_ko, name_en, name_ja, elevation_m, is_featured'),
    supabase.from('flags').select('summit_id').eq('user_id', userId).eq('is_active', true),
  ]);
  if (summitsRes.error) throw summitsRes.error;
  if (flagsRes.error) throw flagsRes.error;

  const allSummits = (summitsRes.data ?? []) as RawSummit[];
  const conqueredIds = new Set((flagsRes.data ?? []).map((f: RawFlag) => f.summit_id));

  return COLLECTIONS.map((def) => {
    const filtered = filterForCollection(allSummits, def.id);
    const withStatus: CollectionSummit[] = filtered.map((s) => ({
      id: s.id,
      name_ko: s.name_ko,
      name_en: s.name_en,
      name_ja: s.name_ja,
      elevation_m: s.elevation_m,
      conquered: conqueredIds.has(s.id),
    }));
    const conqueredCount = withStatus.filter((s) => s.conquered).length;
    return {
      def,
      summits: withStatus,
      conquered: conqueredCount,
      total: withStatus.length,
      isComplete: conqueredCount === withStatus.length && withStatus.length > 0,
    };
  });
}
