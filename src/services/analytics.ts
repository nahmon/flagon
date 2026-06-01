import { ConquestEntry } from './conquests';

export interface MonthlyBar {
  label: string; // e.g. "Jan" / "1월"
  count: number;
  year: number;
  month: number; // 0-indexed
}

export interface ElevBand {
  label: string;
  count: number;
  color: string;
}

export interface AnalyticsSummary {
  monthly: MonthlyBar[];       // last 6 months, oldest first
  bestMonth: MonthlyBar | null;
  avgElevation: number;
  dayOfWeekCounts: number[];   // length 7, index 0=Sun
  elevBands: ElevBand[];
  totalFlags: number;
}

const BAND_COLORS = ['#A8D5A2', '#4A7C59', '#2D6A4F', '#1A3D2B'];
const BAND_THRESHOLDS = [500, 1000, 2000, Infinity];
const BAND_LABELS_KO = ['~500m', '500–1000m', '1000–2000m', '2000m+'];
const BAND_LABELS_EN = ['<500m', '500–1000m', '1000–2000m', '2000m+'];
const BAND_LABELS_JA = ['~500m', '500–1000m', '1000–2000m', '2000m+'];

function monthLabel(year: number, month: number, lang: string): string {
  const date = new Date(year, month, 1);
  if (lang === 'en') return date.toLocaleString('en-US', { month: 'short' });
  if (lang === 'ja') return `${month + 1}月`;
  return `${month + 1}월`;
}

export function buildAnalytics(
  conquests: ConquestEntry[],
  lang: string,
): AnalyticsSummary {
  const totalFlags = conquests.length;
  const avgElevation =
    totalFlags === 0
      ? 0
      : Math.round(conquests.reduce((s, c) => s + c.elevation_m, 0) / totalFlags);

  // Last 6 months
  const now = new Date();
  const monthly: MonthlyBar[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthly.push({ label: monthLabel(d.getFullYear(), d.getMonth(), lang), count: 0, year: d.getFullYear(), month: d.getMonth() });
  }
  for (const c of conquests) {
    const d = new Date(c.planted_at);
    const y = d.getFullYear();
    const m = d.getMonth();
    const bar = monthly.find((b) => b.year === y && b.month === m);
    if (bar) bar.count++;
  }
  const bestMonth = monthly.reduce<MonthlyBar | null>(
    (best, b) => (best === null || b.count > best.count ? b : best),
    null,
  );

  // Day of week
  const dayOfWeekCounts = [0, 0, 0, 0, 0, 0, 0];
  for (const c of conquests) {
    dayOfWeekCounts[new Date(c.planted_at).getDay()]++;
  }

  // Elevation bands
  const bandLabels = lang === 'en' ? BAND_LABELS_EN : lang === 'ja' ? BAND_LABELS_JA : BAND_LABELS_KO;
  const bandCounts = [0, 0, 0, 0];
  for (const c of conquests) {
    for (let i = 0; i < BAND_THRESHOLDS.length; i++) {
      if (c.elevation_m < BAND_THRESHOLDS[i]) {
        bandCounts[i]++;
        break;
      }
    }
  }
  const elevBands: ElevBand[] = bandLabels.map((label, i) => ({
    label,
    count: bandCounts[i],
    color: BAND_COLORS[i],
  }));

  return { monthly, bestMonth, avgElevation, dayOfWeekCounts, elevBands, totalFlags };
}
