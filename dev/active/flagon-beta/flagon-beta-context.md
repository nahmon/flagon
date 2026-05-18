# FlagOn Beta — Context

Last Updated: 2026-05-18

## 핵심 파일

| 역할 | 파일 |
|------|------|
| 앱 진입점 | `app/_layout.tsx` |
| 지도 화면 | `app/(tabs)/index.tsx` |
| 피드 | `app/(tabs)/feed.tsx` |
| 리더보드 | `app/(tabs)/leaderboard.tsx` |
| 프로필 + 크루 | `app/(tabs)/profile.tsx` |
| 설정 | `app/(tabs)/settings.tsx` |
| GPS 서비스 | `src/services/gps.ts` |
| 하이크 스토어 | `src/stores/hikeStore.ts` |
| 알림 서비스 | `src/services/notifications.ts` |
| 국제화 | `src/i18n/strings.ts` + `src/contexts/LangContext.tsx` |
| EAS 설정 | `eas.json` |
| 앱 설정 | `app.json` |

## 주요 의사결정

- **초대 코드 = crew UUID**: `profile.tsx`에서 crew_id를 초대 코드로 사용. UUID 형식이지만 Share API로 공유 가능
- **GPS 타이머**: `stayElapsedMs`로 누적 방식. 백그라운드/재진입 시에도 리셋 없음
- **Mapbox 토큰**: EAS Secret으로 관리 (`eas env:create --environment production`). `eas.json`에 평문 없음
- **푸시 토큰 저장**: `users` 테이블의 `push_token` 컬럼 (migration 008 필요)
- **깃발 소유 크루 강조**: 지도에서 자신의 크루 깃발은 금색 테두리 (`isOwnCrew` GeoJSON 속성)
- **언어 설정 저장**: AsyncStorage 영속화, 기본값 'ko'

## 환경 변수

| 변수 | 위치 |
|------|------|
| `EXPO_PUBLIC_SUPABASE_URL` | `eas.json` preview/production env |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `eas.json` preview/production env |
| `EXPO_PUBLIC_MAPBOX_TOKEN` | EAS Secret (production + preview) |

## Supabase 프로젝트
- URL: `https://cuxkdnwptriocppkysdd.supabase.co`
- 오너: `nahmon`
- Apple Sign-In + Google OAuth 활성화

## 빌드 설정
- Bundle ID: `com.flagOn.app`
- Build Number: `9` (다음 빌드 시 EAS가 자동 증가)
- EAS Project ID: `f16f657c-585b-41be-853b-016aa128c682`
- App Store Connect App ID: `6770165649`
