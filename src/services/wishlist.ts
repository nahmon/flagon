import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'wishlist_v1';

export interface WishItem {
  id: string;
  name_ko: string;
  name_en: string | null;
  name_ja: string | null;
  elevation_m: number;
  mountain_group: string | null;
  addedAt: string;
}

async function load(): Promise<WishItem[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as WishItem[]) : [];
  } catch {
    return [];
  }
}

async function save(items: WishItem[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(items));
}

export async function getWishList(): Promise<WishItem[]> {
  return load();
}

export async function isWishlisted(summitId: string): Promise<boolean> {
  const items = await load();
  return items.some((i) => i.id === summitId);
}

export async function addToWishList(item: Omit<WishItem, 'addedAt'>): Promise<void> {
  const items = await load();
  if (items.some((i) => i.id === item.id)) return;
  await save([{ ...item, addedAt: new Date().toISOString() }, ...items]);
}

export async function removeFromWishList(summitId: string): Promise<void> {
  const items = await load();
  await save(items.filter((i) => i.id !== summitId));
}
