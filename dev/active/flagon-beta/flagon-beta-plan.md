# FlagOn Beta Launch Plan

## Goal
첫 TestFlight 빌드를 배포하고 내부 테스터에게 앱을 전달한다.

## 전제 조건
- Supabase 마이그레이션 005–008 적용 완료
- EAS 환경 변수 설정 완료 (Mapbox 토큰, Supabase URL/key)
- GitHub secret `EXPO_TOKEN` 설정 완료

## 단계

### 1. Supabase 마이그레이션 적용
Supabase 대시보드 → SQL Editor에서 순서대로 실행:
- `005_flag_expiry_cron.sql` — pg_cron 깃발 만료 자동화
- `006_flag_stolen_notifications.sql` — 깃발 탈취 알림 트리거
- `007_summits_near_expiry.sql` — summits_near RPC 업데이트
- `008_push_tokens.sql` — users 테이블에 push_token 컬럼 추가

### 2. GitHub Secret 설정
GitHub 저장소 → Settings → Secrets → Actions:
- `EXPO_TOKEN`: expo.dev/accounts/nahmon/settings/access-tokens에서 생성

### 3. EAS 빌드 트리거
```bash
# 수동 빌드
eas build --profile production --platform ios --non-interactive

# 또는 main에 push하면 GitHub Actions가 자동 트리거
```

### 4. TestFlight 배포
EAS 빌드 완료 후:
```bash
eas submit --platform ios --latest
```
또는 EAS 대시보드에서 직접 제출

### 5. 내부 테스터 초대
App Store Connect → TestFlight → 내부 테스터 그룹에 추가
