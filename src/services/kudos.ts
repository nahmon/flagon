import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_COUNT = (id: string) => `kudos_count_${id}`;
const KEY_GIVEN = (id: string) => `kudos_given_${id}`;

export async function getKudosCount(itemId: string): Promise<number> {
  const raw = await AsyncStorage.getItem(KEY_COUNT(itemId));
  return raw ? parseInt(raw, 10) : 0;
}

export async function hasGivenKudos(itemId: string): Promise<boolean> {
  return (await AsyncStorage.getItem(KEY_GIVEN(itemId))) === '1';
}

export async function toggleKudos(itemId: string): Promise<{ count: number; given: boolean }> {
  const given = await hasGivenKudos(itemId);
  const count = await getKudosCount(itemId);
  if (given) {
    const next = Math.max(0, count - 1);
    await AsyncStorage.multiSet([[KEY_COUNT(itemId), String(next)], [KEY_GIVEN(itemId), '0']]);
    return { count: next, given: false };
  } else {
    const next = count + 1;
    await AsyncStorage.multiSet([[KEY_COUNT(itemId), String(next)], [KEY_GIVEN(itemId), '1']]);
    return { count: next, given: true };
  }
}
