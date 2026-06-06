import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const KEY = 'group_hike_events_v1';

export interface GroupHikeEvent {
  id: string;
  summitId: string;
  summitNameKo: string;
  summitNameEn: string;
  summitNameJa: string;
  elevationM: number;
  eventDate: string; // YYYY-MM-DD
  description: string;
  creatorId: string;
  creatorName: string;
  attendees: { userId: string; userName: string }[];
  createdAt: string;
}

export interface CreateEventInput {
  summitId: string;
  summitNameKo: string;
  summitNameEn: string;
  summitNameJa: string;
  elevationM: number;
  eventDate: string;
  description: string;
}

async function loadAll(): Promise<GroupHikeEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const all = JSON.parse(raw) as GroupHikeEvent[];
    // Prune events older than 7 days
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    return all.filter((e) => new Date(e.eventDate) >= cutoff);
  } catch {
    return [];
  }
}

async function saveAll(events: GroupHikeEvent[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(events));
}

export async function fetchUpcomingEvents(): Promise<GroupHikeEvent[]> {
  const all = await loadAll();
  const today = new Date().toISOString().slice(0, 10);
  return all
    .filter((e) => e.eventDate >= today)
    .sort((a, b) => a.eventDate.localeCompare(b.eventDate));
}

export async function fetchEventsForSummit(summitId: string): Promise<GroupHikeEvent[]> {
  const upcoming = await fetchUpcomingEvents();
  return upcoming.filter((e) => e.summitId === summitId);
}

export async function createEvent(input: CreateEventInput): Promise<GroupHikeEvent> {
  const { data: { user } } = await supabase.auth.getUser();
  const creatorId = user?.id ?? 'anon';

  let creatorName = '登山客';
  if (user) {
    const { data } = await supabase
      .from('users')
      .select('display_name')
      .eq('id', user.id)
      .single();
    creatorName = (data as { display_name: string | null } | null)?.display_name ?? creatorName;
  }

  const event: GroupHikeEvent = {
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    ...input,
    creatorId,
    creatorName,
    attendees: [{ userId: creatorId, userName: creatorName }],
    createdAt: new Date().toISOString(),
  };

  const all = await loadAll();
  await saveAll([...all, event]);
  return event;
}

export async function rsvpEvent(eventId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id ?? 'anon';
  let userName = '登山客';
  if (user) {
    const { data } = await supabase.from('users').select('display_name').eq('id', user.id).single();
    userName = (data as { display_name: string | null } | null)?.display_name ?? userName;
  }

  const all = await loadAll();
  const updated = all.map((e) => {
    if (e.id !== eventId) return e;
    if (e.attendees.some((a) => a.userId === userId)) return e;
    return { ...e, attendees: [...e.attendees, { userId, userName }] };
  });
  await saveAll(updated);
}

export async function cancelRsvp(eventId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id ?? 'anon';

  const all = await loadAll();
  const updated = all.map((e) => {
    if (e.id !== eventId) return e;
    return { ...e, attendees: e.attendees.filter((a) => a.userId !== userId) };
  });
  await saveAll(updated);
}

export async function deleteEvent(eventId: string): Promise<void> {
  const all = await loadAll();
  await saveAll(all.filter((e) => e.id !== eventId));
}

export async function getMyUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}
