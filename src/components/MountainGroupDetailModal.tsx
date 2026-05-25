import { useEffect, useState } from 'react';
import {
  Modal, View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, ListRenderItemInfo,
} from 'react-native';
import { Colors } from '../constants';
import { fetchGroupSummits, GroupSummit } from '../services/mountainGroups';
import { useLang } from '../contexts/LangContext';
import { t, summitName } from '../i18n/strings';

interface Props {
  group: string | null;
  userId: string;
  onClose: () => void;
}

function SummitRow({ item, lang }: { item: GroupSummit; lang: 'ko' | 'en' | 'ja' }) {
  const s = t(lang);
  return (
    <View style={[styles.row, item.conquered && styles.rowConquered]}>
      <View style={styles.rowLeft}>
        <Text style={[styles.summitName, item.conquered && styles.summitNameConquered]} numberOfLines={1}>
          {summitName(item, lang)}
        </Text>
        <Text style={styles.elevation}>{item.elevation_m.toLocaleString()}m</Text>
      </View>
      <View style={[styles.badge, item.conquered ? styles.badgeConquered : styles.badgePending]}>
        <Text style={[styles.badgeText, item.conquered ? styles.badgeTextConquered : styles.badgeTextPending]}>
          {item.conquered ? s.groupDetailConquered : s.groupDetailPending}
        </Text>
      </View>
    </View>
  );
}

export default function MountainGroupDetailModal({ group, userId, onClose }: Props) {
  const { lang } = useLang();
  const s = t(lang);
  const [summits, setSummits] = useState<GroupSummit[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!group) return;
    setLoading(true);
    setSummits([]);
    fetchGroupSummits(group, userId)
      .then(setSummits)
      .catch(() => setSummits([]))
      .finally(() => setLoading(false));
  }, [group, userId]);

  const conquered = summits.filter((s) => s.conquered).length;
  const total = summits.length;

  return (
    <Modal visible={!!group} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.handle} />
          <Text style={styles.title} numberOfLines={2}>{group ?? ''}</Text>
          {!loading && total > 0 && (
            <Text style={styles.progress}>
              {s.mountainGroupProgress(conquered, total)}
            </Text>
          )}
        </View>

        {loading ? (
          <ActivityIndicator color={Colors.green} style={styles.loader} />
        ) : summits.length === 0 ? (
          <Text style={styles.empty}>{s.groupDetailEmpty}</Text>
        ) : (
          <FlatList
            data={summits}
            keyExtractor={(item) => item.id}
            renderItem={({ item }: ListRenderItemInfo<GroupSummit>) => (
              <SummitRow item={item} lang={lang} />
            )}
            contentContainerStyle={styles.list}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}

        <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
          <Text style={styles.closeBtnText}>{s.close}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.zinc200,
    alignItems: 'center',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.zinc200,
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.zinc950,
    textAlign: 'center',
  },
  progress: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.green,
    marginTop: 4,
  },
  loader: { marginTop: 40 },
  empty: {
    fontSize: 15,
    color: Colors.zinc500,
    textAlign: 'center',
    marginTop: 40,
  },
  list: {
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
  },
  rowConquered: {
    backgroundColor: '#EAF4EE',
  },
  rowLeft: {
    flex: 1,
    marginRight: 10,
  },
  summitName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.zinc950,
  },
  summitNameConquered: {
    color: Colors.greenDark,
  },
  elevation: {
    fontSize: 12,
    color: Colors.zinc500,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeConquered: {
    backgroundColor: Colors.green,
  },
  badgePending: {
    backgroundColor: Colors.zinc100,
    borderWidth: 1,
    borderColor: Colors.zinc200,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  badgeTextConquered: {
    color: Colors.white,
  },
  badgeTextPending: {
    color: Colors.zinc500,
  },
  separator: {
    height: 8,
  },
  closeBtn: {
    margin: 16,
    backgroundColor: Colors.zinc950,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
});
