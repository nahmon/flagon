# FlagOn Beta — 체크리스트

## 🔴 필수: 빌드 전 완료

- [ ] **Migration 005** — Supabase SQL Editor에서 `005_flag_expiry_cron.sql` 실행
  - pg_cron 확장이 없으면: 대시보드 → Database → Extensions → pg_cron 활성화
- [ ] **Migration 006** — `006_flag_stolen_notifications.sql` 실행
  - notifications 테이블 + 깃발 탈취 트리거 생성
- [ ] **Migration 007** — `007_summits_near_expiry.sql` 실행
  - summits_near RPC expires_at 필터 추가
- [ ] **Migration 008** — `008_push_tokens.sql` 실행
  - users 테이블에 push_token 컬럼 추가
- [ ] **GitHub Secret** — `EXPO_TOKEN` 설정
  - expo.dev/accounts/nahmon/settings/access-tokens → 토큰 생성
  - GitHub repo → Settings → Secrets → Actions → New secret

## 🟡 빌드

- [ ] `eas build --profile production --platform ios --non-interactive`
  - 또는 main에 push하면 GitHub Actions 자동 트리거
  - Telegram으로 성공/실패 알림 수신
- [ ] EAS 대시보드에서 빌드 완료 확인

## 🟢 배포

- [ ] `eas submit --platform ios --latest`
  - ASC App ID: `6770165649` (eas.json에 이미 설정됨)
- [ ] App Store Connect → TestFlight → 내부 테스터 빌드 선택
- [ ] 테스터에게 TestFlight 초대 링크 발송

## ✅ 완료된 기능 (M15–M19)

- [x] GPS 깃발 심기/탈취 (7일 만료 타이머)
- [x] 크루 생성/참여/탈퇴 + 초대 코드 공유
- [x] 지도: 자신의 크루 깃발 금색 강조
- [x] 피드: 실시간 깃발 활동
- [x] 리더보드: 크루 랭킹 + 멤버 상세
- [x] 프로필: 닉네임 편집, 최근 등산 기록
- [x] 설정: 언어(ko/en/ja), 알림, 로그아웃
- [x] 온보딩 화면
- [x] Apple Sign-In + Google OAuth
- [x] 다국어 (한국어 기본)
- [x] 스플래시 화면 (초록색 배경)
- [x] EAS Secret으로 Mapbox 토큰 관리
- [x] GitHub Actions EAS 빌드 워크플로우
