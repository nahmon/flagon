# FlagOn — Design System Prompt for Claude Design

## 프로젝트 한 줄 요약
GPS 인증 기반 산악 영토 경쟁 앱. 등산하고 정상에 크루 깃발 꽂기.

---

## 디자인 방향성

### 레퍼런스 앱
- **AllTrails** — 신뢰감 있는 아웃도어 앱의 정석. 클린한 지도 UI, 실용적인 정보 계층.
- **Strava** — 스포츠 경쟁 앱의 에너지. 랭킹, 배지, 성취감 강조.
- **Nike Run Club** — 모션과 성공 피드백의 감정적 연결.

### 핵심 감성
> "자연 속 경쟁의 진지함, 크루와의 연대감, 정상 정복의 짜릿함"

- 가볍지 않다. 진지한 등산 앱.
- 자랑하고 싶어지는 UI. 스크린샷이 SNS에 올라가야 한다.
- 정상 인증 순간이 앱의 최고 감동 포인트 → 여기에 감성 집중.

---

## 컬러 팔레트

```
Primary Green:    #2D6A4F  (브랜드 메인, 버튼, 헤더)
Green Light:      #4A7C59  (호버, 보조)
Green Dark:       #1A3D2B  (로그인 배경, 딥 포인트)
Cream:            #F8F5F0  (앱 배경)
Orange:           #FC4C02  (경고, 탈퇴, Strava-inspired 액션 색)
Gold:             #D4B060  (깃발 장식, 1위 강조)

Neutrals:
  zinc-950:       #09090B
  zinc-800:       #27272A
  zinc-500:       #71717A
  zinc-200:       #E4E4E7
  zinc-100:       #F4F4F5
  white:          #FFFFFF
```

### 크루 색상 시스템
크루마다 고유 색상 배지. 지도 위 깃발 점 색 = 크루 색.
```
Forest:   #4A7C59
Terracotta: #C0704A
Slate Blue: #5B7FA6
Purple:   #8B6BA8
Gold:     #C0A44A
```

---

## 타이포그래피

- **폰트**: System (iOS San Francisco). Geist 또는 Outfit로 업그레이드 가능.
- **Wordmark "FlagOn"**: 36px, weight 700, letter-spacing -0.5
- **화면 타이틀**: 22-24px, weight 700
- **본문**: 14-15px, weight 400-500
- **보조 텍스트**: 12-13px, zinc-500
- **섹션 레이블**: 12px, weight 700, uppercase, letter-spacing 0.8, zinc-500

---

## 아이콘 스타일

커스텀 라인아트 SVG. Ionicons 기반이지만 장기적으로 자체 제작 목표.

### 탭 바 아이콘 스펙
- `viewBox="0 0 24 24"` 
- `fill="none"` 
- `stroke="currentColor"` 
- `strokeWidth="1.75"`
- `strokeLinecap="round"` 
- `strokeLinejoin="round"`

### 탭 아이콘 디자인
```
Map (지도):      Mountain silhouette line
                 path: M3 18L9 7L13 13L17 6L21 18 / line: x1=3,y1=18 x2=21,y2=18

Rankings (랭킹): 3-step podium
                 path: M3 20V15H9M9 20V11H15M15 20V17H21M3 20H21

Profile (내 정보): Person
                 circle cx=12 cy=8 r=4 / path: M4 21Q4 15 12 15Q20 15 20 21
```

---

## 핵심 화면 레이아웃

### 1. 로그인 화면
- 배경: `#1A3D2B` (greenDark)
- 상단 2/3: 브랜드 영역 — "FlagOn" 워드마크 + "Plant your flag. Own the summit." 태그라인
- 하단 1/3: 흰색 바텀시트 (borderRadius 24) — "Get Started" + Google 로그인 버튼
- 버튼: 높이 52px, borderRadius 14, 테두리형 (1.5px zinc-200)

### 2. 지도 화면 (메인)
- 전체 화면 지도 (MapLibre + CARTO Positron 라이트 스타일)
- 정상 위치: 색상 점 (crew 색 or zinc-500 if unclaimed) + 라벨 (zoom 11+)
- 오버레이 카드 (하단 고정): 정상 인증 진행 상황
  - 배경 white, borderRadius 20, 그림자
  - 상태별: near_summit (진행바) → verified (깃발 꽂기 버튼) → planted (성공 애니메이션)
- 성공 카드: green 배경, 산 이모지, 정상 이름 + "Conquered!"

### 3. 랭킹 화면
- 고정 헤더: "Crew Rankings" + "Ranked by active flags"
- 리스트: 크루 색상 점 + 이름 + 마지막 활동 시간 + 깃발 수
- 1/2/3위: 메달 이모지 (🥇🥈🥉)
- Pull-to-refresh

### 4. 프로필 화면
- 녹색 헤더: 사용자 이름 + 깃발 수
- 내 크루 섹션: 크루 색상 점 + 이름 + Leave 버튼
  - 크루 없으면: "Join or create a crew →" 배너
- 최근 등정 기록 리스트
- Sign Out 버튼 (zinc-100 배경)

---

## 주요 컴포넌트 패턴

### 카드 (Card)
```
backgroundColor: white
borderRadius: 20
padding: 20
shadow: { offset: {0,4}, opacity: 0.12, radius: 12 }
```

### 섹션 컨테이너
```
backgroundColor: white
marginTop: 16
paddingHorizontal: 20
paddingVertical: 16
```

### 프라이머리 버튼
```
height: 52
backgroundColor: #2D6A4F (green)
borderRadius: 14
fontSize: 16, fontWeight: 700, color: white
```

### 크루 뱃지
```
backgroundColor: crew.color_hex
borderRadius: 10
paddingHorizontal: 10, paddingVertical: 5
fontSize: 12, fontWeight: 600, color: white
```

### 진행 바 (GPS 인증)
```
track: height 6, backgroundColor: zinc-100, borderRadius: 3
fill: backgroundColor: green, animated width
```

---

## 금지 사항
- 이모지를 아이콘 대용으로 사용 금지 (탭바, 버튼 등)
- 과도한 그라디언트 금지
- 배경을 순수 흰색(#FFFFFF)으로 사용 금지 → cream (#F8F5F0) 사용
- 카드 남발 금지 — 섹션 구분은 여백과 배경색으로

---

## 온보딩 플로우 (참고)
앱 실행 → Google 로그인 → 지도 (위치 권한 요청) → 크루 참여/생성 모달

---

## 앱 정체성 요약
FlagOn은 "진지한 아웃도어 앱"이다.
- 트레킹 앱의 신뢰감 (AllTrails)
- 경쟁 앱의 에너지 (Strava)
- 소셜 앱의 연대감 (크루)

디자인은 이 세 가지를 균형 있게 담아야 한다.
절대 캐주얼 게임 앱처럼 보이면 안 된다.
