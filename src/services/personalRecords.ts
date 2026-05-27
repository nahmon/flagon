import { supabase } from './supabase';
import { Lang } from '../i18n/strings';

export interface PersonalRecords {
  totalConquests: number;
  totalElevationM: number;
  highestSummit: { name_ko: string; name_en: string | null; name_ja: string | null; elevation_m: number } | null;
  bestDayCount: number;
  bestDayDate: string | null;
  firstSummit: { name_ko: string; name_en: string | null; name_ja: string | null; planted_at: string } | null;
}

interface FlagRow {
  id: string;
  planted_at: string;
  summit: { name_ko: string; name_en: string | null; name_ja: string | null; elevation_m: number } | null;
}

export async function fetchPersonalRecords(userId: string): Promise<PersonalRecords> {
  const { data, error } = await supabase
    .from('flags')
    .select('id, planted_at, summit:summits(name_ko, name_en, name_ja, elevation_m)')
    .eq('user_id', userId)
    .order('planted_at', { ascending: true });

  if (error) throw error;

  const rows = (data ?? []) as unknown as FlagRow[];

  if (rows.length === 0) {
    return { totalConquests: 0, totalElevationM: 0, highestSummit: null, bestDayCount: 0, bestDayDate: null, firstSummit: null };
  }

  let totalElevationM = 0;
  let highestSummit: PersonalRecords['highestSummit'] = null;
  const dayCounts = new Map<string, number>();

  for (const row of rows) {
    const elev = row.summit?.elevation_m ?? 0;
    totalElevationM += elev;
    if (!highestSummit || elev > highestSummit.elevation_m) {
      highestSummit = row.summit
        ? { name_ko: row.summit.name_ko, name_en: row.summit.name_en, name_ja: row.summit.name_ja, elevation_m: elev }
        : null;
    }
    const day = row.planted_at.slice(0, 10);
    dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1);
  }

  let bestDayCount = 0;
  let bestDayDate: string | null = null;
  for (const [day, count] of dayCounts) {
    if (count > bestDayCount) { bestDayCount = count; bestDayDate = day; }
  }

  const first = rows[0];
  const firstSummit = first.summit
    ? { name_ko: first.summit.name_ko, name_en: first.summit.name_en, name_ja: first.summit.name_ja, planted_at: first.planted_at }
    : null;

  return { totalConquests: rows.length, totalElevationM, highestSummit, bestDayCount, bestDayDate, firstSummit };
}

export function prSummitName(
  summit: { name_ko: string; name_en: string | null; name_ja: string | null },
  lang: Lang,
): string {
  if (lang === 'en' && summit.name_en) return summit.name_en;
  if (lang === 'ja' && summit.name_ja) return summit.name_ja;
  return summit.name_ko;
}

export function formatPrDate(dateStr: string, lang: Lang): string {
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const mo = d.getMonth() + 1;
  const day = d.getDate();
  if (lang === 'en') return `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]} ${day}, ${y}`;
  if (lang === 'ja') return `${y}年${mo}月${day}日`;
  return `${y}년 ${mo}월 ${day}일`;
}
