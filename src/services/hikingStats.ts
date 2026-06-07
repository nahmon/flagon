import { supabase } from './supabase';

export interface DayOfWeekStat {
  day: string;
  count: number;
}

export interface MonthStat {
  month: string;
  count: number;
}

export interface ElevTierStat {
  label: string;
  count: number;
  color: string;
}

export interface HikingStatsDashboard {
  totalFlags: number;
  totalElevationM: number;
  uniqueSummits: number;
  avgFlagsPerWeek: number;
  bestDayCount: number;
  bestDayDate: string | null;
  dayOfWeekStats: DayOfWeekStat[];
  monthStats: MonthStat[];
  elevTierStats: ElevTierStat[];
  mostActiveSeason: string | null;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const ELEV_TIERS = [
  { label: '<500m',    min: 0,    max: 500,  color: '#74C69D' },
  { label: '500-999m', min: 500,  max: 1000, color: '#2D6A4F' },
  { label: '1-1.9km',  min: 1000, max: 2000, color: '#FC4C02' },
  { label: '2km+',     min: 2000, max: Infinity, color: '#9D0208' },
];

interface RawFlag {
  planted_at: string;
  summits: { id: string; elevation_m: number } | null;
}

export async function fetchHikingStats(userId: string): Promise<HikingStatsDashboard> {
  const { data, error } = await supabase
    .from('flags')
    .select('planted_at, summits(id, elevation_m)')
    .eq('user_id', userId)
    .order('planted_at', { ascending: true });

  if (error) throw error;
  const rows = ((data ?? []) as unknown) as RawFlag[];

  if (rows.length === 0) {
    return {
      totalFlags: 0, totalElevationM: 0, uniqueSummits: 0,
      avgFlagsPerWeek: 0, bestDayCount: 0, bestDayDate: null,
      dayOfWeekStats: DAY_LABELS.map(d => ({ day: d, count: 0 })),
      monthStats: MONTH_LABELS.map(m => ({ month: m, count: 0 })),
      elevTierStats: ELEV_TIERS.map(t => ({ label: t.label, count: 0, color: t.color })),
      mostActiveSeason: null,
    };
  }

  let totalElevationM = 0;
  const uniqueSummitIds = new Set<string>();
  const dayCounts = new Map<string, number>();
  const dowCounts = new Array(7).fill(0);
  const monthCounts = new Array(12).fill(0);
  const tierCounts = new Array(ELEV_TIERS.length).fill(0);
  const seasonCounts: Record<string, number> = { Spring: 0, Summer: 0, Autumn: 0, Winter: 0 };

  for (const row of rows) {
    const elev = row.summits?.elevation_m ?? 0;
    totalElevationM += elev;
    if (row.summits?.id) uniqueSummitIds.add(row.summits.id);

    const d = new Date(row.planted_at);
    const dayKey = row.planted_at.slice(0, 10);
    dayCounts.set(dayKey, (dayCounts.get(dayKey) ?? 0) + 1);
    dowCounts[d.getDay()]++;
    monthCounts[d.getMonth()]++;

    const tierIdx = ELEV_TIERS.findIndex(t => elev >= t.min && elev < t.max);
    if (tierIdx >= 0) tierCounts[tierIdx]++;

    const mo = d.getMonth();
    if (mo >= 2 && mo <= 4) seasonCounts.Spring++;
    else if (mo >= 5 && mo <= 7) seasonCounts.Summer++;
    else if (mo >= 8 && mo <= 10) seasonCounts.Autumn++;
    else seasonCounts.Winter++;
  }

  const firstDate = new Date(rows[0].planted_at);
  const lastDate = new Date(rows[rows.length - 1].planted_at);
  const weeksSpan = Math.max(1, (lastDate.getTime() - firstDate.getTime()) / (7 * 86400000));

  let bestDayCount = 0;
  let bestDayDate: string | null = null;
  for (const [day, cnt] of dayCounts) {
    if (cnt > bestDayCount) { bestDayCount = cnt; bestDayDate = day; }
  }

  const mostActiveSeason = Object.entries(seasonCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return {
    totalFlags: rows.length,
    totalElevationM,
    uniqueSummits: uniqueSummitIds.size,
    avgFlagsPerWeek: parseFloat((rows.length / weeksSpan).toFixed(1)),
    bestDayCount,
    bestDayDate,
    dayOfWeekStats: DAY_LABELS.map((day, i) => ({ day, count: dowCounts[i] })),
    monthStats: MONTH_LABELS.map((month, i) => ({ month, count: monthCounts[i] })),
    elevTierStats: ELEV_TIERS.map((t, i) => ({ label: t.label, count: tierCounts[i], color: t.color })),
    mostActiveSeason,
  };
}
