import { type ConquestEntry } from './conquests';
import { type Lang } from '../i18n/strings';

export interface PassportStampDef {
  group: string;
  emoji: string;
  name_ko: string;
  name_en: string;
  name_ja: string;
}

export interface PassportStamp extends PassportStampDef {
  earned: boolean;
  earnedAt: string | null;
}

export const PASSPORT_STAMP_DEFS: PassportStampDef[] = [
  { group: '북한산', emoji: '🏔️', name_ko: '북한산', name_en: 'Bukhansan', name_ja: '北漢山' },
  { group: '설악산', emoji: '⛰️', name_ko: '설악산', name_en: 'Seoraksan', name_ja: '雪岳山' },
  { group: '지리산', emoji: '🌿', name_ko: '지리산', name_en: 'Jirisan',   name_ja: '智異山' },
  { group: '한라산', emoji: '🌋', name_ko: '한라산', name_en: 'Hallasan',  name_ja: '漢拏山' },
  { group: '덕유산', emoji: '❄️',  name_ko: '덕유산', name_en: 'Deogyusan', name_ja: '徳裕山' },
  { group: '오대산', emoji: '🌲', name_ko: '오대산', name_en: 'Odaesan',   name_ja: '五台山' },
  { group: '태백산', emoji: '⭐', name_ko: '태백산', name_en: 'Taebaeksan',name_ja: '太白山' },
  { group: '소백산', emoji: '🌸', name_ko: '소백산', name_en: 'Sobaeksan', name_ja: '小白山' },
  { group: '계룡산', emoji: '🐉', name_ko: '계룡산', name_en: 'Gyeryongsan',name_ja:'鶏龍山' },
  { group: '치악산', emoji: '🦅', name_ko: '치악산', name_en: 'Chiaksan',  name_ja: '雉岳山' },
  { group: '월악산', emoji: '🌙', name_ko: '월악산', name_en: 'Weoraksan', name_ja: '月岳山' },
  { group: '속리산', emoji: '🍁', name_ko: '속리산', name_en: 'Songnisan', name_ja: '俗離山' },
  { group: '가야산', emoji: '🏯', name_ko: '가야산', name_en: 'Gayasan',   name_ja: '伽耶山' },
  { group: '내장산', emoji: '🍂', name_ko: '내장산', name_en: 'Naejangsan',name_ja: '内蔵山' },
  { group: '무등산', emoji: '☁️', name_ko: '무등산', name_en: 'Mudeungsan',name_ja: '無等山' },
  { group: '마이산', emoji: '🐴', name_ko: '마이산', name_en: 'Maisan',    name_ja: '馬耳山' },
];

export function computePassportStamps(conquests: ConquestEntry[]): PassportStamp[] {
  const earnedMap = new Map<string, string>();
  for (const c of conquests) {
    if (c.mountain_group && !earnedMap.has(c.mountain_group)) {
      earnedMap.set(c.mountain_group, c.planted_at);
    }
  }
  return PASSPORT_STAMP_DEFS.map((def) => ({
    ...def,
    earned: earnedMap.has(def.group),
    earnedAt: earnedMap.get(def.group) ?? null,
  }));
}

export function stampDisplayName(stamp: PassportStampDef, lang: Lang): string {
  if (lang === 'en') return stamp.name_en;
  if (lang === 'ja') return stamp.name_ja;
  return stamp.name_ko;
}
