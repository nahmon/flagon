import React, { useEffect, useState } from 'react';
import { View, Text, Modal, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Colors } from '../constants';
import { fetchRivalStats, StolenFromMe, IStoledFrom, RivalStats } from '../services/rivals';
import { useLang } from '../contexts/LangContext';
import { t } from '../i18n/strings';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return '오늘';
  if (days === 1) return '1일 전';
  if (days < 30) return `${days}일 전`;
  const months = Math.floor(days / 30);
  return `${months}개월 전`;
}

function timeAgoEn(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return 'today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function timeAgoJa(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return '今日';
  if (days === 1) return '1日前';
  if (days < 30) return `${days}日前`;
  const months = Math.floor(days / 30);
  return `${months}ヶ月前`;
}

export default function RivalsModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { lang } = useLang();
  const s = t(lang);
  const [tab, setTab] = useState<'stolen' | 'stole'>('stolen');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<RivalStats | null>(null);

  const ago = lang === 'ja' ? timeAgoJa : lang === 'en' ? timeAgoEn : timeAgo;

  useEffect(() => {
    if (visible) {
      setLoading(true);
      fetchRivalStats().then(setStats).finally(() => setLoading(false));
    }
  }, [visible]);

  function summitLabel(row: { summit_name_ko: string; summit_name_en: string | null; elevation_m: number }) {
    const name = lang === 'en' && row.summit_name_en ? row.summit_name_en : row.summit_name_ko;
    return `${name}  ${row.elevation_m}m`;
  }

  const renderStolen = ({ item }: { item: StolenFromMe }) => (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <Text style={styles.summitName}>{summitLabel(item)}</Text>
        <Text style={styles.rivalName}>{s.stolenBy(item.thief_name)}</Text>
      </View>
      <Text style={styles.timeText}>{ago(item.stolen_at)}</Text>
    </View>
  );

  const renderStole = ({ item }: { item: IStoledFrom }) => (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <Text style={styles.summitName}>{summitLabel(item)}</Text>
        <Text style={styles.rivalNameGreen}>{s.iStole(item.victim_name)}</Text>
      </View>
      <Text style={styles.timeText}>{ago(item.my_planted_at)}</Text>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.handle} />
        <Text style={styles.title}>{s.rivals}</Text>

        {stats && stats.topRivals.length > 0 && (
          <View style={styles.rivalsCard}>
            <Text style={styles.rivalsCardLabel}>{s.topRivals}</Text>
            <View style={styles.rivalsRow}>
              {stats.topRivals.map((r: { name: string; count: number }) => (
                <View key={r.name} style={styles.rivalChip}>
                  <Text style={styles.rivalChipName}>{r.name}</Text>
                  <Text style={styles.rivalChipCount}>{r.count}×</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, tab === 'stolen' && styles.tabActive]}
            onPress={() => setTab('stolen')}
          >
            <Text style={[styles.tabText, tab === 'stolen' && styles.tabTextActive]}>
              {s.stolenFromMe}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'stole' && styles.tabActive]}
            onPress={() => setTab('stole')}
          >
            <Text style={[styles.tabText, tab === 'stole' && styles.tabTextActive]}>
              {s.iStoleFrom}
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color={Colors.green} style={styles.loader} />
        ) : tab === 'stolen' ? (
          <FlatList
            data={stats?.stolenFromMe ?? []}
            keyExtractor={(_: unknown, i: number) => String(i)}
            renderItem={renderStolen}
            ListEmptyComponent={<Text style={styles.empty}>{s.noStolen}</Text>}
            contentContainerStyle={styles.list}
          />
        ) : (
          <FlatList
            data={stats?.iStoleFrom ?? []}
            keyExtractor={(_: unknown, i: number) => String(i)}
            renderItem={renderStole}
            ListEmptyComponent={<Text style={styles.empty}>{s.noSteals}</Text>}
            contentContainerStyle={styles.list}
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
  container: { flex: 1, backgroundColor: Colors.cream, paddingTop: 12 },
  handle: { width: 36, height: 4, backgroundColor: Colors.zinc200, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  title: { fontSize: 20, fontWeight: '700', color: Colors.zinc950, paddingHorizontal: 20, marginBottom: 16 },
  rivalsCard: { marginHorizontal: 20, marginBottom: 12, backgroundColor: Colors.white, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.zinc100 },
  rivalsCardLabel: { fontSize: 11, fontWeight: '700', color: Colors.zinc500, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 },
  rivalsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rivalChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.zinc100, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, gap: 6 },
  rivalChipName: { fontSize: 13, fontWeight: '600', color: Colors.zinc950 },
  rivalChipCount: { fontSize: 13, fontWeight: '700', color: Colors.orange },
  tabs: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 12, backgroundColor: Colors.zinc100, borderRadius: 10, padding: 3 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: Colors.white },
  tabText: { fontSize: 14, color: Colors.zinc500, fontWeight: '500' },
  tabTextActive: { color: Colors.zinc950, fontWeight: '600' },
  list: { paddingHorizontal: 20, paddingBottom: 16 },
  loader: { marginTop: 40 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: 12, padding: 14, marginBottom: 8 },
  rowLeft: { flex: 1 },
  summitName: { fontSize: 15, fontWeight: '600', color: Colors.zinc950 },
  rivalName: { fontSize: 13, color: Colors.orange, marginTop: 2 },
  rivalNameGreen: { fontSize: 13, color: Colors.green, marginTop: 2 },
  timeText: { fontSize: 12, color: Colors.zinc500, marginLeft: 8 },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 15, color: Colors.zinc500 },
  closeBtn: { marginHorizontal: 20, marginTop: 8, marginBottom: 40, paddingVertical: 14, backgroundColor: Colors.zinc100, borderRadius: 12, alignItems: 'center' },
  closeBtnText: { fontSize: 15, color: Colors.zinc500 },
});
