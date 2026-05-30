import { useEffect, useState, useCallback } from 'react';
import {
  Modal, View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { Colors } from '../constants';
import type { FollowEntry } from '../services/follows';
import {
  type HikeBuddyInvite,
  fetchMyFollowingForInvite, fetchBuddiesForHike, inviteBuddy,
} from '../services/hikeBuddy';
import { useLang } from '../contexts/LangContext';
import { t } from '../i18n/strings';

interface Props {
  visible: boolean;
  summitId: string;
  summitName: string;
  plannedDate: string;
  onClose: () => void;
}

type InviteStatus = HikeBuddyInvite['status'] | null;

export default function HikeBuddyModal({ visible, summitId, summitName, plannedDate, onClose }: Props) {
  const { lang } = useLang();
  const s = t(lang);
  const [contacts, setContacts] = useState<FollowEntry[]>([]);
  const [statusMap, setStatusMap] = useState<Record<string, InviteStatus>>({});
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [following, invites] = await Promise.all([
        fetchMyFollowingForInvite(),
        fetchBuddiesForHike(summitId, plannedDate),
      ]);
      setContacts(following);
      const map: Record<string, InviteStatus> = {};
      for (const inv of invites) map[inv.invitee_id] = inv.status;
      setStatusMap(map);
    } finally {
      setLoading(false);
    }
  }, [summitId, plannedDate]);

  useEffect(() => { if (visible) load(); }, [visible, load]);

  const handleInvite = async (userId: string) => {
    if (statusMap[userId] || busy) return;
    setBusy(userId);
    try {
      await inviteBuddy(summitId, userId, plannedDate);
      setStatusMap((prev: Record<string, InviteStatus>) => ({ ...prev, [userId]: 'pending' }));
    } catch {
      Alert.alert(s.error, s.buddyInviteError);
    } finally {
      setBusy(null);
    }
  };

  const labelFor = (status: InviteStatus): string => {
    if (status === 'accepted') return s.buddyAccepted;
    if (status === 'declined') return s.buddyDeclined;
    if (status === 'pending') return s.buddyPending;
    return s.buddyInvite;
  };

  const colorFor = (status: InviteStatus): string => {
    if (status === 'accepted') return Colors.green;
    if (status === 'declined') return Colors.zinc500;
    if (status === 'pending') return Colors.orange;
    return Colors.zinc800;
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <View style={styles.titleBlock}>
            <Text style={styles.title}>{s.buddyTitle}</Text>
            <Text style={styles.subtitle}>{summitName} · {plannedDate}</Text>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeTxt}>✕</Text>
          </TouchableOpacity>
        </View>

        {loading
          ? <ActivityIndicator color={Colors.green} style={styles.loader} />
          : contacts.length === 0
            ? (
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>👥</Text>
                <Text style={styles.emptyTitle}>{s.buddyNoFollowing}</Text>
                <Text style={styles.emptySub}>{s.buddyNoFollowingSub}</Text>
              </View>
            )
            : (
              <FlatList
                data={contacts}
                keyExtractor={(item: FollowEntry) => item.userId}
                contentContainerStyle={styles.list}
                renderItem={({ item }: { item: FollowEntry }) => {
                  const status = statusMap[item.userId] ?? null;
                  const isBusy = busy === item.userId;
                  const isDisabled = status !== null || isBusy;
                  const name = item.displayName ?? '?';
                  return (
                    <View style={styles.row}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarLetter}>{(name[0] ?? '?').toUpperCase()}</Text>
                      </View>
                      <View style={styles.nameCol}>
                        <Text style={styles.name}>{name}</Text>
                        {item.crewName ? <Text style={styles.crew}>{item.crewName}</Text> : null}
                      </View>
                      <TouchableOpacity
                        style={[styles.inviteBtn, isDisabled && styles.inviteBtnOff]}
                        onPress={() => handleInvite(item.userId)}
                        disabled={isDisabled}
                        activeOpacity={0.8}
                      >
                        {isBusy
                          ? <ActivityIndicator color={Colors.green} size="small" />
                          : <Text style={[styles.inviteTxt, { color: colorFor(status) }]}>{labelFor(status)}</Text>
                        }
                      </TouchableOpacity>
                    </View>
                  );
                }}
              />
            )
        }
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  handle: {
    width: 36, height: 4, backgroundColor: Colors.zinc200,
    borderRadius: 2, alignSelf: 'center', marginVertical: 12,
  },
  header: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 16,
  },
  titleBlock: { flex: 1 },
  title: { fontSize: 20, fontWeight: '800', color: Colors.zinc950, letterSpacing: -0.4 },
  subtitle: { fontSize: 13, color: Colors.zinc500, marginTop: 2 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.zinc100, alignItems: 'center', justifyContent: 'center',
  },
  closeTxt: { fontSize: 12, color: Colors.zinc800, fontWeight: '700' },
  loader: { marginTop: 48 },
  list: { paddingHorizontal: 20, paddingBottom: 48 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.zinc100,
  },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.green, alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  avatarLetter: { fontSize: 16, fontWeight: '700', color: Colors.white },
  nameCol: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: Colors.zinc950 },
  crew: { fontSize: 12, color: Colors.zinc500, marginTop: 1 },
  inviteBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: Colors.green + '18', minWidth: 72, alignItems: 'center',
  },
  inviteBtnOff: { backgroundColor: Colors.zinc100 },
  inviteTxt: { fontSize: 13, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 52, marginBottom: 16 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.zinc800, textAlign: 'center', marginBottom: 8 },
  emptySub: { fontSize: 14, color: Colors.zinc500, textAlign: 'center', lineHeight: 20 },
});
