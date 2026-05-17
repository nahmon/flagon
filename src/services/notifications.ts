import * as Notifications from 'expo-notifications';
import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function notifySummitNear(summitName: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${summitName} 정상 근처!`,
      body: `20분간 머물면 깃발을 꽂을 수 있습니다`,
    },
    trigger: null,
  });
}

export async function notifySummitVerified(summitName: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${summitName} 인증 완료!`,
      body: `앱을 열어 크루 깃발을 꽂으세요 🚩`,
    },
    trigger: null,
  });
}

export async function deliverPendingNotifications(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data } = await supabase
    .from('notifications')
    .select('id, type, payload')
    .eq('user_id', user.id)
    .is('read_at', null)
    .order('created_at', { ascending: true });

  if (!data?.length) return;

  for (const notif of data) {
    if (notif.type === 'flag_stolen') {
      const summitName = notif.payload?.summit_name ?? '정상';
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '깃발을 빼앗겼습니다 🚩',
          body: `${summitName} 정상이 다른 크루에게 점령당했습니다`,
        },
        trigger: null,
      });
    }
  }

  // Mark all delivered notifications as read
  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .in('id', data.map(n => n.id));
}
