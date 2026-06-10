import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'hike_pace_v1';
const MAX_SAVED = 10;

export type FitnessLevel = 'beginner' | 'intermediate' | 'expert';

export const FITNESS_META: Record<FitnessLevel, { labelKey: string; factor: number }> = {
  beginner:     { labelKey: 'paceFitBeginner',     factor: 1.35 },
  intermediate: { labelKey: 'paceFitIntermediate', factor: 1.0  },
  expert:       { labelKey: 'paceFitExpert',       factor: 0.75 },
};

export const FITNESS_LEVELS: FitnessLevel[] = ['beginner', 'intermediate', 'expert'];

export interface PaceResult {
  totalMinutes: number;
  hours: number;
  minutes: number;
  splitEvery100m: number; // minutes per 100 m elevation gain
  distanceMinutes: number;
  elevationMinutes: number;
}

export interface SavedPace {
  id: string;
  label: string;
  distanceKm: number;
  elevationM: number;
  fitness: FitnessLevel;
  totalMinutes: number;
  savedAt: string;
}

/** Naismith's Rule: 1h per 5km + 1h per 300m gain, scaled by fitness factor */
export function calcPace(
  distanceKm: number,
  elevationM: number,
  fitness: FitnessLevel,
): PaceResult {
  const factor = FITNESS_META[fitness].factor;
  const distanceMins = (distanceKm / 5) * 60 * factor;
  const elevationMins = (elevationM / 300) * 60 * factor;
  const totalMinutes = Math.round(distanceMins + elevationMins);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const splitEvery100m = elevationM > 0
    ? Math.round((elevationMins / (elevationM / 100)))
    : 0;
  return {
    totalMinutes,
    hours,
    minutes,
    splitEvery100m,
    distanceMinutes: Math.round(distanceMins),
    elevationMinutes: Math.round(elevationMins),
  };
}

async function load(): Promise<SavedPace[]> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as SavedPace[]) : [];
}

async function persist(entries: SavedPace[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(entries.slice(0, MAX_SAVED)));
}

export async function getSavedPaces(): Promise<SavedPace[]> {
  const entries = await load();
  return entries.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export async function savePace(entry: Omit<SavedPace, 'id' | 'savedAt'>): Promise<void> {
  const entries = await load();
  entries.unshift({ ...entry, id: Date.now().toString(), savedAt: new Date().toISOString() });
  await persist(entries);
}

export async function deletePace(id: string): Promise<void> {
  const entries = await load();
  await persist(entries.filter((e) => e.id !== id));
}
