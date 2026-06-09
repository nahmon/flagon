import { useState, useEffect, useCallback } from 'react';
import {
  Modal, View, Text, TouchableOpacity, FlatList, Image,
  StyleSheet, ActivityIndicator, Alert, Dimensions,
} from 'react-native';
import { Colors } from '../constants';
import { fetchMyPhotos, deleteSummitPhoto, MyPhoto } from '../services/summitPhotos';
import { useLang } from '../contexts/LangContext';
import { t, summitName } from '../i18n/strings';

const COL = 3;
const GAP = 2;
const SCREEN_W = Dimensions.get('window').width;
const TILE = (SCREEN_W - GAP * (COL + 1)) / COL;

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function MyPhotosModal({ visible, onClose }: Props) {
  const { lang } = useLang();
  const s = t(lang);
  const [photos, setPhotos] = useState<MyPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [fullScreen, setFullScreen] = useState<MyPhoto | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetchMyPhotos()
      .then(setPhotos)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { if (visible) load(); }, [visible, load]);

  const handleDelete = useCallback((photo: MyPhoto) => {
    Alert.alert(s.photoDeleteTitle, s.photoDeleteBody, [
      { text: s.cancel, style: 'cancel' },
      {
        text: s.delete, style: 'destructive',
        onPress: () =>
          deleteSummitPhoto(photo.id, photo.storage_key)
            .then(load)
            .catch(console.error),
      },
    ]);
  }, [s, load]);

  const getSummitLabel = useCallback((photo: MyPhoto) => {
    const name = summitName({
      name_ko: photo.summit_name_ko,
      name_en: photo.summit_name_en,
      name_ja: photo.summit_name_ja,
    }, lang);
    return s.myPhotosSummit(name, photo.elevation_m);
  }, [lang, s]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{s.myPhotosTitle}</Text>
          {photos.length > 0 && (
            <Text style={styles.count}>{s.myPhotosCount(photos.length)}</Text>
          )}
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        {loading
          ? <ActivityIndicator color={Colors.green} style={styles.loader} />
          : photos.length === 0
            ? (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyIcon}>📷</Text>
                <Text style={styles.emptyText}>{s.myPhotosEmpty}</Text>
              </View>
            )
            : (
              <FlatList
                data={photos}
                keyExtractor={(p: MyPhoto) => p.id}
                numColumns={COL}
                contentContainerStyle={styles.grid}
                renderItem={({ item }: { item: MyPhoto }) => (
                  <TouchableOpacity
                    onPress={() => setFullScreen(item)}
                    onLongPress={() => handleDelete(item)}
                    activeOpacity={0.85}
                    style={styles.tile}
                  >
                    <Image source={{ uri: item.url }} style={styles.tileImg} />
                    <View style={styles.tileLabelWrap}>
                      <Text style={styles.tileLabel} numberOfLines={1}>
                        {getSummitLabel(item)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}
      </View>

      {fullScreen && (
        <Modal visible animationType="fade" transparent onRequestClose={() => setFullScreen(null)}>
          <View style={styles.fsContainer}>
            <TouchableOpacity style={styles.fsDismiss} onPress={() => setFullScreen(null)}>
              <Text style={styles.fsCloseText}>✕</Text>
            </TouchableOpacity>
            <Image source={{ uri: fullScreen.url }} style={styles.fsImage} resizeMode="contain" />
            <View style={styles.fsMeta}>
              <Text style={styles.fsSummit}>{getSummitLabel(fullScreen)}</Text>
              <Text style={styles.fsDate}>{new Date(fullScreen.created_at).toLocaleDateString()}</Text>
            </View>
            <TouchableOpacity
              style={styles.fsDeleteBtn}
              onPress={() => { const p = fullScreen; setFullScreen(null); handleDelete(p); }}
            >
              <Text style={styles.fsDeleteTxt}>{s.delete}</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.zinc200,
  },
  title: { fontSize: 18, fontWeight: '700', color: Colors.zinc950, flex: 1 },
  count: { fontSize: 13, color: Colors.zinc500, marginRight: 8 },
  closeBtn: { padding: 8 },
  closeText: { fontSize: 18, color: Colors.zinc500 },
  loader: { marginTop: 48 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { textAlign: 'center', color: Colors.zinc500, fontSize: 15, lineHeight: 22 },
  grid: { paddingHorizontal: GAP, paddingTop: GAP },
  tile: { width: TILE, height: TILE + 22, margin: GAP / 2 },
  tileImg: { width: TILE, height: TILE, borderRadius: 4 },
  tileLabelWrap: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)', borderBottomLeftRadius: 4, borderBottomRightRadius: 4,
    paddingHorizontal: 4, paddingVertical: 2,
  },
  tileLabel: { color: Colors.white, fontSize: 9, fontWeight: '600' },
  fsContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center' },
  fsDismiss: { position: 'absolute', top: 56, right: 20, zIndex: 10 },
  fsCloseText: { fontSize: 26, color: Colors.white },
  fsImage: { width: SCREEN_W, height: SCREEN_W },
  fsMeta: { position: 'absolute', bottom: 90, left: 20 },
  fsSummit: { color: Colors.white, fontWeight: '700', fontSize: 16 },
  fsDate: { color: Colors.zinc200, fontSize: 13, marginTop: 2 },
  fsDeleteBtn: {
    position: 'absolute', bottom: 32, right: 20,
    backgroundColor: Colors.orange, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16,
  },
  fsDeleteTxt: { color: Colors.white, fontWeight: '700' },
});
