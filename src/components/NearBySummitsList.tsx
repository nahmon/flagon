import { useMemo, useState } from 'react';
import {
  Modal, View, Text, FlatList, TouchableOpacity, StyleSheet,
} from 'react-native';
import { Colors } from '../constants';
import { SummitWithFlag } from '../types';
import { distanceMeters } from '../services/gps';
import { useLang } from '../contexts/LangContext';
import { t, summitName } from '../i18n/strings';

type SortKey = 'distance' | 'elevation';

interface Props {
  visible: boolean;
  onClose: () => void;
  summits: SummitWithFlag[];
  userLat?: number;
  userLng?: number;
  onSelectSummit: (summit: SummitWithFlag) => void;
}

function formatDist(m: number): string {
  if (!isFinite(m)) return '—';
  if (m < 1000) return `${Math.round(m)}m`;
  return `${(m / 1000).toFixed(1)}km`;
}

export default function NearBySummitsList({
  visible, onClose, summits, userLat, userLng, onSelectSummit,
}: Props) {
  const { lang } = useLang();
  const s = t(lang);
  const [sort, setSort] = useState<SortKey>('distance');

  const sorted = useMemo(() => {
    const withDist = summits.map((summit) => {
      const [slng, slat] = summit.location.coordinates;
      const dist = userLat != null && userLng != null
        ? distanceMeters(userLat, userLng, slat, slng)
        : Infinity;
      return { summit, dist };
    });
    if (sort === 'distance') return withDist.sort((a, b) => a.dist - b.dist);
    return withDist.sort((a, b) => b.summit.elevation_m - a.summit.elevation_m);
  }, [summits, userLat, userLng, sort]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={styles.title}>{s.nearbySummits}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sortRow}>
          {(['distance', 'elevation'] as SortKey[]).map((key) => (
            <TouchableOpacity
              key={key}
              style={[styles.chip, sort === key && styles.chipActive]}
              onPress={() => setSort(key)}
            >
              <Text style={[styles.chipText, sort === key && styles.chipTextActive]}>
                {key === 'distance' ? s.sortNearest : s.sortHighest}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <FlatList
          data={sorted}
          keyExtractor={(item: { summit: SummitWithFlag; dist: number }) => item.summit.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          renderItem={({ item }: { item: { summit: SummitWithFlag; dist: number } }) => {
            const { summit, dist } = item;
            const hasFlag = !!summit.active_flag;
            const flagColor = summit.active_flag?.crew?.color_hex ?? Colors.orange;
            return (
              <TouchableOpacity
                style={styles.row}
                onPress={() => { onSelectSummit(summit); onClose(); }}
                activeOpacity={0.7}
              >
                <View style={styles.rowLeft}>
                  <Text style={styles.rowName} numberOfLines={1}>
                    {summitName(summit, lang)}
                  </Text>
                  <Text style={styles.rowSub}>
                    {summit.elevation_m}m · {formatDist(dist)}
                    {summit.mountain_group ? ` · ${summit.mountain_group}` : ''}
                  </Text>
                </View>
                <View style={styles.rowRight}>
                  {hasFlag && (
                    <View style={[styles.flagDot, { backgroundColor: flagColor }]} />
                  )}
                  <Text style={styles.chevron}>›</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.zinc200,
    alignSelf: 'center', marginTop: 12,
  },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8,
  },
  title: { flex: 1, fontSize: 20, fontWeight: '700', color: Colors.zinc950 },
  closeBtn: { padding: 4 },
  closeText: { fontSize: 16, color: Colors.zinc500 },

  sortRow: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: 20, paddingBottom: 12,
  },
  chip: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, backgroundColor: Colors.zinc100,
  },
  chipActive: { backgroundColor: Colors.green },
  chipText: { fontSize: 13, fontWeight: '600', color: Colors.zinc500 },
  chipTextActive: { color: Colors.white },

  list: { paddingHorizontal: 20, paddingBottom: 32 },
  sep: { height: 1, backgroundColor: Colors.zinc100 },

  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, gap: 12,
  },
  rowLeft: { flex: 1 },
  rowName: { fontSize: 15, fontWeight: '600', color: Colors.zinc950 },
  rowSub: { fontSize: 12, color: Colors.zinc500, marginTop: 2 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  flagDot: { width: 10, height: 10, borderRadius: 5 },
  chevron: { fontSize: 20, color: Colors.zinc200, fontWeight: '700' },
});
