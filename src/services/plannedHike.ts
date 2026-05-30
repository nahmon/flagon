import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

const KEY = (summitId: string) => `@flagon/planned_hike_${summitId}`;
const NOTIF_KEY = (summitId: string) => `@flagon/planned_hike_notif_${summitId}`;

export interface PlannedHike {
  summitId: string;
  date: string; // ISO date string YYYY-MM-DD
  notifId?: string;
}

export async function setPlannedHike(
  summitId: string,
  summitName: string,
  date: string,
): Promise<void> {
  await cancelPlannedHike(summitId);

  const hikeDate = new Date(date);
  // Notify at 7 AM on the planned hike day
  hikeDate.setHours(7, 0, 0, 0);

  let notifId: string | undefined;
  if (hikeDate > new Date()) {
    notifId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '🏔️ 오늘 등산 예정!',
        body: `${summitName} 정상 정복 — 준비됐나요?`,
        data: { summitId },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: hikeDate },
    });
    await AsyncStorage.setItem(NOTIF_KEY(summitId), notifId);
  }

  const item: PlannedHike = { summitId, date, notifId };
  await AsyncStorage.setItem(KEY(summitId), JSON.stringify(item));
}

export async function getPlannedHike(summitId: string): Promise<PlannedHike | null> {
  const raw = await AsyncStorage.getItem(KEY(summitId));
  if (!raw) return null;
  return JSON.parse(raw) as PlannedHike;
}

export async function cancelPlannedHike(summitId: string): Promise<void> {
  const notifId = await AsyncStorage.getItem(NOTIF_KEY(summitId));
  if (notifId) {
    await Notifications.cancelScheduledNotificationAsync(notifId).catch(() => undefined);
    await AsyncStorage.removeItem(NOTIF_KEY(summitId));
  }
  await AsyncStorage.removeItem(KEY(summitId));
}
