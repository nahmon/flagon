import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { fetchHotSummits, HotSummit } from './summits';

const CACHE_KEY = '@flagon/summit_of_day_v1';

export interface SummitOfDayData {
  summit: HotSummit;
  weeklyFlags: number;
  dateKey: string;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function pickByDate(summits: HotSummit[], dateKey: string): HotSummit {
  // Deterministic daily rotation — hash date string to stable index
  let hash = 0;
  for (let i = 0; i < dateKey.length; i++) {
    hash = ((hash * 31) + dateKey.charCodeAt(i)) >>> 0;
  }
  return summits[hash % summits.length];
}

export async function fetchSummitOfDay(): Promise<SummitOfDayData> {
  const dateKey = todayKey();

  try {
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached) as SummitOfDayData;
      if (parsed.dateKey === dateKey) return parsed;
    }
  } catch { /* ignore */ }

  const summits = await fetchHotSummits(50);
  if (summits.length === 0) throw new Error('no_summits');

  const summit = pickByDate(summits, dateKey);

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const { count } = await supabase
    .from('flags')
    .select('id', { count: 'exact', head: true })
    .eq('summit_id', summit.id)
    .gte('planted_at', weekAgo.toISOString());

  const result: SummitOfDayData = { summit, weeklyFlags: count ?? 0, dateKey };
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(result));
  return result;
}
