import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, FlatList, ActivityIndicator,
} from 'react-native';
import { Colors } from '../constants';
import { supabase } from '../services/supabase';
import {
  fetchAllCollectionProgress,
  type CollectionProgress,
  type CollectionSummit,
  type CollectionDef,
} from '../services/summitCollections';
import { useLang } from '../contexts/LangContext';
import { t, summitName } from '../i18n/strings';

type Props = { visible: boolean; onClose: () => void };

function CollectionCard({
  progress, lang, onPress,
}: { progress: CollectionProgress; lang: string; onPress: () => void }) {
  const s = t(lang as 'ko' | 'en' | 'ja');
  const { def, conquered, total, isComplete } = progress;
  const pct = total > 0 ? conquered / total : 0;
  const name = lang === 'en' ? def.nameEn : lang === 'ja' ? def.nameJa : def.nameKo;
  const desc = lang === 'en' ? def.descEn : lang === 'ja' ? def.descJa : def.descKo;

  return (
    <TouchableOpacity style={card.container} onPress={onPress} activeOpacity={0.8}>
      <View style={card.top}>
        <Text style={card.emoji}>{def.emoji}</Text>
        <View style={{ flex: 1 }}>
          <View style={card.nameRow}>
            <Text style={card.name}>{name}</Text>
            {isComplete && <View style={[card.badge, { backgroundColor: def.color }]}><Text style={card.badgeText}>{s.collectionsComplete}</Text></View>}
          </View>
          <Text style={card.desc}>{desc}</Text>
        </View>
        <Text style={card.arrow}>›</Text>
      </View>
      <Text style={card.progress}>{s.collectionsProgress(conquered, total)}</Text>
      <View style={card.barBg}>
        <View style={[card.barFill, { width: `${Math.round(pct * 100)}%` as `${number}%`, backgroundColor: def.color }]} />
      </View>
    </TouchableOpacity>
  );
}

function SummitRow({ summit, lang }: { summit: CollectionSummit; lang: string }) {
  const name = summitName(summit, lang as 'ko' | 'en' | 'ja');
  return (
    <View style={row.container}>
      <Text style={[row.icon, { color: summit.conquered ? Colors.green : Colors.zinc200 }]}>
        {summit.conquered ? '✓' : '○'}
      </Text>
      <Text style={[row.name, !summit.conquered && row.nameDim]} numberOfLines={1}>{name}</Text>
      <Text style={row.elev}>{summit.elevation_m.toLocaleString()}m</Text>
    </View>
  );
}

export default function SummitCollectionsModal({ visible, onClose }: Props) {
  const { lang } = useLang();
  const s = t(lang);
  const [loading, setLoading] = useState(true);
  const [collections, setCollections] = useState<CollectionProgress[]>([]);
  const [selected, setSelected] = useState<CollectionProgress | null>(null);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setLoading(true);
    try {
      const result = await fetchAllCollectionProgress(user.id);
      setCollections(result);
    } catch (e) {
      console.error('[collections]', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (visible) { setSelected(null); load(); } }, [visible, load]);

  const sortedSummits = selected
    ? [...selected.summits].sort((a, b) => {
        if (a.conquered !== b.conquered) return a.conquered ? -1 : 1;
        return b.elevation_m - a.elevation_m;
      })
    : [];

  const selName = selected
    ? (lang === 'en' ? selected.def.nameEn : lang === 'ja' ? selected.def.nameJa : selected.def.nameKo)
    : '';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.handle} />

        {selected ? (
          <>
            <View style={styles.detailHeader}>
              <TouchableOpacity onPress={() => setSelected(null)} style={styles.backBtn}>
                <Text style={styles.backText}>{s.collectionsBack}</Text>
              </TouchableOpacity>
              <Text style={styles.detailTitle}>{selected.def.emoji} {selName}</Text>
              <Text style={styles.detailSub}>{s.collectionsProgress(selected.conquered, selected.total)}</Text>
            </View>
            <FlatList
              data={sortedSummits}
              keyExtractor={(item: CollectionSummit) => item.id}
              renderItem={({ item }: { item: CollectionSummit }) => <SummitRow summit={item} lang={lang} />}
              ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: Colors.zinc100 }} />}
              contentContainerStyle={{ paddingBottom: 40 }}
              ListEmptyComponent={<Text style={styles.empty}>{s.collectionsEmpty}</Text>}
            />
          </>
        ) : (
          <>
            <View style={styles.header}>
              <Text style={styles.title}>{s.collectionsTitle}</Text>
              <Text style={styles.sub}>{s.collectionsSub}</Text>
            </View>
            {loading ? (
              <ActivityIndicator color={Colors.green} style={{ marginTop: 40 }} />
            ) : (
              <FlatList
                data={collections}
                keyExtractor={(item: CollectionProgress) => item.def.id}
                renderItem={({ item }: { item: CollectionProgress }) => (
                  <CollectionCard progress={item} lang={lang} onPress={() => setSelected(item)} />
                )}
                contentContainerStyle={styles.listContent}
              />
            )}
          </>
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
  header: { paddingHorizontal: 20, marginBottom: 8 },
  title: { fontSize: 20, fontWeight: '800', color: Colors.zinc950 },
  sub: { fontSize: 13, color: Colors.zinc500, marginTop: 4 },
  listContent: { paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 15, color: Colors.zinc500 },
  closeBtn: { marginHorizontal: 20, marginTop: 12, marginBottom: 40, paddingVertical: 14, backgroundColor: Colors.zinc100, borderRadius: 12, alignItems: 'center' },
  closeBtnText: { fontSize: 15, color: Colors.zinc500 },
  detailHeader: { paddingHorizontal: 20, marginBottom: 12 },
  backBtn: { marginBottom: 8 },
  backText: { fontSize: 14, color: Colors.green, fontWeight: '600' },
  detailTitle: { fontSize: 20, fontWeight: '800', color: Colors.zinc950 },
  detailSub: { fontSize: 14, color: Colors.zinc500, marginTop: 4 },
});

const card = StyleSheet.create({
  container: { backgroundColor: Colors.white, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  emoji: { fontSize: 28 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  name: { fontSize: 16, fontWeight: '700', color: Colors.zinc950 },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: '800', color: Colors.white, letterSpacing: 0.5 },
  desc: { fontSize: 12, color: Colors.zinc500, marginTop: 3 },
  arrow: { fontSize: 20, color: Colors.zinc500 },
  progress: { fontSize: 13, fontWeight: '700', color: Colors.zinc800, marginBottom: 6 },
  barBg: { height: 6, backgroundColor: Colors.zinc100, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
});

const row = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 13, backgroundColor: Colors.white, gap: 10 },
  icon: { fontSize: 18, fontWeight: '700', width: 20, textAlign: 'center' },
  name: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.zinc950 },
  nameDim: { color: Colors.zinc500, fontWeight: '400' },
  elev: { fontSize: 13, color: Colors.zinc500 },
});
