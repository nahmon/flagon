import { supabase } from './supabase';

export interface StreakInfo {
  current: number;
  best: number;
  thisWeekHiked: boolean;
  /** ISO week keys (YYYY-Www) for last 8 weeks, oldest first */
  last8Weeks: { key: string; hiked: boolean }[];
}

function getWeekKey(date: Date): string {
  // Returns YYYY-Www using ISO week (Monday-based)
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() === 0 ? 7 : d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function weekKeyFor(weeksAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - weeksAgo * 7);
  return getWeekKey(d);
}

export async function fetchStreak(userId: string): Promise<StreakInfo> {
  const { data, error } = await supabase
    .from('hikes')
    .select('started_at, summit_verified_at, flag_planted')
    .eq('user_id', userId)
    .not('started_at', 'is', null)
    .order('started_at', { ascending: false });

  if (error) throw error;

  type HikeRow = { started_at: string | null; summit_verified_at: string | null; flag_planted: boolean };
  const rows = (data ?? []) as HikeRow[];

  // Build set of week keys that had a successful summit
  const hikedWeeks = new Set<string>();
  for (const row of rows) {
    if (!row.flag_planted && !row.summit_verified_at) continue;
    const ts = row.summit_verified_at ?? row.started_at;
    if (!ts) continue;
    hikedWeeks.add(getWeekKey(new Date(ts)));
  }

  // Calculate current streak (going back week by week from current)
  let current = 0;
  let weekOffset = 0;
  while (true) {
    const key = weekKeyFor(weekOffset);
    if (hikedWeeks.has(key)) {
      current++;
      weekOffset++;
    } else if (weekOffset === 0) {
      // Current week not yet hiked — streak still alive, just 0 for current
      weekOffset++;
    } else {
      break;
    }
  }

  // Calculate best streak over all weeks
  const allKeys = Array.from(hikedWeeks).sort();
  let best = 0;
  let run = 0;
  let prevKey = '';
  for (const key of allKeys) {
    if (!prevKey) { run = 1; }
    else {
      // Check if consecutive week
      const prev = new Date(prevKey.replace('W', '') + 'W1');
      const curr = new Date(key.replace('W', '') + 'W1');
      const diffWeeks = Math.round((curr.getTime() - prev.getTime()) / (7 * 86400000));
      run = diffWeeks === 1 ? run + 1 : 1;
    }
    best = Math.max(best, run);
    prevKey = key;
  }

  const last8Weeks = Array.from({ length: 8 }, (_, i) => {
    const key = weekKeyFor(7 - i);
    return { key, hiked: hikedWeeks.has(key) };
  });

  const thisWeekHiked = hikedWeeks.has(weekKeyFor(0));

  return { current, best, thisWeekHiked, last8Weeks };
}

export interface StreakLeaderboardEntry {
  user_id: string;
  display_name: string | null;
  crew_name: string | null;
  crew_color: string | null;
  current_streak: number;
  best_streak: number;
}

export async function fetchStreakLeaderboard(limit = 20): Promise<StreakLeaderboardEntry[]> {
  // Fetch flags from last 26 weeks for all users
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 26 * 7);

  const { data: flagRows, error } = await supabase
    .from('flags')
    .select('user_id, planted_at, users(display_name), crews(name_ko, color_hex)')
    .gte('planted_at', cutoff.toISOString())
    .order('planted_at', { ascending: false });

  if (error) throw error;

  type FlagRow = {
    user_id: string;
    planted_at: string;
    users: { display_name: string | null } | null;
    crews: { name_ko: string | null; color_hex: string | null } | null;
  };
  const rows = ((flagRows ?? []) as unknown) as FlagRow[];

  // Group planted weeks per user
  const userMeta: Map<string, { display_name: string | null; crew_name: string | null; crew_color: string | null; weeks: Set<string> }> = new Map();
  for (const row of rows) {
    const uid = row.user_id;
    if (!userMeta.has(uid)) {
      userMeta.set(uid, {
        display_name: row.users?.display_name ?? null,
        crew_name: row.crews?.name_ko ?? null,
        crew_color: row.crews?.color_hex ?? null,
        weeks: new Set(),
      });
    }
    userMeta.get(uid)!.weeks.add(getWeekKey(new Date(row.planted_at)));
  }

  // Compute streaks per user
  const results: StreakLeaderboardEntry[] = [];
  for (const [uid, meta] of userMeta) {
    const sortedWeeks = Array.from(meta.weeks).sort();
    let current = 0;
    let weekOffset = 0;
    while (true) {
      const key = weekKeyFor(weekOffset);
      if (meta.weeks.has(key)) { current++; weekOffset++; }
      else if (weekOffset === 0) { weekOffset++; }
      else { break; }
    }
    let best = 0;
    let run = 0;
    let prevKey = '';
    for (const key of sortedWeeks) {
      if (!prevKey) { run = 1; }
      else {
        const prev = new Date(prevKey.replace('-W', '-') + '-1');
        const curr = new Date(key.replace('-W', '-') + '-1');
        const diffWeeks = Math.round((curr.getTime() - prev.getTime()) / (7 * 86400000));
        run = diffWeeks === 1 ? run + 1 : 1;
      }
      best = Math.max(best, run);
      prevKey = key;
    }
    results.push({ user_id: uid, display_name: meta.display_name, crew_name: meta.crew_name, crew_color: meta.crew_color, current_streak: current, best_streak: best });
  }

  return results
    .sort((a, b) => b.current_streak - a.current_streak || b.best_streak - a.best_streak)
    .slice(0, limit);
}
