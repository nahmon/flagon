import AsyncStorage from '@react-native-async-storage/async-storage';
import { ConquestEntry } from './conquests';

const GOAL_KEY = '@flagon/weekly_elevation_goal_m';

export const GOAL_OPTIONS = [500, 1000, 2000, 3000] as const;
export type GoalOption = typeof GOAL_OPTIONS[number];

export const DEFAULT_GOAL: GoalOption = 1000;

function isoWeekStart(d: Date): Date {
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export async function getElevationGoal(): Promise<GoalOption> {
  const raw = await AsyncStorage.getItem(GOAL_KEY);
  const parsed = raw ? Number(raw) : null;
  return (GOAL_OPTIONS as readonly number[]).includes(parsed ?? -1)
    ? (parsed as GoalOption)
    : DEFAULT_GOAL;
}

export async function setElevationGoal(m: GoalOption): Promise<void> {
  await AsyncStorage.setItem(GOAL_KEY, String(m));
}

export interface WeekProgress {
  totalElevationM: number;
  goalM: GoalOption;
  fraction: number;
  summits: Array<{ name: string; elevationM: number; date: string }>;
}

export function computeWeekProgress(
  conquests: ConquestEntry[],
  goalM: GoalOption,
): WeekProgress {
  const now = new Date();
  const weekStart = isoWeekStart(now);

  const thisWeek = conquests.filter(c => new Date(c.planted_at) >= weekStart);

  const totalElevationM = thisWeek.reduce((sum, c) => sum + c.elevation_m, 0);

  const summits = thisWeek.map(c => ({
    name: c.summit_name_ko,
    elevationM: c.elevation_m,
    date: c.planted_at,
  }));

  return {
    totalElevationM,
    goalM,
    fraction: Math.min(1, goalM > 0 ? totalElevationM / goalM : 0),
    summits,
  };
}
