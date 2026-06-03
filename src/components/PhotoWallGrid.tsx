import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors } from '../constants';
import { fetchRecentPhotos, RecentPhoto } from '../services/summitPhotos';
import { useLang } from '../contexts/LangContext';
import { t, summitName, type Lang } from '../i18n/strings';

const COLS = 2;
const GAP = 2;
const TILE_SIZE = (Dimensions.get('window').width - GAP * (COLS + 1)) / COLS;

interface Props {
  onAvatarPress: (userId: string) => void;
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
  if (diff < 1) return '<1h';
  if (diff < 24) return `${diff}h`;
  const days = Math.floor(diff / 24);
  return `${days}d`;
}

function PhotoTile({ item, onAvatarPress, lang }: { item: RecentPhoto; onAvatarPress: (uid: string) => void; lang: Lang }) {
  const name = summitName(
    { name_ko: item.summit_name_ko, name_en: item.summit_name_en, name_ja: item.summit_name_ja },
    lang,
  );
  return (
    <TouchableOpacity style={styles.tile} activeOpacity={0.88} onPress={() => onAvatarPress(item.user_id)}>
      <Image source={{ uri: item.url }} style={styles.image} resizeMode="cover" />
      <View style={styles.overlay}>
        <Text style={styles.summitName} numberOfLines={1}>{name}</Text>
        <View style={styles.metaRow}>
          <View style={styles.elevBadge}>
            <Text style={styles.elevText}>{item.elevation_m}m</Text>
          </View>
          <Text style={styles.ago}>{timeAgo(item.created_at)}</Text>
        </View>
        <Text style={styles.uploader} numberOfLines={1}>@{item.user_display_name}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function PhotoWallGrid({ onAvatarPress }: Props) {
  const { lang } = useLang();
  const s = t(lang);
  const [photos, setPhotos] = useState<RecentPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    fetchRecentPhotos(60)
      .then(setPhotos)
      .catch(() => setPhotos([]))
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, [load]);

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.green} /></View>;
  }

  return (
    <FlatList
      data={photos}
      keyExtractor={(p: RecentPhoto) => p.id}
      numColumns={COLS}
      columnWrapperStyle={styles.row}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.green} />}
      renderItem={({ item }: { item: RecentPhoto }) => (
        <PhotoTile item={item} onAvatarPress={onAvatarPress} lang={lang} />
      )}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📸</Text>
          <Text style={styles.emptyText}>{s.photoWallEmpty}</Text>
          <Text style={styles.emptyHint}>{s.photoWallSub}</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  list: { padding: GAP },
  row: { gap: GAP, marginBottom: GAP },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: Colors.zinc200,
  },
  image: { width: '100%', height: '100%' },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.52)',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  summitName: { fontSize: 12, fontWeight: '700', color: Colors.white, marginBottom: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  elevBadge: {
    backgroundColor: Colors.orange,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  elevText: { fontSize: 10, fontWeight: '700', color: Colors.white },
  ago: { fontSize: 10, color: 'rgba(255,255,255,0.7)' },
  uploader: { fontSize: 10, color: 'rgba(255,255,255,0.6)' },
  empty: { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 17, fontWeight: '600', color: Colors.zinc800 },
  emptyHint: { fontSize: 14, color: Colors.zinc500, textAlign: 'center', paddingHorizontal: 40 },
});
