import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'personal_flags_v1';

export interface PersonalFlag {
  id: string;
  name_ko: string;
  name_en: string | null;
  name_ja: string | null;
  elevation_m: number;
  plantedAt: string;
}

async function load(): Promise<PersonalFlag[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PersonalFlag[]) : [];
  } catch {
    return [];
  }
}

async function save(items: PersonalFlag[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(items));
}

export async function getPersonalFlags(): Promise<PersonalFlag[]> {
  return load();
}

export async function isPersonallyFlagged(summitId: string): Promise<boolean> {
  const items = await load();
  return items.some((f) => f.id === summitId);
}

export async function addPersonalFlag(item: Omit<PersonalFlag, 'plantedAt'>): Promise<void> {
  const items = await load();
  if (items.some((f) => f.id === item.id)) return;
  await save([{ ...item, plantedAt: new Date().toISOString() }, ...items]);
}

export async function removePersonalFlag(summitId: string): Promise<void> {
  const items = await load();
  await save(items.filter((f) => f.id !== summitId));
}
