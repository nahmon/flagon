import { supabase } from './supabase';

export interface InboxNotification {
  id: string;
  type: string;
  payload: Record<string, string | number | null> | null;
  read_at: string | null;
  created_at: string;
}

const TYPE_ICONS: Record<string, string> = {
  flag_stolen: '🏴',
  crew_challenge: '⚔️',
  buddy_invite: '👥',
  kudos: '👏',
  follow: '👤',
  summit_near: '⛰️',
  flag_expiry: '⏰',
  achievement: '🏆',
  crew_invite: '🤝',
  rival_alert: '🔥',
};

export function notifIcon(type: string): string {
  return TYPE_ICONS[type] ?? '🔔';
}

export async function fetchInboxNotifications(userId: string): Promise<InboxNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, type, payload, read_at, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) throw error;
  return (data ?? []) as InboxNotification[];
}

export async function markAllRead(userId: string): Promise<void> {
  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null);
}

export async function getUnreadCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null);
  if (error) return 0;
  return count ?? 0;
}
