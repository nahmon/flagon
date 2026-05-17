import { useEffect, useState, useCallback } from 'react';
import { FlatList, StyleSheet, Text, View, ActivityIndicator, RefreshControl } from 'react-native';
import { Colors } from '../../src/constants';
import { supabase } from '../../src/services/supabase';

interface FeedItem {
  id: string;
  planted_at: string;
  user_id: string;
  summit: { name_ko: string; elevation_m: number } | null;
  crew: { name_ko: string | null; color_hex: string } | null;
}

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return '방금 전';
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

function shortUserId(uid: string): string {
  return `#${uid.slice(0, 6)}`;
}

function avatarColor(uid: string): string {
  const colors = [Colors.green, Colors.crewMe, Colors.crewNK, Colors.orange, Colors.greenLight];
  const idx = uid.charCodeAt(0) % colors.length;
  return colors[idx];
}

async function fetchFeed(): Promise<FeedItem[]> {
  const { data, error } = await supabase
    .from('flags')
    .select('id, planted_at, user_id, summit:summits(name_ko, elevation_m), crew:crews(name_ko, color_hex)')
    .eq('is_active', true)
    .order('planted_at', { ascending: false })
    .limit(40);
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    planted_at: row.planted_at,
    user_id: row.user_id,
    summit: row.summit ?? null,
    crew: row.crew ?? null,
  }));
}

function FeedRow({ item }: { item: FeedItem }) {
  const avatarBg = avatarColor(item.user_id);
  return (
    <View style={styles.row}>
      <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
        <Text style={styles.avatarText}>🏔</Text>
      </View>
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={styles.userName}>산악인 {shortUserId(item.user_id)}</Text>
          <Text style={styles.timeAgo}>{timeAgo(item.planted_at)}</Text>
        </View>
        <Text style={styles.summitLine}>
          <Text style={styles.summitName}>{item.summit?.name_ko ?? '알 수 없는 정상'}</Text>
          {item.summit ? <Text style={styles.elevation}> {item.summit.elevation_m}m</Text> : null}
        </Text>
        {item.crew ? (
          <View style={[styles.crewBadge, { backgroundColor: item.crew.color_hex }]}>
            <Text style={styles.crewText}>{item.crew.name_ko ?? '크루'}</Text>
          </View>
        ) : (
          <View style={[styles.crewBadge, { backgroundColor: Colors.zinc200 }]}>
            <Text style={[styles.crewText, { color: Colors.zinc500 }]}>솔로</Text>
          </View>
        )}
      </View>
      <View style={styles.flagBadge}>
        <Text style={styles.flagEmoji}>🚩</Text>
      </View>
    </View>
  );
}

export default function FeedScreen() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchFeed();
      setItems(data);
    } catch (e) {
      console.error('[feed]', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();

    const channel = supabase
      .channel('feed-flags')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'flags' }, () => {
        load();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.green} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>활동 피드</Text>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <FeedRow item={item} />}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.green} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>아직 피드가 없습니다</Text>
            <Text style={styles.emptyHint}>정상에 깃발을 꽂아 첫 번째 탐험가가 되세요!</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.zinc950,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.zinc200,
  },
  list: { paddingVertical: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 20 },
  rowBody: { flex: 1, gap: 4 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  userName: { fontSize: 14, fontWeight: '600', color: Colors.zinc800 },
  timeAgo: { fontSize: 12, color: Colors.zinc500 },
  summitLine: { fontSize: 15 },
  summitName: { fontWeight: '700', color: Colors.zinc950 },
  elevation: { color: Colors.zinc500 },
  crewBadge: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 2,
  },
  crewText: { fontSize: 11, fontWeight: '600', color: Colors.white },
  flagBadge: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  flagEmoji: { fontSize: 20 },
  separator: { height: 1, backgroundColor: Colors.zinc100 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyText: { fontSize: 17, fontWeight: '600', color: Colors.zinc800 },
  emptyHint: { fontSize: 14, color: Colors.zinc500, textAlign: 'center', paddingHorizontal: 40 },
});
