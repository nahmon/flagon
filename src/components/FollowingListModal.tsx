import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors } from '../constants';
import { fetchFollowingList, FollowEntry } from '../services/follows';
import HikerProfileModal from './HikerProfileModal';
import { useLang } from '../contexts/LangContext';
import { t } from '../i18n/strings';

function avatarColor(uid: string): string {
  const palette = [Colors.green, Colors.crewMe, Colors.crewNK, Colors.orange, Colors.greenLight];
  return palette[uid.charCodeAt(0) % palette.length];
}

interface Props {
  visible: boolean;
  userId: string;
  onClose: () => void;
}

export default function FollowingListModal({ visible, userId, onClose }: Props) {
  const { lang } = useLang();
  const s = t(lang);
  const [entries, setEntries] = useState<FollowEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedHiker, setSelectedHiker] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    fetchFollowingList(userId)
      .then(setEntries)
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [visible, userId]);

  return (
    <>
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
        <View style={styles.container}>
          <View style={styles.handle} />
          <View style={styles.titleRow}>
            <Text style={styles.title}>{s.followingList}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={Colors.green} />
            </View>
          ) : entries.length === 0 ? (
            <View style={styles.centered}>
              <Text style={styles.emptyEmoji}>👥</Text>
              <Text style={styles.emptyText}>{s.noFollowing}</Text>
            </View>
          ) : (
            <FlatList
              data={entries}
              keyExtractor={(item: FollowEntry) => item.userId}
              contentContainerStyle={styles.list}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              renderItem={({ item }: { item: FollowEntry }) => {
                const bg = avatarColor(item.userId);
                const name = item.displayName ?? `#${item.userId.slice(0, 6)}`;
                const initial = name.charAt(0).toUpperCase();
                return (
                  <TouchableOpacity style={styles.row} onPress={() => setSelectedHiker(item.userId)} activeOpacity={0.7}>
                    <View style={[styles.avatar, { backgroundColor: bg }]}>
                      <Text style={styles.avatarText}>{initial}</Text>
                    </View>
                    <View style={styles.rowInfo}>
                      <Text style={styles.rowName}>{name}</Text>
                      {item.crewName ? (
                        <View style={[styles.crewBadge, { backgroundColor: item.crewColor ?? Colors.green }]}>
                          <Text style={styles.crewText}>{item.crewName}</Text>
                        </View>
                      ) : (
                        <Text style={styles.soloText}>{s.hikerSolo}</Text>
                      )}
                    </View>
                    <Text style={styles.chevron}>›</Text>
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      </Modal>

      <HikerProfileModal
        userId={selectedHiker}
        onClose={() => setSelectedHiker(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.zinc200, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  title: { fontSize: 18, fontWeight: '700', color: Colors.zinc950 },
  closeText: { fontSize: 16, color: Colors.zinc500 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontSize: 15, color: Colors.zinc500, textAlign: 'center', paddingHorizontal: 40 },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  separator: { height: 1, backgroundColor: Colors.zinc100 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 14 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '800', color: Colors.white },
  rowInfo: { flex: 1, gap: 4 },
  rowName: { fontSize: 15, fontWeight: '600', color: Colors.zinc950 },
  crewBadge: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  crewText: { fontSize: 10, fontWeight: '600', color: Colors.white },
  soloText: { fontSize: 12, color: Colors.zinc500 },
  chevron: { fontSize: 22, color: Colors.zinc500 },
});
