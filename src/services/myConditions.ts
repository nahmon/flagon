import { supabase } from './supabase';
import type { Lang } from '../i18n/strings';

export interface ConditionSummit {
  summitId: string;
  name_ko: string;
  name_en: string | null;
  name_ja: string | null;
  elevation_m: number;
}

export function conditionSummitName(cs: ConditionSummit, lang: Lang): string {
  if (lang === 'en' && cs.name_en) return cs.name_en;
  if (lang === 'ja' && cs.name_ja) return cs.name_ja;
  return cs.name_ko;
}

export async function fetchMySummitsForConditions(userId: string): Promise<ConditionSummit[]> {
  const { data, error } = await supabase
    .from('flags')
    .select('summit_id, summit:summits(name_ko, name_en, name_ja, elevation_m)')
    .eq('user_id', userId)
    .order('planted_at', { ascending: false });

  if (error || !data) return [];

  const seen = new Set<string>();
  const result: ConditionSummit[] = [];
  for (const row of data as Array<{
    summit_id: string;
    summit: { name_ko: string; name_en: string | null; name_ja: string | null; elevation_m: number } | null;
  }>) {
    if (!row.summit_id || seen.has(row.summit_id)) continue;
    seen.add(row.summit_id);
    result.push({
      summitId: row.summit_id,
      name_ko: row.summit?.name_ko ?? '',
      name_en: row.summit?.name_en ?? null,
      name_ja: row.summit?.name_ja ?? null,
      elevation_m: row.summit?.elevation_m ?? 0,
    });
  }
  return result;
}
