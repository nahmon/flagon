import { useEffect, useState, useCallback } from 'react';
import {
  Modal, View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Colors } from '../constants';
import {
  fetchInboxNotifications,
  markAllRead,
  notifIcon,
  type InboxNotification,
} from '../services/inboxNotifications';
import { supabase } from '../services/supabase';
import { useLang } from '../contexts/LangContext';
import { t, type Strings } from '../i18n/strings';

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return '<1m';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function getNotifText(n: InboxNotification, s: Strings): string {
  const p = n.payload ?? {};
  const summit = typeof p.summit_name === 'string' ? p.summit_name : '';
  const crew = typeof p.crew_name === 'string' ? p.crew_name : '';
  const user = typeof p.user_name === 'string' ? p.user_name : '';
  const label = typeof p.label === 'string' ? p.label : '';
  switch (n.type) {
    case 'flag_stolen': return s.notifFlagStolen(summit || '—');
    case 'flag_expiry': return s.notifFlagExpiry(summit || '—');
    case 'crew_challenge': return s.notifCrewChallenge(crew || '—');
    case 'buddy_invite': return s.notifBuddyInvite(user || '—');
    case 'kudos': return s.notifKudos(user || '—');
    case 'follow': return s.notifFollow(user || '—');
    case 'achievement': return s.notifAchievement(label || '—');
    default: return s.notifDefault;
  }
}

function NotifRow({ item }: { item: InboxNotification }) {
  const { lang } = useLang();
  const s = t(lang);
  const unread = item.read_at === null;
  return (
    <View style={[styles.row, unread && styles.rowUnread]}>
      {unread && <View style={styles.unreadDot} />}
      <View style={styles.iconBox}>
        <Text style={styles.icon}>{notifIcon(item.type)}</Text>
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowText, unread && styles.rowTextBold]} numberOfLines={2}>
          {getNotifText(item, s)}
        </Text>
        <Text style={styles.rowTime}>{timeAgo(item.created_at)}</Text>
      </View>
    </View>
  );
}

export default function NotificationInboxModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { lang } = useLang();
  const s = t(lang);
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<InboxNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then((res: { data: { user: { id: string } | null } }) =>
      setUserId(res.data.user?.id ?? null)
    );
  }, []);

  const load = useCallback(async (uid: string, refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      const data = await fetchInboxNotifications(uid);
      setItems(data);
    } catch {
      /* noop */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (visible && userId) void load(userId);
  }, [visible, userId, load]);

  const handleMarkAll = async () => {
    if (!userId) return;
    await markAllRead(userId);
    setItems((prev: InboxNotification[]) =>
      prev.map((n: InboxNotification) => ({ ...n, read_at: new Date().toISOString() }))
    );
  };

  const unreadCount = items.filter((n: InboxNotification) => n.read_at === null).length;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={styles.title}>{s.inboxTitle}</Text>
          {unreadCount > 0 && (
            <TouchableOpacity style={styles.markAllBtn} onPress={handleMarkAll} activeOpacity={0.75}>
              <Text style={styles.markAllText}>{s.inboxMarkAllRead}</Text>
            </TouchableOpacity>
          )}
        </View>

        {unreadCount > 0 && (
          <View style={styles.unreadBanner}>
            <Text style={styles.unreadBannerText}>{s.inboxUnread(unreadCount)}</Text>
          </View>
        )}

        {loading ? (
          <ActivityIndicator style={styles.loader} size="large" color={Colors.green} />
        ) : (
          <FlatList<InboxNotification>
            data={items}
            keyExtractor={(item: InboxNotification) => item.id}
            renderItem={({ item }: { item: InboxNotification }) => <NotifRow item={item} />}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => userId && load(userId, true)}
                tintColor={Colors.green}
              />
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>🔔</Text>
                <Text style={styles.emptyText}>{s.inboxEmpty}</Text>
              </View>
            }
            ItemSeparatorComponent={() => <View style={styles.sep} />}
          />
        )}

        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeBtnText}>{s.close}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  handle: {
    width: 36, height: 4, backgroundColor: Colors.zinc200,
    borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 16,
  },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, marginBottom: 8, gap: 10,
  },
  title: { flex: 1, fontSize: 22, fontWeight: '800', color: Colors.zinc950, letterSpacing: -0.5 },
  markAllBtn: {
    backgroundColor: Colors.zinc100, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  markAllText: { fontSize: 13, fontWeight: '600', color: Colors.green },
  unreadBanner: {
    marginHorizontal: 20, marginBottom: 10,
    backgroundColor: Colors.green + '18', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  unreadBannerText: { fontSize: 13, fontWeight: '600', color: Colors.green },
  loader: { marginTop: 60 },
  list: { paddingHorizontal: 16, paddingBottom: 8 },
  empty: { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyIcon: { fontSize: 44 },
  emptyText: { fontSize: 16, color: Colors.zinc500, textAlign: 'center' },
  sep: { height: 1, backgroundColor: Colors.zinc100, marginHorizontal: 12 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.white, paddingHorizontal: 16, paddingVertical: 14,
    borderRadius: 12, marginVertical: 2,
  },
  rowUnread: { backgroundColor: Colors.green + '0C' },
  unreadDot: {
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: Colors.green, marginRight: 8, flexShrink: 0,
  },
  iconBox: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.zinc100, alignItems: 'center',
    justifyContent: 'center', marginRight: 12, flexShrink: 0,
  },
  icon: { fontSize: 20 },
  rowBody: { flex: 1 },
  rowText: { fontSize: 14, color: Colors.zinc800, lineHeight: 20 },
  rowTextBold: { fontWeight: '600', color: Colors.zinc950 },
  rowTime: { fontSize: 11, color: Colors.zinc500, marginTop: 3 },
  closeBtn: {
    marginHorizontal: 20, marginBottom: 40, marginTop: 12,
    paddingVertical: 14, backgroundColor: Colors.zinc100, borderRadius: 12, alignItems: 'center',
  },
  closeBtnText: { fontSize: 15, color: Colors.zinc500 },
});
