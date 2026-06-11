import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, Modal, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Colors } from '../constants';
import { useLang } from '../contexts/LangContext';
import { t } from '../i18n/strings';
import { supabase } from '../services/supabase';
import {
  dominantCondition, loadConditions, CONDITION_META,
  type ConditionType,
} from '../services/conditions';
import {
  fetchMySummitsForConditions, conditionSummitName,
  type ConditionSummit,
} from '../services/myConditions';
import SummitConditionsModal from './SummitConditionsModal';

interface Props { visible: boolean; onClose: () => void; }

interface SummitRow extends ConditionSummit {
  dominant: ConditionType | null;
}

export default function MyTrailConditionsModal({ visible, onClose }: Props) {
  const { lang } = useLang();
  const s = t(lang as 'ko' | 'en' | 'ja');

  const [summits, setSummits] = useState<SummitRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [detail, setDetail] = useState<ConditionSummit | null>(null);
  const [detailCount, setDetailCount] = useState(0);

  const load = useCallback(async (uid: string) => {
    setLoading(true);
    const entries = await fetchMySummitsForConditions(uid);
    const rows: SummitRow[] = await Promise.all(
      entries.map(async e => {
        const reports = await loadConditions(e.summitId);
        return { ...e, dominant: dominantCondition(reports) };
      }),
    );
    setSummits(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!visible) return;
    setQuery('');
    setDetail(null);
    (supabase.auth.getUser() as Promise<{ data: { user: { id: string } | null }; error: unknown }>)
      .then((res) => {
        if (res.data.user?.id) load(res.data.user.id);
      });
  }, [visible, load]);

  const handleDetailClose = useCallback(async () => {
    setDetail(null);
    const { data } = await supabase.auth.getUser();
    if (data.user?.id) {
      const fresh = await fetchMySummitsForConditions(data.user.id);
      const rows: SummitRow[] = await Promise.all(
        fresh.map(async (e: ConditionSummit) => {
          const reports = await loadConditions(e.summitId);
          return { ...e, dominant: dominantCondition(reports) };
        }),
      );
      setSummits(rows);
    }
  }, []);

  const filtered: SummitRow[] = query.trim()
    ? summits.filter((r: SummitRow) =>
        conditionSummitName(r, lang as 'ko' | 'en' | 'ja')
          .toLowerCase()
          .includes(query.toLowerCase()),
      )
    : summits;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.root}>
        <View style={styles.handle} />
        <Text style={styles.title}>{s.myCondTitle}</Text>

        <View style={styles.searchWrap}>
          <TextInput
            style={styles.search}
            value={query}
            onChangeText={setQuery}
            placeholder={s.myCondSearch}
            placeholderTextColor={Colors.zinc500}
            clearButtonMode="while-editing"
          />
        </View>

        {loading ? (
          <ActivityIndicator color={Colors.green} style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item: SummitRow) => item.summitId}
            contentContainerStyle={styles.list}
            ListEmptyComponent={<Text style={styles.empty}>{s.myCondEmpty}</Text>}
            renderItem={({ item }: { item: SummitRow }) => {
              const name = conditionSummitName(item, lang as 'ko' | 'en' | 'ja');
              const dom = item.dominant;
              const icon = dom ? CONDITION_META[dom].icon : '⛅';
              const condLabel = dom
                ? (s as Record<string, unknown>)[CONDITION_META[dom].labelKey] as string
                : s.condEmpty;
              return (
                <TouchableOpacity
                  style={styles.row}
                  onPress={() => { setDetailCount(0); setDetail(item); }}
                  activeOpacity={0.75}
                >
                  <Text style={styles.rowIcon}>{icon}</Text>
                  <View style={styles.rowBody}>
                    <Text style={styles.rowName} numberOfLines={1}>{name}</Text>
                    <Text style={styles.rowElev}>{item.elevation_m} m</Text>
                  </View>
                  <Text style={styles.rowCond}>{condLabel}</Text>
                  <Text style={styles.rowChev}>›</Text>
                </TouchableOpacity>
              );
            }}
            ItemSeparatorComponent={() => <View style={styles.sep} />}
          />
        )}

        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeTxt}>{s.close}</Text>
        </TouchableOpacity>
      </View>

      {detail && (
        <SummitConditionsModal
          visible
          summitId={detail.summitId}
          summitName={conditionSummitName(detail, lang as 'ko' | 'en' | 'ja')}
          onClose={handleDetailClose}
          onCountChange={setDetailCount}
        />
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.cream, paddingTop: 12 },
  handle: { width: 36, height: 4, backgroundColor: Colors.zinc200, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '700', color: Colors.zinc950, paddingHorizontal: 20, marginBottom: 12 },
  searchWrap: { paddingHorizontal: 20, marginBottom: 8 },
  search: { backgroundColor: Colors.white, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: Colors.zinc950, borderWidth: 1, borderColor: Colors.zinc200 },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14, gap: 12 },
  rowIcon: { fontSize: 24 },
  rowBody: { flex: 1 },
  rowName: { fontSize: 15, fontWeight: '700', color: Colors.zinc950 },
  rowElev: { fontSize: 12, color: Colors.zinc500, marginTop: 2 },
  rowCond: { fontSize: 13, color: Colors.zinc800, fontWeight: '600' },
  rowChev: { fontSize: 18, color: Colors.zinc200 },
  sep: { height: 8 },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 15, color: Colors.zinc500, paddingHorizontal: 20 },
  closeBtn: { marginHorizontal: 20, marginTop: 4, marginBottom: 40, paddingVertical: 14, backgroundColor: Colors.zinc100, borderRadius: 12, alignItems: 'center' },
  closeTxt: { fontSize: 15, color: Colors.zinc500 },
});
