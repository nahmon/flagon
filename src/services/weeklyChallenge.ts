import { supabase } from './supabase';
import { Summit } from '../types';

export interface WeeklyChallengeSummit {
  summit: Summit;
  completed: boolean;
}

export interface WeeklyChallenge {
  weekKey: string;
  summits: WeeklyChallengeSummit[];
  completedCount: number;
  bonusXp: number;
  allDone: boolean;
  daysLeft: number;
}

const WEEKLY_COUNT = 3;
const BONUS_XP = 500;

export function getWeekKey(): string {
  const now = new Date();
  const jan1 = new Date(now.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((now.getTime() - jan1.getTime()) / 86_400_000);
  const weekNum = Math.floor(dayOfYear / 7) + 1;
  return `${now.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function seededIndex(seed: string, max: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash * 31) + seed.charCodeAt(i)) >>> 0;
  }
  return hash % max;
}

function seededPick<T>(seed: string, arr: T[], count: number): T[] {
  const result: T[] = [];
  const indices = new Set<number>();
  let salt = 0;
  while (result.length < count && result.length < arr.length) {
    const idx = seededIndex(seed + String(salt++), arr.length);
    if (!indices.has(idx)) {
      indices.add(idx);
      result.push(arr[idx]);
    }
  }
  return result;
}

function mondayThisWeek(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() + diff);
  return monday;
}

function nextMondayMs(): number {
  const monday = mondayThisWeek();
  const nextMonday = new Date(monday);
  nextMonday.setDate(monday.getDate() + 7);
  return nextMonday.getTime() - Date.now();
}

export function daysLeftInWeek(): number {
  return Math.max(1, Math.ceil(nextMondayMs() / 86_400_000));
}

export async function fetchWeeklyChallenge(userId: string): Promise<WeeklyChallenge | null> {
  const weekKey = getWeekKey();

  const { data: summits, error: sErr } = await supabase
    .from('summits')
    .select('id, name_ko, name_en, name_ja, location, elevation_m, country, mountain_group, is_featured, created_at')
    .order('id');

  if (sErr || !summits || summits.length < WEEKLY_COUNT) return null;

  const picked = seededPick(weekKey, summits as Summit[], WEEKLY_COUNT);

  const mondayIso = mondayThisWeek().toISOString();
  const { data: flags, error: fErr } = await supabase
    .from('flags')
    .select('summit_id')
    .eq('user_id', userId)
    .gte('planted_at', mondayIso)
    .in('summit_id', picked.map((s) => s.id));

  if (fErr) return null;

  const completedIds = new Set((flags ?? []).map((f: { summit_id: string }) => f.summit_id));

  const weeklySummits: WeeklyChallengeSummit[] = picked.map((summit) => ({
    summit,
    completed: completedIds.has(summit.id),
  }));

  const completedCount = weeklySummits.filter((ws) => ws.completed).length;

  return {
    weekKey,
    summits: weeklySummits,
    completedCount,
    bonusXp: BONUS_XP,
    allDone: completedCount === WEEKLY_COUNT,
    daysLeft: daysLeftInWeek(),
  };
}
