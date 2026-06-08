import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { addToWishList } from './wishlist';

const STORE_KEY = 'summit_roulette_v1';
const SPINS_PER_WEEK = 3;

export interface RouletteState {
  weekKey: string;
  spinsLeft: number;
  accepted: RouletteChallenge | null;
}

export interface RouletteChallenge {
  id: string;
  name_ko: string;
  name_en: string | null;
  name_ja: string | null;
  elevation_m: number;
  mountain_group: string | null;
  country: string;
  community_flags: number;
}

function currentWeekKey(): string {
  const d = new Date();
  const day = d.getUTCDay() === 0 ? 7 : d.getUTCDay();
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - (day - 1));
  return monday.toISOString().slice(0, 10);
}

export async function loadRouletteState(): Promise<RouletteState> {
  try {
    const raw = await AsyncStorage.getItem(STORE_KEY);
    if (raw) {
      const s = JSON.parse(raw) as RouletteState;
      if (s.weekKey === currentWeekKey()) return s;
    }
  } catch {}
  return { weekKey: currentWeekKey(), spinsLeft: SPINS_PER_WEEK, accepted: null };
}

async function saveState(s: RouletteState): Promise<void> {
  await AsyncStorage.setItem(STORE_KEY, JSON.stringify(s));
}

export async function spinRoulette(): Promise<{ challenge: RouletteChallenge; state: RouletteState } | null> {
  const state = await loadRouletteState();
  if (state.spinsLeft <= 0) return null;

  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id ?? null;

  // Fetch popular summits
  const { data: topSummits, error } = await supabase
    .from('summits')
    .select('id, name_ko, name_en, name_ja, elevation_m, mountain_group, country')
    .order('elevation_m', { ascending: false })
    .limit(200);

  if (error || !topSummits || topSummits.length === 0) return null;

  // Fetch user's already-flagged summits to exclude them
  let flaggedIds = new Set<string>();
  if (userId) {
    const { data: flags } = await supabase
      .from('flags')
      .select('summit_id')
      .eq('user_id', userId)
      .eq('is_active', true);
    if (flags) flaggedIds = new Set(flags.map((f: { summit_id: string }) => f.summit_id));
  }

  // Fetch community flag counts
  const { data: counts } = await supabase
    .from('flags')
    .select('summit_id')
    .in('summit_id', topSummits.map((s: { id: string }) => s.id));
  const countMap = new Map<string, number>();
  for (const row of (counts ?? []) as { summit_id: string }[]) {
    countMap.set(row.summit_id, (countMap.get(row.summit_id) ?? 0) + 1);
  }

  type SummitRow = { id: string; name_ko: string; name_en: string | null; name_ja: string | null; elevation_m: number; mountain_group: string | null; country: string };
  const candidates = (topSummits as SummitRow[]).filter((s) => !flaggedIds.has(s.id));
  if (candidates.length === 0) return null;

  const pick = candidates[Math.floor(Math.random() * Math.min(candidates.length, 80))];
  const challenge: RouletteChallenge = {
    id: pick.id,
    name_ko: pick.name_ko,
    name_en: pick.name_en,
    name_ja: pick.name_ja,
    elevation_m: pick.elevation_m,
    mountain_group: pick.mountain_group,
    country: pick.country,
    community_flags: countMap.get(pick.id) ?? 0,
  };

  const newState: RouletteState = {
    ...state,
    spinsLeft: state.spinsLeft - 1,
  };
  await saveState(newState);
  return { challenge, state: newState };
}

export async function acceptChallenge(challenge: RouletteChallenge): Promise<void> {
  await addToWishList({
    id: challenge.id,
    name_ko: challenge.name_ko,
    name_en: challenge.name_en,
    name_ja: challenge.name_ja,
    elevation_m: challenge.elevation_m,
    mountain_group: challenge.mountain_group,
  });
  const state = await loadRouletteState();
  const newState: RouletteState = { ...state, accepted: challenge };
  await saveState(newState);
}
