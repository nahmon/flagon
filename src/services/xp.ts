export interface LevelInfo {
  level: number;
  name: { ko: string; en: string; ja: string };
  minXp: number;
  color: string;
  icon: string;
}

export const LEVELS: LevelInfo[] = [
  { level: 1,  name: { ko: '초보 산악인',    en: 'Rookie Hiker',        ja: '初心者登山家' },     minXp: 0,     color: '#71717A', icon: '🥾' },
  { level: 2,  name: { ko: '트레일러',        en: 'Trail Walker',        ja: 'トレイルウォーカー' }, minXp: 500,   color: '#4A7C59', icon: '🌿' },
  { level: 3,  name: { ko: '능선 정복자',     en: 'Ridge Runner',        ja: 'リッジランナー' },    minXp: 1200,  color: '#2D6A4F', icon: '⛺' },
  { level: 4,  name: { ko: '봉우리 사냥꾼',   en: 'Peak Hunter',         ja: 'ピークハンター' },    minXp: 2500,  color: '#5B7FA6', icon: '🗻' },
  { level: 5,  name: { ko: '정상 도전자',     en: 'Summit Seeker',       ja: 'サミットシーカー' },  minXp: 5000,  color: '#4A6FA5', icon: '🧗' },
  { level: 6,  name: { ko: '고지 정복자',     en: 'Alpine Conqueror',    ja: 'アルパインコンカラー' }, minXp: 9000,  color: '#8B6BA8', icon: '🏔️' },
  { level: 7,  name: { ko: '설원의 전사',     en: 'Snow Warrior',        ja: '雪原の戦士' },         minXp: 15000, color: '#C0704A', icon: '❄️' },
  { level: 8,  name: { ko: '하늘 위의 독수리', en: 'Sky Eagle',           ja: '空の鷹' },             minXp: 25000, color: '#C0A44A', icon: '🦅' },
  { level: 9,  name: { ko: '전설의 산악인',   en: 'Legendary Climber',   ja: '伝説の登山家' },       minXp: 40000, color: '#FC4C02', icon: '🏅' },
  { level: 10, name: { ko: '산의 신',         en: 'Mountain God',        ja: '山の神' },             minXp: 60000, color: '#D4B060', icon: '⚡' },
];

/** XP earned for a single flag plant at the given elevation. */
export function xpForFlag(elevationM: number): number {
  return 100 + Math.max(0, Math.floor((elevationM - 500) / 10));
}

/** Cheap XP estimate when per-flag elevation data is unavailable. */
export function approximateXpFromFlagCount(totalFlags: number): number {
  return totalFlags * 150;
}

export function levelForXp(xp: number): LevelInfo {
  let info = LEVELS[0];
  for (const l of LEVELS) {
    if (xp >= l.minXp) info = l;
    else break;
  }
  return info;
}

export interface XpProgress {
  xp: number;
  current: LevelInfo;
  next: LevelInfo | null;
  /** 0–1 progress toward next level (1 = max level) */
  fraction: number;
  xpIntoLevel: number;
  xpNeeded: number;
}

export function xpProgress(xp: number): XpProgress {
  const current = levelForXp(xp);
  const next = LEVELS.find((l) => l.level === current.level + 1) ?? null;
  if (!next) {
    return { xp, current, next: null, fraction: 1, xpIntoLevel: xp - current.minXp, xpNeeded: 0 };
  }
  const span = next.minXp - current.minXp;
  const into = xp - current.minXp;
  return { xp, current, next, fraction: into / span, xpIntoLevel: into, xpNeeded: span - into };
}

export function levelName(info: LevelInfo, lang: 'ko' | 'en' | 'ja'): string {
  return info.name[lang];
}
