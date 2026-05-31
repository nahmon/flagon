import { supabase } from './supabase';
import { Summit } from '../types';

export interface BingoCell {
  summit: Summit;
  completed: boolean;
  position: number; // 0–8
}

export interface SummitBingo {
  monthKey: string;
  cells: BingoCell[];
  completedLines: number;
  lineBonus: number;
  fullBoardBonus: number;
  totalXp: number;
  allDone: boolean;
  daysLeft: number;
}

const GRID_SIZE = 9;
const LINE_BONUS = 300;
const FULL_BOARD_BONUS = 500;

const BINGO_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6],             // diagonals
];

export function getMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
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
  const used = new Set<number>();
  let salt = 0;
  while (result.length < count && result.length < arr.length) {
    const idx = seededIndex(seed + String(salt++), arr.length);
    if (!used.has(idx)) {
      used.add(idx);
      result.push(arr[idx]);
    }
  }
  return result;
}

function daysLeftInMonth(): number {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return Math.max(1, lastDay.getDate() - now.getDate() + 1);
}

function monthStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
}

export function detectCompletedLines(done: boolean[]): number[] {
  return BINGO_LINES.reduce<number[]>((acc, line, idx) => {
    if (line.every((pos) => done[pos])) acc.push(idx);
    return acc;
  }, []);
}

export async function fetchSummitBingo(userId: string): Promise<SummitBingo | null> {
  const monthKey = getMonthKey();

  const { data: summits, error: sErr } = await supabase
    .from('summits')
    .select('id, name_ko, name_en, name_ja, location, elevation_m, country, mountain_group, is_featured, created_at')
    .order('id');

  if (sErr || !summits || summits.length < GRID_SIZE) return null;

  const picked = seededPick(monthKey, summits as Summit[], GRID_SIZE);

  const { data: flags, error: fErr } = await supabase
    .from('flags')
    .select('summit_id')
    .eq('user_id', userId)
    .gte('planted_at', monthStart().toISOString())
    .in('summit_id', picked.map((s) => s.id));

  if (fErr) return null;

  const completedIds = new Set((flags ?? []).map((f: { summit_id: string }) => f.summit_id));
  const done = picked.map((s) => completedIds.has(s.id));
  const completedLineIndices = detectCompletedLines(done);
  const completedLines = completedLineIndices.length;
  const allDone = done.every(Boolean);
  const totalXp = completedLines * LINE_BONUS + (allDone ? FULL_BOARD_BONUS : 0);

  const cells: BingoCell[] = picked.map((summit, i) => ({
    summit,
    completed: done[i],
    position: i,
  }));

  return {
    monthKey,
    cells,
    completedLines,
    lineBonus: LINE_BONUS,
    fullBoardBonus: FULL_BOARD_BONUS,
    totalXp,
    allDone,
    daysLeft: daysLeftInMonth(),
  };
}
