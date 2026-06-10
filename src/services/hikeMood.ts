import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'hike_mood_v1';
const MAX_ENTRIES = 200;

export const MOOD_EMOJI = ['😔', '😐', '🙂', '😊', '🤩'] as const;
export type MoodLevel = 1 | 2 | 3 | 4 | 5;

export interface MoodEntry {
  id: string;
  summitName: string;
  date: string; // ISO
  before: MoodLevel;
  after: MoodLevel;
  note: string;
}

export interface MoodStats {
  totalEntries: number;
  avgBefore: number;
  avgAfter: number;
  avgLift: number;
  bestSummit: { name: string; avgLift: number } | null;
}

async function load(): Promise<MoodEntry[]> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as MoodEntry[]) : [];
}

async function persist(entries: MoodEntry[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
}

export async function getMoodEntries(): Promise<MoodEntry[]> {
  const entries = await load();
  return entries.sort((a, b) => b.date.localeCompare(a.date));
}

export async function addMoodEntry(entry: Omit<MoodEntry, 'id'>): Promise<void> {
  const entries = await load();
  entries.unshift({ ...entry, id: Date.now().toString() });
  await persist(entries);
}

export async function deleteMoodEntry(id: string): Promise<void> {
  const entries = await load();
  await persist(entries.filter((e) => e.id !== id));
}

export async function getMoodStats(): Promise<MoodStats> {
  const entries = await load();
  if (!entries.length) {
    return { totalEntries: 0, avgBefore: 0, avgAfter: 0, avgLift: 0, bestSummit: null };
  }

  const avgBefore = entries.reduce((acc, e) => acc + e.before, 0) / entries.length;
  const avgAfter = entries.reduce((acc, e) => acc + e.after, 0) / entries.length;

  const byName: Record<string, { total: number; count: number }> = {};
  for (const e of entries) {
    if (!byName[e.summitName]) byName[e.summitName] = { total: 0, count: 0 };
    byName[e.summitName].total += e.after - e.before;
    byName[e.summitName].count += 1;
  }

  let bestSummit: { name: string; avgLift: number } | null = null;
  for (const [name, { total, count }] of Object.entries(byName)) {
    const avg = total / count;
    if (!bestSummit || avg > bestSummit.avgLift) {
      bestSummit = { name, avgLift: Math.round(avg * 10) / 10 };
    }
  }

  return {
    totalEntries: entries.length,
    avgBefore: Math.round(avgBefore * 10) / 10,
    avgAfter: Math.round(avgAfter * 10) / 10,
    avgLift: Math.round((avgAfter - avgBefore) * 10) / 10,
    bestSummit,
  };
}
