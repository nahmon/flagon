import { supabase } from './supabase';

export type DuelStatus = 'pending' | 'active' | 'challenger_won' | 'challenged_won' | 'declined' | 'expired';

export interface Duel {
  id: string;
  challenger_id: string;
  challenger_name: string | null;
  challenged_id: string;
  challenged_name: string | null;
  summit_id: string;
  summit_name_ko: string;
  summit_name_en: string | null;
  elevation_m: number;
  expires_at: string;
  status: DuelStatus;
  created_at: string;
}

type RawDuel = {
  id: string;
  challenger_id: string;
  challenged_id: string;
  summit_id: string;
  summit_name_ko: string;
  summit_name_en: string | null;
  elevation_m: number;
  expires_at: string;
  status: DuelStatus;
  created_at: string;
  challenger: { display_name: string | null } | null;
  challenged: { display_name: string | null } | null;
};

export interface SummitOption {
  id: string;
  name_ko: string;
  name_en: string | null;
  elevation_m: number;
}

export async function fetchMyDuels(): Promise<Duel[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('duels')
    .select(`id, challenger_id, challenged_id, summit_id,
      summit_name_ko, summit_name_en, elevation_m, expires_at, status, created_at,
      challenger:users!challenger_id(display_name),
      challenged:users!challenged_id(display_name)`)
    .or(`challenger_id.eq.${user.id},challenged_id.eq.${user.id}`)
    .not('status', 'in', '(declined,expired)')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) return [];

  return ((data ?? []) as unknown as RawDuel[]).map((row) => ({
    id: row.id,
    challenger_id: row.challenger_id,
    challenger_name: row.challenger?.display_name ?? null,
    challenged_id: row.challenged_id,
    challenged_name: row.challenged?.display_name ?? null,
    summit_id: row.summit_id,
    summit_name_ko: row.summit_name_ko,
    summit_name_en: row.summit_name_en,
    elevation_m: row.elevation_m,
    expires_at: row.expires_at,
    status: row.status,
    created_at: row.created_at,
  }));
}

export async function sendDuelChallenge(
  challengedId: string,
  summitId: string,
  summitNameKo: string,
  summitNameEn: string | null,
  elevationM: number,
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('not_authenticated');

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase.from('duels').insert({
    challenger_id: user.id,
    challenged_id: challengedId,
    summit_id: summitId,
    summit_name_ko: summitNameKo,
    summit_name_en: summitNameEn,
    elevation_m: elevationM,
    expires_at: expiresAt,
    status: 'pending',
  });

  if (error) throw error;
}

export async function respondToDuel(duelId: string, accept: boolean): Promise<void> {
  const { error } = await supabase
    .from('duels')
    .update({ status: accept ? 'active' : 'declined' })
    .eq('id', duelId);
  if (error) throw error;
}

export async function searchSummitsForDuel(query: string): Promise<SummitOption[]> {
  if (!query.trim()) return [];
  const { data, error } = await supabase
    .from('summits')
    .select('id, name_ko, name_en, elevation_m')
    .or(`name_ko.ilike.%${query}%,name_en.ilike.%${query}%`)
    .order('elevation_m', { ascending: false })
    .limit(8);
  if (error) return [];
  return (data ?? []) as SummitOption[];
}
