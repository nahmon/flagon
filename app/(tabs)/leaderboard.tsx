import { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl, SafeAreaView } from 'react-native';
import { Colors } from '../../src/constants';
import { fetchLeaderboard } from '../../src/services/crews';
import { supabase } from '../../src/services/supabase';
import { CrewLeaderboardEntry } from '../../src/types';

const RANK_COLORS = ['#D4B060', '#A0A8B0', '#C07840'];

function CrewCircle({ name, color }: { name: string; color: string }) {
  return (
    <View style={[styles.crewCircle, { backgroundColor: color }]}>
      <Text style={styles.crewInitial}>{(name ?? '?').charAt(0).toUpperCase()}</Text>
    </View>
  );
}

function RankNum({ rank }: { rank: number }) {
  const color = rank <= 3 ? RANK_COLORS[rank - 1] : Colors.zinc500;
  return <Text style={[styles.rankNum, { color }]}>{rank}</Text>;
}

function CrewRow({ entry, rank }: { entry: CrewLeaderboardEntry; rank: number }) {
  const crewName = entry.name ?? entry.name_ko ?? '—';
  const ago = entry.last_flag_at
    ? Math.floor((Date.now() - new Date(entry.last_flag_at).getTime()) / 3_600_000)
    : null;

  return (
    <View style={styles.row}>
      <View style={styles.rankCell}>
        <RankNum rank={rank} />
      </View>
      <CrewCircle name={crewName} color={entry.color_hex} />
      <View style={styles.rowBody}>
        <Text style={styles.crewName}>{crewName}</Text>
        <Text style={styles.rowSub}>
          {ago === null ? 'No flags yet' : ago < 1 ? 'Just now' : `${ago}h ago`}
        </Text>
      </View>
      <View style={styles.flagCell}>
        <Text style={styles.flagCount}>{entry.flag_count}</Text>
        <Text style={styles.flagLabel}>flags</Text>
      </View>
    </View>
  );
}

function HeroCard({ top }: { top: CrewLeaderboardEntry }) {
  const name = top.name ?? top.name_ko ?? '—';
  return (
    <View style={styles.heroCard}>
      <View style={styles.heroLeft}>
        <Text style={styles.heroLabel}>Top crew</Text>
        <Text style={styles.heroName}>{name}</Text>
      </View>
      <View style={styles.heroRight}>
        <Text style={styles.heroCount}>{top.flag_count}</Text>
        <Text style={styles.heroFlagLabel}>flags</Text>
      </View>
    </View>
  );
}

export default function LeaderboardScreen() {
  const [entries, setEntries] = useState<CrewLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
      <SafeAreaView style={styles.safeHeader}>
        <View style={styles.header}>
          <Text style={styles.title}>Leaderboard</Text>
          <Text style={styles.subtitle}>Ranked by active flags</Text>
        </View>
        {entries.length > 0 && <HeroCard top={entries[0]} />}
      </SafeAreaView>
      <FlatList
        data={entries}
        keyExtractor={(e) => e.id}
        renderItem={({ item, index }) => <CrewRow entry={item} rank={index + 1} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={Colors.green} />
        }
        ListEmptyComponent={
          <View style={styles.center}><Text style={styles.empty}>No flags yet — be first!</Text></View>
        }
        contentContainerStyle={entries.length === 0 ? { flex: 1 } : { paddingBottom: 32 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  safeHeader: { backgroundColor: Colors.white },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: { fontSize: 26, fontWeight: '800', color: '#1F2421', letterSpacing: -0.6 },
  subtitle: { fontSize: 13, color: Colors.zinc500, marginTop: 2 },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.green,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  heroLeft: { flex: 1 },
  heroLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  heroName: { fontSize: 20, fontWeight: '800', color: Colors.white, letterSpacing: -0.4, marginTop: 2 },
  heroRight: { alignItems: 'flex-end' },
  heroCount: { fontSize: 36, fontWeight: '800', color: Colors.white, letterSpacing: -1 },
  heroFlagLabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    gap: 12,
  },
  rankCell: { width: 28, alignItems: 'center' },
  rankNum: { fontSize: 16, fontWeight: '700' },
  crewCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  crewInitial: { fontSize: 17, fontWeight: '700', color: Colors.white },
  rowBody: { flex: 1 },
  crewName: { fontSize: 15, fontWeight: '600', color: '#1F2421' },
  rowSub: { fontSize: 12, color: Colors.zinc500, marginTop: 1 },
  flagCell: { alignItems: 'flex-end' },
  flagCount: { fontSize: 20, fontWeight: '800', color: Colors.green, letterSpacing: -0.5 },
  flagLabel: { fontSize: 11, color: Colors.zinc500 },
  separator: { height: 1, backgroundColor: Colors.zinc100 },
  empty: { fontSize: 15, color: Colors.zinc500 },
});
