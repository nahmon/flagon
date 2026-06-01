import { supabase } from './supabase';

export interface YearReviewData {
  year: number;
  totalFlags: number;
  uniqueSummits: number;
  totalElevationM: number;
  highestPeak: { name_ko: string; name_en: string | null; name_ja: string | null; elevation_m: number } | null;
  bestMonth: { month: number; count: number } | null;
  topCrewName: string | null;
  topCrewNameKo: string | null;
  totalHikes: number;
  firstFlagDate: string | null;
  firstFlagSummitKo: string | null;
}

interface RawFlag {
  id: string;
  planted_at: string;
  summits: { name_ko: string; name_en: string | null; name_ja: string | null; elevation_m: number } | null;
  crews: { name: string; name_ko: string | null } | null;
}

interface RawHike {
  id: string;
}

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export async function fetchYearReview(userId: string, year?: number): Promise<YearReviewData> {
  const y = year ?? new Date().getFullYear();
  const start = `${y}-01-01T00:00:00.000Z`;
  const end = `${y + 1}-01-01T00:00:00.000Z`;

  const [flagsRes, hikesRes] = await Promise.all([
    supabase
      .from('flags')
      .select('id, planted_at, summits(name_ko, name_en, name_ja, elevation_m), crews(name, name_ko)')
      .eq('user_id', userId)
      .gte('planted_at', start)
      .lt('planted_at', end)
      .order('planted_at', { ascending: true }),
    supabase
      .from('hikes')
      .select('id')
      .eq('user_id', userId)
      .gte('started_at', start)
      .lt('started_at', end),
  ]);

  const flags = (flagsRes.data ?? []) as unknown as RawFlag[];
  const hikes = (hikesRes.data ?? []) as unknown as RawHike[];

  if (flags.length === 0) {
    return {
      year: y,
      totalFlags: 0,
      uniqueSummits: 0,
      totalElevationM: 0,
      highestPeak: null,
      bestMonth: null,
      topCrewName: null,
      topCrewNameKo: null,
      totalHikes: hikes.length,
      firstFlagDate: null,
      firstFlagSummitKo: null,
    };
  }

  // Unique summits
  const summitIds = new Set(flags.map((f) => f.summits?.name_ko ?? f.id));
  const uniqueSummits = summitIds.size;

  // Total elevation
  const totalElevationM = flags.reduce((sum, f) => sum + (f.summits?.elevation_m ?? 0), 0);

  // Highest peak
  let highestPeak: YearReviewData['highestPeak'] = null;
  for (const f of flags) {
    if (f.summits && (!highestPeak || f.summits.elevation_m > highestPeak.elevation_m)) {
      highestPeak = f.summits;
    }
  }

  // Best month
  const monthCounts: Record<number, number> = {};
  for (const month of MONTHS) monthCounts[month] = 0;
  for (const f of flags) {
    const m = new Date(f.planted_at).getMonth() + 1;
    monthCounts[m] = (monthCounts[m] ?? 0) + 1;
  }
  let bestMonth: YearReviewData['bestMonth'] = null;
  for (const [mStr, count] of Object.entries(monthCounts)) {
    if (count > 0 && (!bestMonth || count > bestMonth.count)) {
      bestMonth = { month: parseInt(mStr, 10), count };
    }
  }

  // Top crew
  const crewCounts: Record<string, { name: string; nameKo: string | null; count: number }> = {};
  for (const f of flags) {
    if (f.crews) {
      const key = f.crews.name;
      if (!crewCounts[key]) crewCounts[key] = { name: f.crews.name, nameKo: f.crews.name_ko, count: 0 };
      crewCounts[key].count++;
    }
  }
  let topCrew: { name: string; nameKo: string | null } | null = null;
  let topCrewCount = 0;
  for (const c of Object.values(crewCounts)) {
    if (c.count > topCrewCount) {
      topCrewCount = c.count;
      topCrew = c;
    }
  }

  // First flag
  const firstFlag = flags[0];

  return {
    year: y,
    totalFlags: flags.length,
    uniqueSummits,
    totalElevationM,
    highestPeak,
    bestMonth,
    topCrewName: topCrew?.name ?? null,
    topCrewNameKo: topCrew?.nameKo ?? null,
    totalHikes: hikes.length,
    firstFlagDate: firstFlag?.planted_at ?? null,
    firstFlagSummitKo: firstFlag?.summits?.name_ko ?? null,
  };
}
