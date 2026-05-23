import { supabase } from './supabase';
import { Lang } from '../i18n/strings';

export interface ConquestEntry {
  id: string;
  planted_at: string;
  summit_name_ko: string;
  summit_name_en: string | null;
  summit_name_ja: string | null;
  elevation_m: number;
  mountain_group: string | null;
  crew_name: string | null;
  crew_color: string | null;
}

export interface MonthGroup {
  key: string;
  year: number;
  month: number;
  count: number;
  entries: ConquestEntry[];
}

export async function fetchUserConquests(userId: string): Promise<ConquestEntry[]> {
  const { data, error } = await supabase
    .from('flags')
    .select('id, planted_at, summit:summits(name_ko, name_en, name_ja, elevation_m, mountain_group), crew:crews(name_ko, color_hex)')
    .eq('user_id', userId)
    .order('planted_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: row.id,
    planted_at: row.planted_at,
    summit_name_ko: row.summit?.name_ko ?? '알 수 없음',
    summit_name_en: row.summit?.name_en ?? null,
    summit_name_ja: row.summit?.name_ja ?? null,
    elevation_m: row.summit?.elevation_m ?? 0,
    mountain_group: row.summit?.mountain_group ?? null,
    crew_name: row.crew?.name_ko ?? null,
    crew_color: row.crew?.color_hex ?? null,
  }));
}

export function groupByMonth(entries: ConquestEntry[]): MonthGroup[] {
  const map = new Map<string, MonthGroup>();
  for (const entry of entries) {
    const d = new Date(entry.planted_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const existing = map.get(key);
    if (existing) {
      existing.entries.push(entry);
      existing.count++;
    } else {
      map.set(key, {
        key,
        year: d.getFullYear(),
        month: d.getMonth(),
        count: 1,
        entries: [entry],
      });
    }
  }
  return Array.from(map.values());
}

const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function monthLabel(year: number, month: number, lang: Lang): string {
  if (lang === 'en') return `${MONTHS_EN[month]} ${year}`;
  if (lang === 'ja') return `${year}年${month + 1}月`;
  return `${year}년 ${month + 1}월`;
}

export function conquestSummitName(entry: ConquestEntry, lang: Lang): string {
  if (lang === 'en' && entry.summit_name_en) return entry.summit_name_en;
  if (lang === 'ja' && entry.summit_name_ja) return entry.summit_name_ja;
  return entry.summit_name_ko;
}
