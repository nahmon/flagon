import AsyncStorage from '@react-native-async-storage/async-storage';
import { SummitWithFlag } from '../types';

const SUMMITS_KEY = '@flagon/cached_summits';
const META_KEY = '@flagon/cached_summits_meta';

interface CacheMeta {
  savedAt: string;
  lat: number;
  lng: number;
}

export interface CacheResult {
  summits: SummitWithFlag[];
  meta: CacheMeta;
}

export async function cacheSummits(
  summits: SummitWithFlag[],
  lat: number,
  lng: number
): Promise<void> {
  const meta: CacheMeta = { savedAt: new Date().toISOString(), lat, lng };
  await Promise.all([
    AsyncStorage.setItem(SUMMITS_KEY, JSON.stringify(summits)),
    AsyncStorage.setItem(META_KEY, JSON.stringify(meta)),
  ]);
}

export async function loadCachedSummits(): Promise<CacheResult | null> {
  const [raw, metaRaw] = await Promise.all([
    AsyncStorage.getItem(SUMMITS_KEY),
    AsyncStorage.getItem(META_KEY),
  ]);
  if (!raw || !metaRaw) return null;
  try {
    return {
      summits: JSON.parse(raw) as SummitWithFlag[],
      meta: JSON.parse(metaRaw) as CacheMeta,
    };
  } catch {
    return null;
  }
}
