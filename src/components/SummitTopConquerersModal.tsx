import { useEffect, useState } from 'react';
import { Modal, View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors } from '../constants';
import { fetchTopConquerers, type TopConquerer } from '../services/summitLeaderboard';
import { useLang } from '../contexts/LangContext';
import { t } from '../i18n/strings';

const RANK_ICONS = ['🥇', '🥈', '🥉'];

function RankRow({ item, rank }: { item: TopConquerer; rank: number }) {
  const icon = rank < 3 ? RANK_ICONS[rank] : null;
  return (
    <View style={styles.row}>
      <View style={styles.rankBox}>
        {icon ? (
          <Text style={styles.rankIcon}>{icon}</Text>
        ) : (
          <Text style={styles.rankNum}>{rank + 1}</Text>
        )}
      </View>
      <View style={[styles.crewDot, { backgroundColor: item.crewColor ?? Colors.zinc200 }]} />
      <Text style={styles.name} numberOfLines={1}>{item.displayName}</Text>
      <View style={styles.flagPill}>
        <Text style={styles.flagCount}>🚩 {item.flagCount}</Text>
      </View>
    </View>
  );
}

interface Props {
  visible: boolean;
  summitId: string;
  summitName: string;
  onClose: () => void;
}

export default function SummitTopConquerersModal({ visible, summitId, summitName, onClose }: Props) {
  const { lang } = useLang();
  const s = t(lang);
  const [list, setList] = useState<TopConquerer[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible || !summitId) return;
    setLoading(true);
    fetchTopConquerers(summitId)
      .then(setList)
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, [visible, summitId]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>🏆 {s.topConquerersTitle}</Text>
          <Text style={styles.subtitle}>{summitName}</Text>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeTxt}>✕</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color={Colors.green} style={{ marginTop: 48 }} />
        ) : list.length === 0 ? (
          <Text style={styles.empty}>{s.topConquerersEmpty}</Text>
        ) : (
          <FlatList
            data={list}
            keyExtractor={(item) => item.userId}
            contentContainerStyle={styles.list}
            renderItem={({ item, index }) => <RankRow item={item} rank={index} />}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream ?? '#F8F5F0' },
  header: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.zinc100 ?? '#F4F4F5',
  },
  title: { fontSize: 18, fontWeight: '800', color: Colors.zinc800 ?? '#27272A' },
  subtitle: { fontSize: 13, color: Colors.zinc500 ?? '#71717A', marginTop: 2 },
  closeBtn: { position: 'absolute', top: 20, right: 20, padding: 4 },
  closeTxt: { fontSize: 18, color: Colors.zinc500 ?? '#71717A' },
  list: { padding: 16, gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 10,
  },
  rankBox: { width: 32, alignItems: 'center' },
  rankIcon: { fontSize: 22 },
  rankNum: { fontSize: 16, fontWeight: '700', color: Colors.zinc500 ?? '#71717A' },
  crewDot: { width: 10, height: 10, borderRadius: 5 },
  name: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.zinc800 ?? '#27272A' },
  flagPill: {
    backgroundColor: Colors.zinc100 ?? '#F4F4F5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  flagCount: { fontSize: 13, fontWeight: '700', color: Colors.zinc700 ?? '#3F3F46' },
  empty: { textAlign: 'center', color: Colors.zinc500 ?? '#71717A', marginTop: 48, fontSize: 15 },
});
