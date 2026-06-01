export interface ElevationMilestone {
  id: string;
  icon: string;
  label: { ko: string; en: string; ja: string };
  desc: { ko: string; en: string; ja: string };
  thresholdM: number;
  bonusXp: number;
}

export const ELEVATION_MILESTONES: ElevationMilestone[] = [
  {
    id: 'elev_1k',
    icon: '🥉',
    label: { ko: '첫 걸음', en: 'First Steps', ja: '第一歩' },
    desc: { ko: '누적 1,000m', en: '1,000m total', ja: '累計1,000m' },
    thresholdM: 1_000,
    bonusXp: 100,
  },
  {
    id: 'elev_5k',
    icon: '🥈',
    label: { ko: '산 사랑', en: 'Mountain Lover', ja: '山愛好家' },
    desc: { ko: '누적 5,000m', en: '5,000m total', ja: '累計5,000m' },
    thresholdM: 5_000,
    bonusXp: 250,
  },
  {
    id: 'elev_10k',
    icon: '🥇',
    label: { ko: '고도 정복자', en: 'Altitude Conqueror', ja: '高度制覇者' },
    desc: { ko: '누적 10,000m', en: '10,000m total', ja: '累計10,000m' },
    thresholdM: 10_000,
    bonusXp: 500,
  },
  {
    id: 'elev_25k',
    icon: '🏔️',
    label: { ko: '하늘 탐험가', en: 'Sky Explorer', ja: '空の探検家' },
    desc: { ko: '누적 25,000m', en: '25,000m total', ja: '累計25,000m' },
    thresholdM: 25_000,
    bonusXp: 750,
  },
  {
    id: 'elev_50k',
    icon: '🗻',
    label: { ko: '에베레스트급', en: 'Everest Class', ja: 'エベレスト級' },
    desc: { ko: '누적 50,000m', en: '50,000m total', ja: '累計50,000m' },
    thresholdM: 50_000,
    bonusXp: 1_000,
  },
  {
    id: 'elev_100k',
    icon: '⚡',
    label: { ko: '산의 전설', en: 'Mountain Legend', ja: '山の伝説' },
    desc: { ko: '누적 100,000m', en: '100,000m total', ja: '累計100,000m' },
    thresholdM: 100_000,
    bonusXp: 2_000,
  },
];

export interface ElevationMilestoneStatus {
  totalElevationM: number;
  earned: ElevationMilestone[];
  next: ElevationMilestone | null;
  progressFraction: number;
  prevThreshold: number;
}

export function computeElevationMilestones(totalElevationM: number): ElevationMilestoneStatus {
  const earned = ELEVATION_MILESTONES.filter((m) => totalElevationM >= m.thresholdM);
  const next = ELEVATION_MILESTONES.find((m) => totalElevationM < m.thresholdM) ?? null;
  const prevThreshold = earned.length > 0 ? earned[earned.length - 1].thresholdM : 0;
  const progressFraction = next
    ? Math.min(1, (totalElevationM - prevThreshold) / (next.thresholdM - prevThreshold))
    : 1;
  return { totalElevationM, earned, next, progressFraction, prevThreshold };
}
