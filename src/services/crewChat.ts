import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ChatMessage {
  id: string;
  crew_id: string;
  user_id: string;
  sender_name: string;
  text: string;
  created_at: string;
}

const KEY = (crewId: string) => `@crew_chat_${crewId}`;
const MAX = 100;

export async function fetchMessages(crewId: string): Promise<ChatMessage[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY(crewId));
    if (!raw) return [];
    return JSON.parse(raw) as ChatMessage[];
  } catch {
    return [];
  }
}

export async function sendMessage(
  crewId: string,
  userId: string,
  senderName: string,
  text: string,
): Promise<ChatMessage> {
  const existing = await fetchMessages(crewId);
  const msg: ChatMessage = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    crew_id: crewId,
    user_id: userId,
    sender_name: senderName,
    text: text.trim(),
    created_at: new Date().toISOString(),
  };
  const updated = [...existing, msg].slice(-MAX);
  await AsyncStorage.setItem(KEY(crewId), JSON.stringify(updated));
  return msg;
}

export async function deleteMessage(crewId: string, messageId: string): Promise<void> {
  const existing = await fetchMessages(crewId);
  const updated = existing.filter((m) => m.id !== messageId);
  await AsyncStorage.setItem(KEY(crewId), JSON.stringify(updated));
}
