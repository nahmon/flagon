import { useState, useEffect } from 'react';
import {
  Modal, View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { Colors } from '../constants';
import { useLang } from '../contexts/LangContext';
import { t } from '../i18n/strings';
import {
  fetchSeasonalStickers, SEASONS, SEASON_META,
  type SummitSeasonEntry,
} from '../services/seasonalStickers';
import { supabase } from '../services/supabase';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function SeasonalStickerModal({ visible, onClose }: Props) {
  const { lang } = useLang();
  const s = t(lang);
  const [entries, setEntries] = useState<SummitSeasonEntry[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      try {
        const result = await fetchSeasonalStickers(user.id);
        setEntries(result.entries);
        setCompletedCount(result.completedCount);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [visible]);

  const renderItem = ({ item }: { item: SummitSeasonEntry }) => {
    const name =
      lang === 'en' ? (item.summitName_en ?? item.summitName_ko)
      : lang === 'ja' ? (item.summitName_ja ?? item.summitName_ko)
      : item.summitName_ko;
    return (
      <View style={[styles.row, item.complete && styles.rowComplete]}>
        <View style={styles.rowInfo}>
          <Text style={styles.summitName} numberOfLines={1}>{name}</Text>
          <Text style={styles.elevation}>{item.elevation_m.toLocaleString()}m</Text>
        </View>
        <View style={styles.seasonDots}>
          {SEASONS.map((season) => (
            <Text
              key={season}
              style={[styles.dot, !item.seasons.has(season) && styles.dotMissing]}
            >
              {SEASON_META[season].icon}
            </Text>
          ))}
          {item.complete && <Text style={styles.checkmark}>✓</Text>}
        </View>
      </View>
    );
  };

  const seasonLabel = (season: typeof SEASONS[number]) =>
    lang === 'en' ? SEASON_META[season].label_en
    : lang === 'ja' ? SEASON_META[season].label_ja
    : SEASON_META[season].label_ko;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{s.seasonalStickersTitle}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.legend}>
          {SEASONS.map((season) => (
            <View key={season} style={styles.legendItem}>
              <Text style={styles.legendIcon}>{SEASON_META[season].icon}</Text>
              <Text style={styles.legendLabel}>{seasonLabel(season)}</Text>
            </View>
          ))}
        </View>

        {!loading && entries.length > 0 && (
          <View style={styles.summaryBar}>
            <Text style={styles.summaryText}>
              {s.seasonalStickersSub(completedCount, entries.length)}
            </Text>
          </View>
        )}

        {loading ? (
          <ActivityIndicator style={styles.loader} color={Colors.green} size="large" />
        ) : entries.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🌸</Text>
            <Text style={styles.emptyTitle}>{s.seasonalStickersEmpty}</Text>
            <Text style={styles.emptyDesc}>{s.seasonalStickersEmptyDesc}</Text>
          </View>
        ) : (
          <FlatList<SummitSeasonEntry>
            data={entries}
            keyExtractor={(item: SummitSeasonEntry) => item.summitId}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  header: {
    backgroundColor: Colors.green,
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: { flex: 1, color: Colors.white, fontSize: 18, fontWeight: '700' },
  closeBtn: { padding: 8 },
  closeText: { color: Colors.white, fontSize: 20, fontWeight: '600' },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.zinc200,
  },
  legendItem: { alignItems: 'center', gap: 2 },
  legendIcon: { fontSize: 20 },
  legendLabel: { fontSize: 10, color: Colors.zinc500 },
  summaryBar: {
    backgroundColor: Colors.greenDark,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  summaryText: { color: Colors.white, fontSize: 13, fontWeight: '600' },
  loader: { marginTop: 60 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Colors.zinc800, textAlign: 'center', marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: Colors.zinc500, textAlign: 'center' },
  list: { padding: 12 },
  row: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    marginBottom: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.zinc200,
  },
  rowComplete: { borderColor: Colors.green, backgroundColor: '#F0FBF5' },
  rowInfo: { flex: 1, marginRight: 8 },
  summitName: { fontSize: 14, fontWeight: '600', color: Colors.zinc800 },
  elevation: { fontSize: 12, color: Colors.zinc500, marginTop: 2 },
  seasonDots: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { fontSize: 18 },
  dotMissing: { opacity: 0.2 },
  checkmark: { fontSize: 14, color: Colors.green, fontWeight: '700', marginLeft: 4 },
});
