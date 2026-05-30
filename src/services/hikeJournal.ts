import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PREFIX = 'hike_journal_v1_';

export const MOODS = ['🤩', '😊', '😅', '😤', '🥵'] as const;
export type Mood = typeof MOODS[number];

export interface HikeJournal {
  hikeId: string;
  mood: Mood;
  rating: number; // 1–5
  notes: string;
  savedAt: string;
}

export async function loadJournal(hikeId: string): Promise<HikeJournal | null> {
  const raw = await AsyncStorage.getItem(KEY_PREFIX + hikeId);
  if (!raw) return null;
  try { return JSON.parse(raw) as HikeJournal; } catch { return null; }
}

export async function saveJournal(entry: Omit<HikeJournal, 'savedAt'>): Promise<void> {
  const journal: HikeJournal = { ...entry, savedAt: new Date().toISOString() };
  await AsyncStorage.setItem(KEY_PREFIX + entry.hikeId, JSON.stringify(journal));
}

export async function deleteJournal(hikeId: string): Promise<void> {
  await AsyncStorage.removeItem(KEY_PREFIX + hikeId);
}

export async function loadAllJournals(hikeIds: string[]): Promise<Record<string, HikeJournal>> {
  const pairs = await AsyncStorage.multiGet(hikeIds.map((id) => KEY_PREFIX + id));
  const result: Record<string, HikeJournal> = {};
  for (const [key, value] of pairs) {
    if (!value) continue;
    try {
      const journal = JSON.parse(value) as HikeJournal;
      result[journal.hikeId] = journal;
    } catch { /* skip corrupt entry */ }
  }
  return result;
}
