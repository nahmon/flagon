import { supabase } from './supabase';

export interface SpeedRecord {
  id: string;
  userId: string;
  displayName: string;
  crewName: string | null;
  crewColor: string | null;
  durationMinutes: number;
  achievedAt: string;
}

type RawRecord = {
  id: string;
  user_id: string;
  duration_minutes: number;
  achieved_at: string;
  users: { display_name: string | null } | null;
  crews: { name_ko: string | null; name: string | null; color_hex: string | null } | null;
};

function mapRow(row: RawRecord): SpeedRecord {
  return {
    id: row.id,
    userId: row.user_id,
    displayName: row.users?.display_name ?? '?',
    crewName: row.crews?.name_ko ?? row.crews?.name ?? null,
    crewColor: row.crews?.color_hex ?? null,
    durationMinutes: row.duration_minutes,
    achievedAt: row.achieved_at,
  };
}

export async function fetchSummitSpeedRecords(summitId: string, limit = 10): Promise<SpeedRecord[]> {
  const { data, error } = await supabase
    .from('summit_speed_records')
    .select('id, user_id, duration_minutes, achieved_at, users(display_name), crews(name_ko, name, color_hex)')
    .eq('summit_id', summitId)
    .order('duration_minutes', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map((r: RawRecord) => mapRow(r));
}

export async function fetchMySpeedRecord(summitId: string): Promise<SpeedRecord | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('summit_speed_records')
    .select('id, user_id, duration_minutes, achieved_at, users(display_name), crews(name_ko, name, color_hex)')
    .eq('summit_id', summitId)
    .eq('user_id', user.id)
    .order('duration_minutes', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapRow(data as RawRecord);
}
