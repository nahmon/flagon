import { useEffect, useState, useCallback } from 'react';
import {
  Modal, View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { Colors } from '../constants';
import { WishItem, getWishList, removeFromWishList } from '../services/wishlist';
import { useLang } from '../contexts/LangContext';
import { t } from '../i18n/strings';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function WishListModal({ visible, onClose }: Props) {
  const { lang } = useLang();
  const s = t(lang);
  const [items, setItems] = useState<WishItem[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getWishList();
      setItems(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) refresh();
  }, [visible, refresh]);

  const handleRemove = useCallback(async (id: string) => {
    await removeFromWishList(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const displayName = (item: WishItem) => {
    if (lang === 'en' && item.name_en) return item.name_en;
    if (lang === 'ja' && item.name_ja) return item.name_ja;
    return item.name_ko;
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
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <View style={styles.flagPole}>
                  <Text style={styles.flagIcon}>🚩</Text>
                </View>
                <View style={styles.info}>
                  <Text style={styles.name}>{displayName(item)}</Text>
                  <Text style={styles.sub}>
                    {item.elevation_m}m{item.mountain_group ? ` · ${item.mountain_group}` : ''}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => handleRemove(item.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.removeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
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
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.white, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 14, gap: 12,
  },
  flagPole: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.zinc100,
    alignItems: 'center', justifyContent: 'center',
  },
  flagIcon: { fontSize: 18 },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: Colors.zinc950 },
  sub: { fontSize: 12, color: Colors.zinc500, marginTop: 2 },
  removeBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.zinc100, alignItems: 'center', justifyContent: 'center',
  },
  removeBtnText: { fontSize: 11, color: Colors.zinc500, fontWeight: '700' },
  separator: { height: 8 },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 52, marginBottom: 16 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.zinc800, textAlign: 'center', marginBottom: 8 },
  emptySub: { fontSize: 14, color: Colors.zinc500, textAlign: 'center', lineHeight: 20 },
});
