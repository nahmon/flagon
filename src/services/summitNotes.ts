import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PREFIX = 'summit_note_v1_';

export interface SummitNote {
  summitId: string;
  text: string;
  updatedAt: string;
}

export async function saveNote(summitId: string, text: string): Promise<void> {
  const note: SummitNote = { summitId, text: text.trim(), updatedAt: new Date().toISOString() };
  await AsyncStorage.setItem(KEY_PREFIX + summitId, JSON.stringify(note));
}

export async function loadNote(summitId: string): Promise<SummitNote | null> {
  const raw = await AsyncStorage.getItem(KEY_PREFIX + summitId);
  if (!raw) return null;
  try { return JSON.parse(raw) as SummitNote; } catch { return null; }
}

export async function deleteNote(summitId: string): Promise<void> {
  await AsyncStorage.removeItem(KEY_PREFIX + summitId);
}
