export type Lang = 'ko' | 'en' | 'ja';

const strings = {
  ko: {
    settings: '설정',
    language: '언어',
    langKo: '한국어',
    langEn: 'English',
    langJa: '日本語',
    notifications: '알림',
    notifDesc: '정상 근처 및 크루 알림 받기',
    notifDisable: '알림을 끄려면 기기 설정 → 알림 → FlagOn에서 변경하세요.',
    account: '계정',
    logout: '로그아웃',
    logoutConfirm: '로그아웃 하시겠습니까?',
    cancel: '취소',
    app: '앱 정보',
    version: '버전',
  },
  en: {
    settings: 'Settings',
    language: 'Language',
    langKo: '한국어',
    langEn: 'English',
    langJa: '日本語',
    notifications: 'Notifications',
    notifDesc: 'Summit proximity & crew alerts',
    notifDisable: 'To disable notifications, go to Settings → Notifications → FlagOn.',
    account: 'Account',
    logout: 'Log Out',
    logoutConfirm: 'Are you sure you want to log out?',
    cancel: 'Cancel',
    app: 'About',
    version: 'Version',
  },
  ja: {
    settings: '設定',
    language: '言語',
    langKo: '한국어',
    langEn: 'English',
    langJa: '日本語',
    notifications: '通知',
    notifDesc: '山頂近接・クルー通知を受け取る',
    notifDisable: '通知を無効にするには、設定 → 通知 → FlagOn で変更してください。',
    account: 'アカウント',
    logout: 'ログアウト',
    logoutConfirm: 'ログアウトしますか？',
    cancel: 'キャンセル',
    app: 'アプリ情報',
    version: 'バージョン',
  },
} as const;

export type Strings = Record<keyof typeof strings['en'], string>;

export function t(lang: Lang): Strings {
  return strings[lang] as Strings;
}
