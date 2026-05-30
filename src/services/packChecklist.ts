import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'pack_checklist_v1';

export interface CheckItem {
  id: string;
  label: string;
  checked: boolean;
  custom: boolean;
}

const DEFAULT_ITEMS: CheckItem[] = [
  { id: 'water',     label: '💧 물 (최소 1.5L)',   checked: false, custom: false },
  { id: 'snack',     label: '🍫 행동식 / 간식',     checked: false, custom: false },
  { id: 'firstaid',  label: '🩹 구급용품',           checked: false, custom: false },
  { id: 'sunscreen', label: '🧴 선크림 / 자외선차단', checked: false, custom: false },
  { id: 'jacket',    label: '🧥 방풍·방수 재킷',    checked: false, custom: false },
  { id: 'boots',     label: '🥾 등산화 / 등산스틱',  checked: false, custom: false },
  { id: 'battery',   label: '🔋 보조배터리',          checked: false, custom: false },
  { id: 'emergency', label: '📞 비상연락망 공유',     checked: false, custom: false },
  { id: 'map',       label: '🗺️ 지도 / 나침반',     checked: false, custom: false },
  { id: 'headlamp',  label: '🔦 헤드랜턴',           checked: false, custom: false },
];

export async function loadChecklist(): Promise<CheckItem[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [...DEFAULT_ITEMS];
    return JSON.parse(raw) as CheckItem[];
  } catch {
    return [...DEFAULT_ITEMS];
  }
}

export async function saveChecklist(items: CheckItem[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(items));
}

export async function resetChecked(): Promise<CheckItem[]> {
  const items = await loadChecklist();
  const reset = items.map(item => ({ ...item, checked: false }));
  await saveChecklist(reset);
  return reset;
}

export async function addCustomItem(label: string): Promise<CheckItem> {
  const items = await loadChecklist();
  const newItem: CheckItem = {
    id: `custom_${Date.now()}`,
    label: label.trim(),
    checked: false,
    custom: true,
  };
  const updated = [...items, newItem];
  await saveChecklist(updated);
  return newItem;
}

export async function removeItem(id: string): Promise<void> {
  const items = await loadChecklist();
  await saveChecklist(items.filter(i => i.id !== id));
}
