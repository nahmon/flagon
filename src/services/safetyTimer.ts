import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

const KEY = 'safety_timer_v1';

export interface SafetyTimer {
  summitName: string;
  startedAt: string;
  endsAt: string;
  notifId: string | null;
  checkedIn: boolean;
}

export async function getActiveTimer(): Promise<SafetyTimer | null> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return null;
  return JSON.parse(raw) as SafetyTimer;
}

export async function startTimer(summitName: string, durationMinutes: number): Promise<void> {
  const now = new Date();
  const endsAt = new Date(now.getTime() + durationMinutes * 60_000);

  let notifId: string | null = null;
  try {
    notifId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '⛰️ Safety Check-In Required',
        body: `Your ${durationMinutes}-minute hike timer at ${summitName} has expired. Please check in!`,
        sound: 'default',
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: endsAt },
    });
  } catch {
    // notifications not available — timer still works without it
  }

  const timer: SafetyTimer = {
    summitName,
    startedAt: now.toISOString(),
    endsAt: endsAt.toISOString(),
    notifId,
    checkedIn: false,
  };
  await AsyncStorage.setItem(KEY, JSON.stringify(timer));
}

export async function checkIn(): Promise<void> {
  const timer = await getActiveTimer();
  if (!timer) return;
  if (timer.notifId) {
    try { await Notifications.cancelScheduledNotificationAsync(timer.notifId); } catch { /* ignore */ }
  }
  timer.checkedIn = true;
  await AsyncStorage.setItem(KEY, JSON.stringify(timer));
}

export async function cancelTimer(): Promise<void> {
  const timer = await getActiveTimer();
  if (timer?.notifId) {
    try { await Notifications.cancelScheduledNotificationAsync(timer.notifId); } catch { /* ignore */ }
  }
  await AsyncStorage.removeItem(KEY);
}

export function isExpired(timer: SafetyTimer): boolean {
  return new Date() > new Date(timer.endsAt);
}

export function minutesRemaining(timer: SafetyTimer): number {
  const diff = new Date(timer.endsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 60_000));
}
