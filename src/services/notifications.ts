import * as Notifications from 'expo-notifications';

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
