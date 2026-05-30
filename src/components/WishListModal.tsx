import { useEffect, useState, useCallback } from 'react';
import {
  Modal, View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { Colors } from '../constants';
import { WishItem, getWishList, removeFromWishList } from '../services/wishlist';
import { useLang } from '../contexts/LangContext';
import { t } from '../i18n/strings';
import { PlannedHike, getPlannedHike, setPlannedHike, cancelPlannedHike } from '../services/plannedHike';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const QUICK_OFFSETS = [1, 3, 7, 14, 30];

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatDate(iso: string, lang: string): string {
  const d = new Date(iso + 'T00:00:00');
  if (lang === 'ko') return `${d.getMonth() + 1}월 ${d.getDate()}일`;
  if (lang === 'ja') return `${d.getMonth() + 1}月${d.getDate()}日`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function WishListModal({ visible, onClose }: Props) {
  const { lang } = useLang();
  const s = t(lang);
  const [items, setItems] = useState<WishItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<Record<string, PlannedHike>>({});
  const [planPickerId, setPlanPickerId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getWishList();
      setItems(data);
      const planMap: Record<string, PlannedHike> = {};
      await Promise.all(
        data.map(async (item: WishItem) => {
          const p = await getPlannedHike(item.id);
          if (p) planMap[item.id] = p;
        }),
      );
      setPlans(planMap);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) refresh();
  }, [visible, refresh]);

  const handleRemove = useCallback(async (id: string) => {
    await cancelPlannedHike(id);
    await removeFromWishList(id);
    setItems((prev: WishItem[]) => prev.filter((i: WishItem) => i.id !== id));
    setPlans((prev) => { const next = { ...prev }; delete next[id]; return next; });
  }, []);

  const handlePlan = useCallback(async (item: WishItem, offset: number) => {
    const date = addDays(offset);
    const name = lang === 'en' && item.name_en ? item.name_en
      : lang === 'ja' && item.name_ja ? item.name_ja : item.name_ko;
    await setPlannedHike(item.id, name, date);
    setPlans((prev) => ({ ...prev, [item.id]: { summitId: item.id, date } }));
    setPlanPickerId(null);
  }, [lang]);

  const handleCancelPlan = useCallback(async (id: string) => {
    await cancelPlannedHike(id);
    setPlans((prev) => { const next = { ...prev }; delete next[id]; return next; });
    setPlanPickerId(null);
  }, []);

  const displayName = (item: WishItem) => {
    if (lang === 'en' && item.name_en) return item.name_en;
    if (lang === 'ja' && item.name_ja) return item.name_ja;
    return item.name_ko;
  };

  const offsetLabel = (days: number) => {
    if (lang === 'ko') return days === 1 ? '내일' : `+${days}일`;
    if (lang === 'ja') return days === 1 ? '明日' : `+${days}日`;
    return days === 1 ? 'Tomorrow' : `+${days}d`;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={styles.title}>{s.bucketList}</Text>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color={Colors.green} style={styles.loader} />
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item: WishItem) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }: { item: WishItem }) => {
              const plan = plans[item.id];
              const pickingThis = planPickerId === item.id;
              return (
                <View style={styles.card}>
                  <View style={styles.row}>
                    <View style={styles.flagPole}>
                      <Text style={styles.flagIcon}>🚩</Text>
                    </View>
                    <View style={styles.info}>
                      <Text style={styles.name}>{displayName(item)}</Text>
                      <Text style={styles.sub}>
                        {item.elevation_m}m{item.mountain_group ? ` · ${item.mountain_group}` : ''}
                      </Text>
                      {plan && (
                        <Text style={styles.planBadge}>
                          📅 {formatDate(plan.date, lang)}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity
                      style={[styles.calBtn, plan && styles.calBtnActive]}
                      onPress={() => setPlanPickerId(pickingThis ? null : item.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={styles.calBtnText}>📅</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.removeBtn}
                      onPress={() => handleRemove(item.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={styles.removeBtnText}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  {pickingThis && (
                    <View style={styles.picker}>
                      <Text style={styles.pickerLabel}>{s.planHikeOn}</Text>
                      <View style={styles.chipRow}>
                        {QUICK_OFFSETS.map((d) => (
                          <TouchableOpacity
                            key={d}
                            style={styles.chip}
                            onPress={() => handlePlan(item, d)}
                          >
                            <Text style={styles.chipText}>{offsetLabel(d)}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      {plan && (
                        <TouchableOpacity style={styles.cancelPlanBtn} onPress={() => handleCancelPlan(item.id)}>
                          <Text style={styles.cancelPlanText}>{s.cancelPlan}</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              );
            }}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>🏔️</Text>
                <Text style={styles.emptyTitle}>{s.bucketListEmpty}</Text>
                <Text style={styles.emptySub}>{s.bucketListAdd}</Text>
              </View>
            }
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  handle: {
    width: 36, height: 4, backgroundColor: Colors.zinc200,
    borderRadius: 2, alignSelf: 'center', marginVertical: 12,
  },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16,
  },
  title: { fontSize: 22, fontWeight: '800', color: Colors.zinc950, letterSpacing: -0.5 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.zinc100, alignItems: 'center', justifyContent: 'center',
  },
  closeBtnText: { fontSize: 12, color: Colors.zinc800, fontWeight: '700' },
  loader: { marginTop: 48 },
  list: { paddingHorizontal: 20, paddingBottom: 48 },
  card: {
    backgroundColor: Colors.white, borderRadius: 14,
    paddingHorizontal: 14, paddingTop: 14, paddingBottom: 10,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flagPole: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.zinc100,
    alignItems: 'center', justifyContent: 'center',
  },
  flagIcon: { fontSize: 18 },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: Colors.zinc950 },
  sub: { fontSize: 12, color: Colors.zinc500, marginTop: 2 },
  planBadge: { fontSize: 11, color: Colors.green, marginTop: 4, fontWeight: '600' },
  calBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.zinc100, alignItems: 'center', justifyContent: 'center',
  },
  calBtnActive: { backgroundColor: Colors.green + '22' },
  calBtnText: { fontSize: 14 },
  removeBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.zinc100, alignItems: 'center', justifyContent: 'center',
  },
  removeBtnText: { fontSize: 11, color: Colors.zinc500, fontWeight: '700' },
  picker: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.zinc100 },
  pickerLabel: { fontSize: 12, color: Colors.zinc500, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: Colors.green, borderRadius: 20,
  },
  chipText: { fontSize: 12, color: Colors.white, fontWeight: '700' },
  cancelPlanBtn: { marginTop: 8 },
  cancelPlanText: { fontSize: 12, color: Colors.zinc500 },
  separator: { height: 8 },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 52, marginBottom: 16 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.zinc800, textAlign: 'center', marginBottom: 8 },
  emptySub: { fontSize: 14, color: Colors.zinc500, textAlign: 'center', lineHeight: 20 },
});
