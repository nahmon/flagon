import { supabase } from './supabase';

export interface StolenFromMe {
  summit_id: string;
  summit_name_ko: string;
  summit_name_en: string | null;
  elevation_m: number;
  my_planted_at: string;
  thief_name: string;
  stolen_at: string;
}

export interface IStoledFrom {
  summit_id: string;
  summit_name_ko: string;
  summit_name_en: string | null;
  elevation_m: number;
  victim_name: string;
  victim_planted_at: string;
  my_planted_at: string;
}

export interface RivalStats {
  stolenFromMe: StolenFromMe[];
  iStoleFrom: IStoledFrom[];
  topRivals: { name: string; count: number }[];
}

type RawFlag = {
  summit_id: string;
  planted_at: string;
  summits: { name_ko: string; name_en: string | null; elevation_m: number } | null;
};

type RawOtherFlag = RawFlag & {
  users: { display_name: string } | null;
};

export async function fetchRivalStats(): Promise<RivalStats> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { stolenFromMe: [], iStoleFrom: [], topRivals: [] };

  const { data: myFlagsRaw, error: e1 } = await supabase
    .from('flags')
    .select('summit_id, planted_at, summits(name_ko, name_en, elevation_m)')
    .eq('user_id', user.id)
    .order('planted_at', { ascending: true });

  if (e1 || !myFlagsRaw?.length) return { stolenFromMe: [], iStoleFrom: [], topRivals: [] };

  const myFlags = myFlagsRaw as unknown as RawFlag[];
  const summitIds = [...new Set(myFlags.map(f => f.summit_id))].slice(0, 40);

  const { data: otherFlagsRaw, error: e2 } = await supabase
    .from('flags')
    .select('summit_id, planted_at, summits(name_ko, name_en, elevation_m), users(display_name)')
    .in('summit_id', summitIds)
    .neq('user_id', user.id)
    .order('planted_at', { ascending: true });

  if (e2) return { stolenFromMe: [], iStoleFrom: [], topRivals: [] };

  const otherFlags = (otherFlagsRaw ?? []) as unknown as RawOtherFlag[];

  type Entry = { planted_at: string; isMe: boolean; user_name: string; summit: RawFlag['summits'] };

  const bySummit = new Map<string, Entry[]>();
  for (const f of myFlags) {
    const arr = bySummit.get(f.summit_id) ?? [];
    arr.push({ planted_at: f.planted_at, isMe: true, user_name: 'me', summit: f.summits });
    bySummit.set(f.summit_id, arr);
  }
  for (const f of otherFlags) {
    const arr = bySummit.get(f.summit_id) ?? [];
    arr.push({
      planted_at: f.planted_at,
      isMe: false,
      user_name: f.users?.display_name ?? '?',
      summit: f.summits,
    });
    bySummit.set(f.summit_id, arr);
  }

  const stolenFromMe: StolenFromMe[] = [];
  const iStoleFrom: IStoledFrom[] = [];

  for (const [summitId, entries] of bySummit.entries()) {
    const sorted = entries.sort((a, b) => a.planted_at.localeCompare(b.planted_at));
    for (let i = 0; i < sorted.length - 1; i++) {
      const curr = sorted[i];
      const next = sorted[i + 1];
      if (curr.isMe && !next.isMe) {
        stolenFromMe.push({
          summit_id: summitId,
          summit_name_ko: curr.summit?.name_ko ?? '알 수 없음',
          summit_name_en: curr.summit?.name_en ?? null,
          elevation_m: curr.summit?.elevation_m ?? 0,
          my_planted_at: curr.planted_at,
          thief_name: next.user_name,
          stolen_at: next.planted_at,
        });
      } else if (!curr.isMe && next.isMe) {
        iStoleFrom.push({
          summit_id: summitId,
          summit_name_ko: curr.summit?.name_ko ?? '알 수 없음',
          summit_name_en: curr.summit?.name_en ?? null,
          elevation_m: curr.summit?.elevation_m ?? 0,
          victim_name: curr.user_name,
          victim_planted_at: curr.planted_at,
          my_planted_at: next.planted_at,
        });
      }
    }
  }

  const rivalCounts = new Map<string, number>();
  for (const e of stolenFromMe) {
    rivalCounts.set(e.thief_name, (rivalCounts.get(e.thief_name) ?? 0) + 1);
  }
  const topRivals = Array.from(rivalCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    stolenFromMe: stolenFromMe.sort((a, b) => b.stolen_at.localeCompare(a.stolen_at)).slice(0, 25),
    iStoleFrom: iStoleFrom.sort((a, b) => b.my_planted_at.localeCompare(a.my_planted_at)).slice(0, 25),
    topRivals,
  };
}
