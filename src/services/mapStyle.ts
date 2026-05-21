import AsyncStorage from '@react-native-async-storage/async-storage';

export type MapStyleKey = 'outdoors' | 'satellite' | 'streets';

const KEY = 'map_style_pref';

export async function loadMapStyle(): Promise<MapStyleKey> {
  try {
    const v = await AsyncStorage.getItem(KEY);
    if (v === 'satellite' || v === 'streets' || v === 'outdoors') return v;
  } catch {}
  return 'outdoors';
}

export async function saveMapStyle(style: MapStyleKey): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, style);
  } catch {}
}

export const MAP_STYLE_ORDER: MapStyleKey[] = ['outdoors', 'satellite', 'streets'];

export const MAP_STYLE_ICON: Record<MapStyleKey, string> = {
  outdoors: '🗺',
  satellite: '🛰',
  streets: '🏙',
};
