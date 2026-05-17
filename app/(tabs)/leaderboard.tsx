import { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { Colors } from '../../src/constants';
import { fetchLeaderboard } from '../../src/services/crews';
import { supabase } from '../../src/services/supabase';
import { CrewLeaderboardEntry } from '../../src/types';
import CrewDetailModal from '../../src/components/CrewDetailModal';

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <Text style={styles.medal}>🥇</Text>;
  if (rank === 2) return <Text style={styles.medal}>🥈</Text>;
  if (rank === 3) return <Text style={styles.medal}>🥉</Text>;
  return <Text style={styles.rankNum}>{rank}</Text>;
}

function CrewRow({ entry, rank, onPress }: { entry: CrewLeaderboardEntry; rank: number; onPress: () => void }) {
  const ago = entry.last_flag_at
    ? Math.floor((Date.now() - new Date(entry.last_flag_at).getTime()) / 3_600_000)
    : null;

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.rankCell}>
        <RankBadge rank={rank} />
      </View>
      <View style={[styles.colorDot, { backgroundColor: entry.color_hex }]} />
      <View style={styles.rowBody}>
        <Text style={styles.crewName}>{entry.name_ko ?? entry.name}</Text>
        <Text style={styles.rowSub}>
          {ago === null ? '깃발 없음' : ago < 1 ? '방금' : `${ago}시간 전`}
        </Text>
      </View>
      <View style={styles.flagCell}>
        <Text style={styles.flagCount}>{entry.flag_count}</Text>
        <Text style={styles.flagLabel}>깃발</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

export default function LeaderboardScreen() {
  const [entries, setEntries] = useState<CrewLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCrew, setSelectedCrew] = useState<CrewLeaderboardEntry | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const data = await fetchLeaderboard();
      setEntries(data);
    } catch (e) {
      console.error('[leaderboard]', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel('leaderboard-flags')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'flags' }, () => { load(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={Colors.green} /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>크루 랭킹</Text>
        <Text style={styles.subtitle}>현재 활성화된 깃발 수 기준</Text>
      </View>
      <FlatList
        data={entries}
        keyExtractor={(e) => e.id}
        renderItem={({ item, index }) => (
          <CrewRow entry={item} rank={index + 1} onPress={() => setSelectedCrew(item)} />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={Colors.green} />
        }
        ListEmptyComponent={
          <View style={styles.center}><Text style={styles.empty}>아직 깃발이 없습니다</Text></View>
        }
        contentContainerStyle={entries.length === 0 ? { flex: 1 } : { paddingBottom: 32 }}
      />
      <CrewDetailModal crew={selectedCrew} onClose={() => setSelectedCrew(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.zinc200,
  },
  title: { fontSize: 22, fontWeight: '700', color: Colors.zinc950 },
  subtitle: { fontSize: 13, color: Colors.zinc500, marginTop: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: Colors.white,
  },
  rankCell: { width: 36, alignItems: 'center' },
  rankNum: { fontSize: 16, fontWeight: '700', color: Colors.zinc500 },
  medal: { fontSize: 22 },
  colorDot: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  rowBody: { flex: 1 },
  crewName: { fontSize: 16, fontWeight: '600', color: Colors.zinc950 },
  rowSub: { fontSize: 12, color: Colors.zinc500, marginTop: 2 },
  flagCell: { alignItems: 'flex-end' },
  flagCount: { fontSize: 20, fontWeight: '700', color: Colors.green },
  flagLabel: { fontSize: 11, color: Colors.zinc500 },
  separator: { height: 1, backgroundColor: Colors.zinc100 },
  empty: { fontSize: 15, color: Colors.zinc500 },
  chevron: { fontSize: 20, color: Colors.zinc200, marginLeft: 8 },
});
