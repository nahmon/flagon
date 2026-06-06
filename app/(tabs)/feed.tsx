import { useEffect, useState, useCallback } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator, RefreshControl } from 'react-native';
import { Colors } from '../../src/constants';
import { supabase } from '../../src/services/supabase';
import { getUserCrewId } from '../../src/services/flags';
import { useLang } from '../../src/contexts/LangContext';
import { t } from '../../src/i18n/strings';
import DailyChallengeCard from '../../src/components/DailyChallengeCard';
import FlagExpiryCard from '../../src/components/FlagExpiryCard';
import HikerProfileModal from '../../src/components/HikerProfileModal';
import FeedRow, { type FeedItem } from '../../src/components/FeedRow';
import PhotoWallGrid from '../../src/components/PhotoWallGrid';
import LiveHikeSection from '../../src/components/LiveHikeSection';
import UpcomingGroupHikesSection from '../../src/components/UpcomingGroupHikesSection';

type FeedFilter = 'all' | 'following' | 'crew' | 'photos';

interface UserCtx { id: string; crewId: string | null; followingIds: string[] }

const BASE_SELECT = `id, planted_at, user_id,
  planted_by:users(display_name),
  summit:summits(name_ko, name_en, name_ja, elevation_m),
  crew:crews(name_ko, color_hex)`;

function toFeedItem(row: Record<string, unknown>): FeedItem {
  const pb = row.planted_by as { display_name?: string | null } | null;
  return {
    id: row.id as string,
    planted_at: row.planted_at as string,
    user_id: row.user_id as string,
    display_name: pb?.display_name ?? null,
    summit: row.summit as FeedItem['summit'],
    crew: row.crew as FeedItem['crew'],
  };
}

async function fetchFeed(filter: FeedFilter, ctx: UserCtx | null): Promise<FeedItem[]> {
  if (filter === 'following') {
    if (!ctx || ctx.followingIds.length === 0) return [];
    const { data, error } = await supabase.from('flags')
      .select(BASE_SELECT)
      .eq('is_active', true)
      .in('user_id', ctx.followingIds)
      .order('planted_at', { ascending: false })
      .limit(40);
    if (error) throw error;
    return (data ?? []).map((r: Record<string, unknown>) => toFeedItem(r));
  }
  if (filter === 'crew') {
    if (!ctx?.crewId) return [];
    const { data, error } = await supabase.from('flags')
      .select(BASE_SELECT)
      .eq('is_active', true)
      .eq('crew_id', ctx.crewId)
      .order('planted_at', { ascending: false })
      .limit(40);
    if (error) throw error;
    return (data ?? []).map((r: Record<string, unknown>) => toFeedItem(r));
  }
  const { data, error } = await supabase.from('flags')
    .select(BASE_SELECT)
    .eq('is_active', true)
    .order('planted_at', { ascending: false })
    .limit(40);
  if (error) throw error;
  return (data ?? []).map((r: Record<string, unknown>) => toFeedItem(r));
}

async function loadUserCtx(): Promise<UserCtx | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const [crewId, followData] = await Promise.all([
    getUserCrewId(),
    supabase.from('user_follows').select('followee_id').eq('follower_id', user.id),
  ]);
  const followingIds = ((followData.data ?? []) as { followee_id: string }[]).map((f) => f.followee_id);
  return { id: user.id, crewId, followingIds };
}

export default function FeedScreen() {
  const { lang } = useLang();
  const s = t(lang);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedHiker, setSelectedHiker] = useState<string | null>(null);
  const [filter, setFilter] = useState<FeedFilter>('all');
  const [userCtx, setUserCtx] = useState<UserCtx | null>(null);

  useEffect(() => {
    loadUserCtx().then(setUserCtx).catch(() => setUserCtx(null));
  }, []);

  const load = useCallback(async () => {
    if (filter === 'photos') { setLoading(false); setRefreshing(false); return; }
    try {
      const data = await fetchFeed(filter, userCtx);
      setItems(data);
    } catch (e) {
      console.error('[feed]', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter, userCtx]);

  useEffect(() => {
    setLoading(true);
    load();
    if (filter !== 'all') return;
    const ch = supabase.channel('feed-flags')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'flags' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load, filter]);

  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, [load]);

  const FILTERS: { key: FeedFilter; label: string }[] = [
    { key: 'all', label: s.feedAll },
    { key: 'following', label: s.feedFollowing },
    { key: 'crew', label: s.feedCrew },
    { key: 'photos', label: s.feedPhotos },
  ];

  const emptyText = filter === 'following' ? s.feedEmptyFollowing
    : filter === 'crew' ? s.feedEmptyCrew
    : s.noFeed;

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.header}>{s.activityFeed}</Text>
        <View style={styles.filterRow}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.pill, filter === f.key && styles.pillActive]}
              onPress={() => setFilter(f.key)}
              activeOpacity={0.75}
            >
              <Text style={[styles.pillLabel, filter === f.key && styles.pillLabelActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {filter === 'photos' ? (
        <PhotoWallGrid onAvatarPress={setSelectedHiker} />
      ) : loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={Colors.green} /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item: FeedItem) => item.id}
          renderItem={({ item }: { item: FeedItem }) => (
            <FeedRow item={item} onAvatarPress={setSelectedHiker} />
          )}
          contentContainerStyle={styles.list}
          ListHeaderComponent={filter === 'all' ? (
            <>
              <FlagExpiryCard />
              <LiveHikeSection onAvatarPress={setSelectedHiker} />
              <UpcomingGroupHikesSection />
              <DailyChallengeCard />
            </>
          ) : null}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.green} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>{emptyText}</Text>
              {filter === 'all' && <Text style={styles.emptyHint}>{s.noFeedDesc}</Text>}
            </View>
          }
        />
      )}

      <HikerProfileModal userId={selectedHiker} onClose={() => setSelectedHiker(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topBar: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.zinc200,
    paddingTop: 60,
    paddingBottom: 12,
  },
  header: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.zinc950,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.zinc100,
  },
  pillActive: { backgroundColor: Colors.green },
  pillLabel: { fontSize: 13, fontWeight: '600', color: Colors.zinc500 },
  pillLabelActive: { color: Colors.white },
  list: { paddingVertical: 8 },
  separator: { height: 1, backgroundColor: Colors.zinc100 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyText: { fontSize: 17, fontWeight: '600', color: Colors.zinc800 },
  emptyHint: { fontSize: 14, color: Colors.zinc500, textAlign: 'center', paddingHorizontal: 40 },
});
