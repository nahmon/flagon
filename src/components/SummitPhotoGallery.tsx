import { useState, useEffect, useCallback } from 'react';
import {
  Modal, View, Text, TouchableOpacity, FlatList, Image,
  StyleSheet, ActivityIndicator, Alert, Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../services/supabase';
import {
  fetchSummitPhotos, uploadSummitPhoto, deleteSummitPhoto, SummitPhoto,
} from '../services/summitPhotos';
import { Colors } from '../constants';
import { useLang } from '../contexts/LangContext';
import { t } from '../i18n/strings';

const COL = 3;
const GAP = 2;
const SCREEN_W = Dimensions.get('window').width;
const TILE = (SCREEN_W - GAP * (COL + 1)) / COL;

interface Props {
  visible: boolean;
  summitId: string;
  summitName: string;
  onClose: () => void;
  onCountChange: (n: number) => void;
}

export default function SummitPhotoGallery({ visible, summitId, summitName, onClose, onCountChange }: Props) {
  const { lang } = useLang();
  const s = t(lang);
  const [photos, setPhotos] = useState<SummitPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fullScreen, setFullScreen] = useState<SummitPhoto | null>(null);
  const [myId, setMyId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then((res: any) => setMyId(res.data.user?.id ?? null));
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    fetchSummitPhotos(summitId)
      .then((p) => { setPhotos(p); onCountChange(p.length); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [summitId, onCountChange]);

  useEffect(() => { if (visible) load(); }, [visible, load]);

  const handleUpload = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('', s.photoPermissionDenied); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets.length) return;
    setUploading(true);
    try {
      await uploadSummitPhoto(summitId, result.assets[0].uri);
      load();
    } catch {
      Alert.alert('', s.photoError);
    } finally {
      setUploading(false);
    }
  }, [summitId, s, load]);

  const handleDelete = useCallback((photo: SummitPhoto) => {
    Alert.alert(s.photoDeleteTitle, s.photoDeleteBody, [
      { text: s.cancel, style: 'cancel' },
      {
        text: s.delete, style: 'destructive',
        onPress: () => deleteSummitPhoto(photo.id, photo.storage_key).then(load).catch(console.error),
      },
    ]);
  }, [s, load]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>{s.photosTitle(summitName)}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.uploadBtn} onPress={handleUpload} disabled={uploading} activeOpacity={0.8}>
          {uploading
            ? <ActivityIndicator color={Colors.white} size="small" />
            : <Text style={styles.uploadTxt}>{s.photoUpload}</Text>}
        </TouchableOpacity>

        {loading
          ? <ActivityIndicator color={Colors.green} style={styles.loader} />
          : photos.length === 0
            ? <Text style={styles.empty}>{s.photosEmpty}</Text>
            : (
              <FlatList
                data={photos}
                keyExtractor={(p: SummitPhoto) => p.id}
                numColumns={COL}
                contentContainerStyle={styles.grid}
                renderItem={({ item }: { item: SummitPhoto }) => (
                  <TouchableOpacity
                    onPress={() => setFullScreen(item)}
                    onLongPress={() => item.user_id === myId && handleDelete(item)}
                    activeOpacity={0.85}
                    style={styles.tile}
                  >
                    <Image source={{ uri: item.url }} style={styles.tileImg} />
                    {item.user_id === myId && <View style={styles.myDot} />}
                  </TouchableOpacity>
                )}
              />
            )}

        {fullScreen && (
          <Modal visible animationType="fade" transparent onRequestClose={() => setFullScreen(null)}>
            <View style={styles.fsContainer}>
              <TouchableOpacity style={styles.fsDismiss} onPress={() => setFullScreen(null)}>
                <Text style={styles.fsCloseText}>✕</Text>
              </TouchableOpacity>
              <Image source={{ uri: fullScreen.url }} style={styles.fsImage} resizeMode="contain" />
              <View style={styles.fsMeta}>
                <Text style={styles.fsUser}>{fullScreen.user_display_name}</Text>
                <Text style={styles.fsDate}>{new Date(fullScreen.created_at).toLocaleDateString()}</Text>
              </View>
              {fullScreen.user_id === myId && (
                <TouchableOpacity
                  style={styles.fsDeleteBtn}
                  onPress={() => { const p = fullScreen; setFullScreen(null); handleDelete(p); }}
                >
                  <Text style={styles.fsDeleteTxt}>{s.delete}</Text>
                </TouchableOpacity>
              )}
            </View>
          </Modal>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 20 },
  title: { fontSize: 18, fontWeight: '700', color: Colors.zinc950, flex: 1 },
  closeBtn: { padding: 8 },
  closeText: { fontSize: 18, color: Colors.zinc500 },
  uploadBtn: {
    marginHorizontal: 16, marginBottom: 12, backgroundColor: Colors.green,
    borderRadius: 10, padding: 12, alignItems: 'center',
  },
  uploadTxt: { color: Colors.white, fontWeight: '700', fontSize: 15 },
  loader: { marginTop: 48 },
  empty: { textAlign: 'center', color: Colors.zinc500, marginTop: 48, fontSize: 15, paddingHorizontal: 32 },
  grid: { paddingHorizontal: GAP },
  tile: { width: TILE, height: TILE, margin: GAP / 2 },
  tileImg: { width: '100%', height: '100%', borderRadius: 4 },
  myDot: {
    position: 'absolute', top: 6, right: 6, width: 8, height: 8,
    borderRadius: 4, backgroundColor: Colors.green,
  },
  fsContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center' },
  fsDismiss: { position: 'absolute', top: 56, right: 20, zIndex: 10 },
  fsCloseText: { fontSize: 26, color: Colors.white },
  fsImage: { width: SCREEN_W, height: SCREEN_W },
  fsMeta: { position: 'absolute', bottom: 90, left: 20 },
  fsUser: { color: Colors.white, fontWeight: '700', fontSize: 16 },
  fsDate: { color: Colors.zinc200, fontSize: 13, marginTop: 2 },
  fsDeleteBtn: {
    position: 'absolute', bottom: 32, right: 20,
    backgroundColor: Colors.orange, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16,
  },
  fsDeleteTxt: { color: Colors.white, fontWeight: '700' },
});
