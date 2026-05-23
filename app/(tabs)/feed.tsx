import { useEffect, useState, useCallback } from 'react';
import { FlatList, StyleSheet, Text, View, ActivityIndicator, RefreshControl } from 'react-native';
import { Colors } from '../../src/constants';
import { supabase } from '../../src/services/supabase';
import { useLang } from '../../src/contexts/LangContext';
import { t, summitName, type Lang } from '../../src/i18n/strings';
import DailyChallengeCard from '../../src/components/DailyChallengeCard';

interface FeedItem {
  id: string;
  planted_at: string;
  user_id: string;
  display_name: string | null;
  summit: { name_ko: string; name_en: string | null; name_ja: string | null; elevation_m: number } | null;
  crew: { name_ko: string | null; color_hex: string } | null;
}

function timeAgo(isoString: string, lang: Lang): string {
  const s = t(lang);
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return s.justNow;
  if (mins < 60) return s.minutesAgo(mins);
  const hours = Math.floor(mins / 60);
  if (hours < 24) return s.hoursAgo(hours);
  return s.daysAgo(Math.floor(hours / 24));
}

function avatarColor(uid: string): string {
  const colors = [Colors.green, Colors.crewMe, Colors.crewNK, Colors.orange, Colors.greenLight];
  return colors[uid.charCodeAt(0) % colors.length];
}

function avatarInitial(name: string | null, uid: string): string {
  if (name && name.length > 0) return name.charAt(0).toUpperCase();
  return uid.charAt(0).toUpperCase();
}

async function fetchFeed(): Promise<FeedItem[]> {
  const { data, error } = await supabase
    .from('flags')
    .select(`
      id,
      planted_at,
      user_id,
      planted_by:users(display_name),
      summit:summits(name_ko, name_en, name_ja, elevation_m),
      crew:crews(name_ko, color_hex)
    `)
    .eq('is_active', true)
    .order('planted_at', { ascending: false })
    .limit(40);
  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: row.id,
    planted_at: row.planted_at,
    user_id: row.user_id,
    display_name: row.planted_by?.display_name ?? null,
    summit: row.summit ?? null,
    crew: row.crew ?? null,
  }));
}

function FeedRow({ item }: { item: FeedItem }) {
  const { lang } = useLang();
  const s = t(lang);
  const avatarBg = avatarColor(item.user_id);
  const name = item.display_name ?? s.hikerLabel(item.user_id.slice(0, 6));
  const initial = avatarInitial(item.display_name, item.user_id);
  const sName = item.summit ? summitName(item.summit, lang) : s.unknownSummit;

  return (
    <View style={styles.row}>
      <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
        <Text style={styles.avatarText}>{initial}</Text>
      </View>
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={styles.userName}>{name}</Text>
          <Text style={styles.timeAgo}>{timeAgo(item.planted_at, lang)}</Text>
        </View>
        <Text style={styles.summitLine}>
          <Text style={styles.summitName}>{sName}</Text>
          {item.summit ? <Text style={styles.elevation}> {item.summit.elevation_m}m</Text> : null}
        </Text>
        {item.crew ? (
          <View style={[styles.crewBadge, { backgroundColor: item.crew.color_hex }]}>
            <Text style={styles.crewText}>{item.crew.name_ko ?? s.crew}</Text>
          </View>
        ) : (
          <View style={[styles.crewBadge, { backgroundColor: Colors.zinc200 }]}>
            <Text style={[styles.crewText, { color: Colors.zinc500 }]}>{s.solo}</Text>
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
  const { lang } = useLang();
  const s = t(lang);
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
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'flags' }, () => load())
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
      <Text style={styles.header}>{s.activityFeed}</Text>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <FeedRow item={item} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={<DailyChallengeCard />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.green} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{s.noFeed}</Text>
            <Text style={styles.emptyHint}>{s.noFeedDesc}</Text>
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
  avatarText: { fontSize: 18, fontWeight: '700', color: Colors.white },
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
