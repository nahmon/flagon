import { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors } from '../constants';
import {
  fetchTrendingSummits,
  fetchFriendsConquered,
  fetchHighAltitudeTargets,
  type RecommendedSummit,
} from '../services/recommendations';
import { useLang } from '../contexts/LangContext';
import { t, summitName } from '../i18n/strings';

type Tab = 'trending' | 'friends' | 'altitude';

interface Props {
  visible: boolean;
  onClose: () => void;
}

function SummitCard({
  item,
  tab,
  lang,
}: {
  item: RecommendedSummit;
  tab: Tab;
  lang: 'ko' | 'en' | 'ja';
}) {
  const s = t(lang);
  const name = summitName(item, lang);

  const badge = tab === 'trending'
    ? s.recBadgeTrending(item.reasonCount)
    : tab === 'friends'
    ? s.recBadgeFriends(item.reasonCount)
    : s.recBadgeAltitude(item.elevation_m);

  const badgeColor = tab === 'trending'
    ? Colors.orange
    : tab === 'friends'
    ? Colors.crewNK
    : Colors.greenDark;

  return (
    <View style={styles.card}>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName} numberOfLines={1}>{name}</Text>
        {item.mountain_group ? (
          <Text style={styles.cardGroup} numberOfLines={1}>{item.mountain_group}</Text>
        ) : null}
        <Text style={styles.cardElev}>{item.elevation_m.toLocaleString()} m</Text>
      </View>
      <View style={[styles.badge, { backgroundColor: badgeColor }]}>
        <Text style={styles.badgeText}>{badge}</Text>
      </View>
    </View>
  );
}

export default function SummitRecommendationsModal({ visible, onClose }: Props) {
  const { lang } = useLang();
  const s = t(lang);
  const [tab, setTab] = useState<Tab>('trending');
  const [data, setData] = useState<RecommendedSummit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (currentTab: Tab) => {
    setLoading(true);
    setError(null);
    setData([]);
    try {
      let result: RecommendedSummit[];
      if (currentTab === 'trending') result = await fetchTrendingSummits();
      else if (currentTab === 'friends') result = await fetchFriendsConquered();
      else result = await fetchHighAltitudeTargets();
      setData(result);
    } catch {
      setError(s.error);
    } finally {
      setLoading(false);
    }
  }, [s.error]);

  useEffect(() => {
    if (visible) load(tab);
  }, [visible, tab, load]);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'trending', label: s.recTabTrending },
    { key: 'friends', label: s.recTabFriends },
    { key: 'altitude', label: s.recTabAltitude },
  ];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{s.recTitle}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.closeBtn}>✕</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.subtitle}>{s.recSubtitle}</Text>

        <View style={styles.tabs}>
          {tabs.map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              style={[styles.tabBtn, tab === key && styles.tabBtnActive]}
              onPress={() => setTab(key)}
            >
              <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={Colors.green} style={styles.loader} />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : data.length === 0 ? (
          <Text style={styles.emptyText}>{s.recEmpty}</Text>
        ) : (
          <FlatList<RecommendedSummit>
            data={data}
            keyExtractor={(item: RecommendedSummit) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }: { item: RecommendedSummit }) => (
              <SummitCard item={item} tab={tab} lang={lang} />
            )}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 8,
    backgroundColor: Colors.green,
  },
  title: { fontSize: 20, fontWeight: '700', color: Colors.white },
  closeBtn: { fontSize: 18, color: Colors.white, fontWeight: '600' },
  subtitle: {
    fontSize: 13,
    color: Colors.zinc500,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.zinc100,
    alignItems: 'center',
  },
  tabBtnActive: { backgroundColor: Colors.green },
  tabText: { fontSize: 12, fontWeight: '600', color: Colors.zinc500 },
  tabTextActive: { color: Colors.white },
  loader: { marginTop: 60 },
  errorText: { textAlign: 'center', marginTop: 40, color: Colors.zinc500, fontSize: 14 },
  emptyText: { textAlign: 'center', marginTop: 40, color: Colors.zinc500, fontSize: 14 },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardInfo: { flex: 1, marginRight: 12 },
  cardName: { fontSize: 15, fontWeight: '700', color: Colors.zinc800 },
  cardGroup: { fontSize: 12, color: Colors.zinc500, marginTop: 2 },
  cardElev: { fontSize: 13, color: Colors.green, fontWeight: '600', marginTop: 4 },
  badge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 70,
    alignItems: 'center',
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: Colors.white },
});
