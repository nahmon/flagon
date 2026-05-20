import { useEffect, useState } from 'react';
import {
  Modal, View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { Colors } from '../constants';
import { SummitWithFlag } from '../types';
import { fetchSummitFlagHistory, FlagHistoryEntry } from '../services/flags';
import WeatherCard from './WeatherCard';

function relativeTime(dateStr: string): string {
  const diffH = Math.floor((Date.now() - new Date(dateStr).getTime()) / 3_600_000);
  if (diffH < 1) return '방금 전';
  if (diffH < 24) return `${diffH}시간 전`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30) return `${diffD}일 전`;
  return `${Math.floor(diffD / 30)}개월 전`;
}

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
}

interface Props {
  summit: SummitWithFlag | null;
  onClose: () => void;
}

export default function SummitDetailSheet({ summit, onClose }: Props) {
  const [history, setHistory] = useState<FlagHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!summit) { setHistory([]); return; }
    setLoading(true);
    fetchSummitFlagHistory(summit.id)
      .then(setHistory)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [summit?.id]);

  const flag = summit?.active_flag;
  const expiryDays = flag?.expires_at ? daysUntil(flag.expires_at) : null;

  return (
    <Modal
      visible={!!summit}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.handle} />

        <View style={styles.header}>
          <View style={styles.headerInfo}>
            <Text style={styles.summitName}>{summit?.name_ko ?? ''}</Text>
            {summit?.name_en ? <Text style={styles.summitNameEn}>{summit.name_en}</Text> : null}
            <View style={styles.metaRow}>
              <View style={styles.elevBadge}>
                <Text style={styles.elevText}>{summit?.elevation_m}m</Text>
              </View>
              {summit?.mountain_group ? (
                <Text style={styles.mountainGroup}>{summit.mountain_group}</Text>
              ) : null}
            </View>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {summit ? <WeatherCard summit={summit} /> : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>현재 깃발</Text>
          {flag?.crew ? (
            <View style={styles.flagCard}>
              <View style={[styles.crewDot, { backgroundColor: flag.crew.color_hex }]} />
              <View style={styles.flagInfo}>
                <Text style={styles.crewName}>{flag.crew.name_ko ?? flag.crew.name}</Text>
                <Text style={styles.flagMeta}>
                  {relativeTime(flag.planted_at)}
                  {expiryDays !== null ? ` · ${expiryDays}일 후 만료` : ''}
                </Text>
              </View>
              <Text style={styles.flagIcon}>🚩</Text>
            </View>
          ) : (
            <View style={styles.noFlagCard}>
              <Text style={styles.noFlagText}>무주공산 — 아직 깃발이 없습니다</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>깃발 기록</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={Colors.green} style={styles.loader} />
        ) : (
          <FlatList
            data={history}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.historyList}
            renderItem={({ item }) => (
              <View style={styles.historyRow}>
                <View style={[styles.historyDot, { backgroundColor: item.crew_color_hex ?? Colors.zinc200 }]} />
                <View style={styles.historyBody}>
                  <Text style={styles.historyUser}>{item.user_display_name}</Text>
                  <Text style={styles.historyCrew}>{item.crew_name_ko ?? item.crew_name ?? '크루 없음'}</Text>
                </View>
                <View style={styles.historyRight}>
                  <Text style={styles.historyTime}>{relativeTime(item.planted_at)}</Text>
                  {item.is_active && (
                    <View style={styles.activePill}>
                      <Text style={styles.activePillText}>현재</Text>
                    </View>
                  )}
                </View>
              </View>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={<Text style={styles.emptyText}>깃발 기록이 없습니다</Text>}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  handle: { width: 36, height: 4, backgroundColor: Colors.zinc200, borderRadius: 2, alignSelf: 'center', marginVertical: 12 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16 },
  headerInfo: { flex: 1, marginRight: 12 },
  summitName: { fontSize: 24, fontWeight: '800', color: Colors.zinc950, letterSpacing: -0.5 },
  summitNameEn: { fontSize: 14, color: Colors.zinc500, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  elevBadge: { backgroundColor: Colors.green, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  elevText: { fontSize: 13, fontWeight: '700', color: Colors.white },
  mountainGroup: { fontSize: 13, color: Colors.zinc500 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.zinc100, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 12, color: Colors.zinc800, fontWeight: '700' },
  section: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: Colors.zinc500, letterSpacing: 0.9, textTransform: 'uppercase' },
  flagCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: 14, padding: 14, marginTop: 10, gap: 12 },
  crewDot: { width: 16, height: 16, borderRadius: 8 },
  flagInfo: { flex: 1 },
  crewName: { fontSize: 15, fontWeight: '600', color: Colors.zinc950 },
  flagMeta: { fontSize: 12, color: Colors.zinc500, marginTop: 2 },
  flagIcon: { fontSize: 20 },
  noFlagCard: { backgroundColor: Colors.zinc100, borderRadius: 14, padding: 14, marginTop: 10 },
  noFlagText: { fontSize: 14, color: Colors.zinc500 },
  loader: { marginTop: 24 },
  historyList: { paddingHorizontal: 20, paddingBottom: 48 },
  historyRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, gap: 12 },
  historyDot: { width: 12, height: 12, borderRadius: 6 },
  historyBody: { flex: 1 },
  historyUser: { fontSize: 14, fontWeight: '600', color: Colors.zinc950 },
  historyCrew: { fontSize: 12, color: Colors.zinc500, marginTop: 1 },
  historyRight: { alignItems: 'flex-end', gap: 4 },
  historyTime: { fontSize: 12, color: Colors.zinc500 },
  activePill: { backgroundColor: Colors.green, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  activePillText: { fontSize: 10, fontWeight: '700', color: Colors.white },
  separator: { height: 6 },
  emptyText: { textAlign: 'center', color: Colors.zinc500, fontSize: 14, marginTop: 24 },
});
