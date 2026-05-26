import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = (summitId: string) => `summit_tips_v1_${summitId}`;
const MAX_TIPS = 50;
const MAX_CHARS = 140;

export interface SummitTip {
  id: string;
  summitId: string;
  text: string;
  userName: string;
  userId: string;
  createdAt: string;
}

export async function loadTips(summitId: string): Promise<SummitTip[]> {
  const raw = await AsyncStorage.getItem(KEY(summitId));
  if (!raw) return [];
  try { return JSON.parse(raw) as SummitTip[]; } catch { return []; }
}

export async function addTip(
  summitId: string,
  text: string,
  userId: string,
  userName: string,
): Promise<SummitTip> {
  const existing = await loadTips(summitId);
  const tip: SummitTip = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    summitId,
    text: text.trim().slice(0, MAX_CHARS),
    userId,
    userName,
    createdAt: new Date().toISOString(),
  };
  const updated = [tip, ...existing].slice(0, MAX_TIPS);
  await AsyncStorage.setItem(KEY(summitId), JSON.stringify(updated));
  return tip;
}

export async function deleteTip(summitId: string, tipId: string): Promise<void> {
  const existing = await loadTips(summitId);
  await AsyncStorage.setItem(KEY(summitId), JSON.stringify(existing.filter(t => t.id !== tipId)));
}

export { MAX_CHARS };
