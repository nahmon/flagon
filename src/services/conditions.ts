import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = (summitId: string) => `summit_conditions_v1_${summitId}`;
const MAX_REPORTS = 30;
const EXPIRY_MS = 48 * 60 * 60 * 1000; // 48 hours
export const MAX_NOTE_CHARS = 80;

export type ConditionType = 'clear' | 'muddy' | 'snowy' | 'icy' | 'dangerous';

export const CONDITION_META: Record<ConditionType, { icon: string; labelKey: string }> = {
  clear:     { icon: '☀️', labelKey: 'condClear' },
  muddy:     { icon: '🌧️', labelKey: 'condMuddy' },
  snowy:     { icon: '❄️', labelKey: 'condSnowy' },
  icy:       { icon: '🧊', labelKey: 'condIcy' },
  dangerous: { icon: '⚠️', labelKey: 'condDangerous' },
};

export const CONDITION_TYPES: ConditionType[] = ['clear', 'muddy', 'snowy', 'icy', 'dangerous'];

export interface ConditionReport {
  id: string;
  summitId: string;
  type: ConditionType;
  note: string;
  userName: string;
  userId: string;
  reportedAt: string;
}

export async function loadConditions(summitId: string): Promise<ConditionReport[]> {
  const raw = await AsyncStorage.getItem(KEY(summitId));
  if (!raw) return [];
  try {
    const all = JSON.parse(raw) as ConditionReport[];
    const cutoff = Date.now() - EXPIRY_MS;
    return all.filter(r => new Date(r.reportedAt).getTime() > cutoff);
  } catch {
    return [];
  }
}

export async function addCondition(
  summitId: string,
  type: ConditionType,
  note: string,
  userId: string,
  userName: string,
): Promise<ConditionReport> {
  const existing = await loadConditions(summitId);
  const report: ConditionReport = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    summitId,
    type,
    note: note.trim().slice(0, MAX_NOTE_CHARS),
    userId,
    userName,
    reportedAt: new Date().toISOString(),
  };
  const updated = [report, ...existing].slice(0, MAX_REPORTS);
  await AsyncStorage.setItem(KEY(summitId), JSON.stringify(updated));
  return report;
}

export async function deleteCondition(summitId: string, reportId: string): Promise<void> {
  const existing = await loadConditions(summitId);
  await AsyncStorage.setItem(KEY(summitId), JSON.stringify(existing.filter(r => r.id !== reportId)));
}

/** Returns the most common condition type in recent reports, or null if none */
export function dominantCondition(reports: ConditionReport[]): ConditionType | null {
  if (reports.length === 0) return null;
  const counts: Partial<Record<ConditionType, number>> = {};
  for (const r of reports) counts[r.type] = (counts[r.type] ?? 0) + 1;
  let best: ConditionType | null = null;
  let bestCount = 0;
  for (const [type, count] of Object.entries(counts) as [ConditionType, number][]) {
    if (count > bestCount) { best = type; bestCount = count; }
  }
  return best;
}
