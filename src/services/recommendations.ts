import { supabase } from './supabase';

export interface RecommendedSummit {
  id: string;
  name_ko: string;
  name_en: string | null;
  name_ja: string | null;
  elevation_m: number;
  mountain_group: string | null;
  reasonCount: number;
}

type SummitRow = {
  id: string;
  name_ko: string;
  name_en: string | null;
  name_ja: string | null;
  elevation_m: number;
  mountain_group: string | null;
};

/** Summits with the most flag plants in the past 7 days, excluding those you own. */
export async function fetchTrendingSummits(limit = 12): Promise<RecommendedSummit[]> {
  const { data: { user } } = await supabase.auth.getUser();

  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();

  const { data, error } = await supabase
    .from('flags')
    .select('summit_id, user_id, summits!inner(id, name_ko, name_en, name_ja, elevation_m, mountain_group)')
    .eq('is_active', true)
    .gte('planted_at', since);

  if (error) throw error;

  type Row = { summit_id: string; user_id: string; summits: SummitRow };
  const map = new Map<string, { summit: SummitRow; count: number; hasMe: boolean }>();
  for (const r of (data ?? []) as unknown as Row[]) {
    const existing = map.get(r.summit_id);
    if (existing) {
      existing.count++;
      if (r.user_id === user?.id) existing.hasMe = true;
    } else {
      map.set(r.summit_id, { summit: r.summits, count: 1, hasMe: r.user_id === user?.id });
    }
  }

  return Array.from(map.values())
    .filter(v => !v.hasMe)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map(v => ({ ...v.summit, reasonCount: v.count }));
}

/** Summits your followed hikers have flagged that you haven't. */
export async function fetchFriendsConquered(limit = 12): Promise<RecommendedSummit[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: follows } = await supabase
    .from('user_follows')
    .select('followee_id')
    .eq('follower_id', user.id);

  const friendIds = (follows ?? []).map((r: { followee_id: string }) => r.followee_id);
  if (friendIds.length === 0) return [];

  const [{ data: friendFlags }, { data: myFlags }] = await Promise.all([
    supabase
      .from('flags')
      .select('summit_id, user_id, summits!inner(id, name_ko, name_en, name_ja, elevation_m, mountain_group)')
      .in('user_id', friendIds),
    supabase
      .from('flags')
      .select('summit_id')
      .eq('user_id', user.id),
  ]);

  const mySet = new Set((myFlags ?? []).map((r: { summit_id: string }) => r.summit_id));

  type Row = { summit_id: string; user_id: string; summits: SummitRow };
  const map = new Map<string, { summit: SummitRow; friends: Set<string> }>();
  for (const r of (friendFlags ?? []) as unknown as Row[]) {
    if (mySet.has(r.summit_id)) continue;
    const existing = map.get(r.summit_id);
    if (existing) {
      existing.friends.add(r.user_id);
    } else {
      map.set(r.summit_id, { summit: r.summits, friends: new Set([r.user_id]) });
    }
  }

  return Array.from(map.values())
    .sort((a, b) => b.friends.size - a.friends.size)
    .slice(0, limit)
    .map(v => ({ ...v.summit, reasonCount: v.friends.size }));
}

/** Highest elevation summits you haven't conquered yet. */
export async function fetchHighAltitudeTargets(limit = 12): Promise<RecommendedSummit[]> {
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: allSummits }, { data: myFlags }] = await Promise.all([
    supabase
      .from('summits')
      .select('id, name_ko, name_en, name_ja, elevation_m, mountain_group')
      .order('elevation_m', { ascending: false })
      .limit(100),
    user
      ? supabase.from('flags').select('summit_id').eq('user_id', user.id)
      : Promise.resolve({ data: [] }),
  ]);

  const mySet = new Set((myFlags ?? []).map((r: { summit_id: string }) => r.summit_id));

  return (allSummits ?? [])
    .filter((s: SummitRow) => !mySet.has(s.id))
    .slice(0, limit)
    .map((s: SummitRow) => ({ ...s, reasonCount: s.elevation_m }));
}
