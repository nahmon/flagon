import { supabase } from './supabase';
import { CrewChallenge } from '../types';

export async function fetchCrewChallenges(crewId: string): Promise<CrewChallenge[]> {
  const { data, error } = await supabase
    .from('crew_challenges')
    .select(
      '*, challenger_crew:crews!challenger_crew_id(id, name, name_ko, color_hex), challenged_crew:crews!challenged_crew_id(id, name, name_ko, color_hex)',
    )
    .or(`challenger_crew_id.eq.${crewId},challenged_crew_id.eq.${crewId}`)
    .order('created_at', { ascending: false })
    .limit(10);
  if (error) throw error;
  return (data ?? []) as unknown as CrewChallenge[];
}

export async function createChallenge(
  challengerCrewId: string,
  challengedCrewId: string,
  durationHours: number,
): Promise<void> {
  const now = new Date();
  const ends = new Date(now.getTime() + durationHours * 3_600_000);
  const { error } = await supabase.from('crew_challenges').insert({
    challenger_crew_id: challengerCrewId,
    challenged_crew_id: challengedCrewId,
    status: 'active',
    starts_at: now.toISOString(),
    ends_at: ends.toISOString(),
  });
  if (error) throw error;
}

export async function fetchChallengeProgress(
  challengerCrewId: string,
  challengedCrewId: string,
  startsAt: string,
  endsAt: string,
): Promise<{ challenger: number; challenged: number }> {
  const { data, error } = await supabase
    .from('flags')
    .select('crew_id')
    .in('crew_id', [challengerCrewId, challengedCrewId])
    .gte('planted_at', startsAt)
    .lte('planted_at', endsAt);
  if (error) throw error;
  const rows = (data ?? []) as { crew_id: string }[];
  return {
    challenger: rows.filter((r) => r.crew_id === challengerCrewId).length,
    challenged: rows.filter((r) => r.crew_id === challengedCrewId).length,
  };
}
