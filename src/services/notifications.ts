import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { supabase } from './supabase';

const CHANNEL_ID = 'flagon-main';
const SUMMARY_NOTIFICATION_ID = 'daily-hiking-summary';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function setupAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'FlagOn 알림',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#2D6A4F',
    sound: 'default',
  });
}

export async function registerForPushNotifications(): Promise<void> {
  await setupAndroidChannel();

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return;

  // projectId required for Expo push token — sourced from eas.json or app config extra
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  const projectId: string | undefined =
    extra?.eas?.projectId ??
    (Constants.easConfig as unknown as { projectId?: string } | null)?.projectId;
  if (!projectId) return;

  let token: string;
  try {
    const result = await Notifications.getExpoPushTokenAsync({ projectId });
    token = result.data;
  } catch {
    return;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from('profiles')
    .upsert({ id: user.id, push_token: token }, { onConflict: 'id' });
}

export async function scheduleHikingSummaryNotification(
  flagCount: number,
  crewRank: number,
): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(SUMMARY_NOTIFICATION_ID);

  const now = new Date();
  const trigger = new Date(now);
  trigger.setHours(18, 0, 0, 0);
  if (trigger <= now) trigger.setDate(trigger.getDate() + 1);

  await Notifications.scheduleNotificationAsync({
    identifier: SUMMARY_NOTIFICATION_ID,
    content: {
      title: `오늘 ${flagCount}개 깃발 달성! 🚩`,
      body: `크루 랭킹 ${crewRank}위 · 내일도 정상을 정복하세요`,
      sound: 'default',
      data: { type: 'daily_summary' },
      ...(Platform.OS === 'android' && { channelId: CHANNEL_ID }),
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: trigger },
  });
}

export async function sendCrewRivalAlert(
  rivalName: string,
  summitName: string,
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${rivalName}이(가) 먼저 꽂았어요! 🏔️`,
      body: `${summitName}에 경쟁 크루 깃발이 꽂혔습니다. 탈환하러 가세요!`,
      sound: 'default',
      data: { type: 'rival_alert', summitName },
      ...(Platform.OS === 'android' && { channelId: CHANNEL_ID }),
    },
    trigger: null,
  });
}

export async function requestNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function notifySummitNear(summitName: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${summitName} 정상 근처!`,
      body: '20분간 머물면 깃발을 꽂을 수 있습니다',
      ...(Platform.OS === 'android' && { channelId: CHANNEL_ID }),
    },
    trigger: null,
  });
}

export async function notifySummitVerified(summitName: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${summitName} 인증 완료!`,
      body: '앱을 열어 크루 깃발을 꽂으세요 🚩',
      ...(Platform.OS === 'android' && { channelId: CHANNEL_ID }),
    },
    trigger: null,
  });
}
