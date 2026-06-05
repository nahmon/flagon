import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = (summitId: string) => `summit_tags_v1_${summitId}`;
const VOTED_KEY = (summitId: string) => `summit_tags_voted_v1_${summitId}`;

export interface TagOption {
  id: string;
  icon: string;
  labelKo: string;
  labelEn: string;
  labelJa: string;
}

export const TAG_OPTIONS: TagOption[] = [
  { id: 'view',      icon: '🌅', labelKo: '전망 좋음',    labelEn: 'Great View',        labelJa: '絶景' },
  { id: 'beginner',  icon: '🥾', labelKo: '초보 추천',    labelEn: 'Beginner Friendly',  labelJa: '初心者向け' },
  { id: 'technical', icon: '🧗', labelKo: '기술적 난이도', labelEn: 'Technical',          labelJa: 'テクニカル' },
  { id: 'family',    icon: '👨‍👩‍👧', labelKo: '가족 친화',   labelEn: 'Family Friendly',   labelJa: 'ファミリー向け' },
  { id: 'dog',       icon: '🐕', labelKo: '반려견 가능',   labelEn: 'Dog Friendly',       labelJa: 'ペット可' },
  { id: 'sunrise',   icon: '🌄', labelKo: '일출 명소',    labelEn: 'Sunrise Spot',       labelJa: '日の出スポット' },
  { id: 'spring',    icon: '🌸', labelKo: '봄 명소',      labelEn: 'Spring Blooms',      labelJa: '春の名所' },
  { id: 'winter',    icon: '❄️', labelKo: '겨울 도전',    labelEn: 'Winter Challenge',   labelJa: '冬チャレンジ' },
  { id: 'camping',   icon: '🏕️', labelKo: '캠핑 가능',    labelEn: 'Camping Nearby',     labelJa: 'キャンプ近く' },
  { id: 'parking',   icon: '🚗', labelKo: '주차 편리',    labelEn: 'Easy Parking',       labelJa: '駐車場あり' },
];

export interface SummitTagState {
  [tagId: string]: number;
}

export async function loadTagCounts(summitId: string): Promise<SummitTagState> {
  const raw = await AsyncStorage.getItem(KEY(summitId));
  if (!raw) return {};
  try { return JSON.parse(raw) as SummitTagState; } catch { return {}; }
}

export async function loadMyVotes(summitId: string): Promise<Set<string>> {
  const raw = await AsyncStorage.getItem(VOTED_KEY(summitId));
  if (!raw) return new Set();
  try { return new Set(JSON.parse(raw) as string[]); } catch { return new Set(); }
}

export async function toggleTagVote(
  summitId: string,
  tagId: string,
): Promise<{ counts: SummitTagState; voted: Set<string> }> {
  const [counts, voted] = await Promise.all([
    loadTagCounts(summitId),
    loadMyVotes(summitId),
  ]);

  if (voted.has(tagId)) {
    voted.delete(tagId);
    counts[tagId] = Math.max(0, (counts[tagId] ?? 0) - 1);
  } else {
    voted.add(tagId);
    counts[tagId] = (counts[tagId] ?? 0) + 1;
  }

  await Promise.all([
    AsyncStorage.setItem(KEY(summitId), JSON.stringify(counts)),
    AsyncStorage.setItem(VOTED_KEY(summitId), JSON.stringify([...voted])),
  ]);

  return { counts, voted };
}
