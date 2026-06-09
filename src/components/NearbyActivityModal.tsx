import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Modal, View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import * as Location from 'expo-location';
import { Colors } from '../constants';
import { fetchNearbyActivity, type NearbyFlagEntry } from '../services/nearbyActivity';
import { supabase } from '../services/supabase';
import { useLang } from '../contexts/LangContext';
import { t, summitName } from '../i18n/strings';

const RADIUS_OPTIONS = [5, 10, 25, 50] as const;
type Radius = typeof RADIUS_OPTIONS[number];

function timeAgoMin(iso: string): number {
  return Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
}

function avatarColor(id: string): string {
  const colors = [Colors.green, Colors.orange, '#5B7FA6', '#8B6BA8', '#C0704A'];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffffffff;
  return colors[Math.abs(h) % colors.length];
}

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function NearbyActivityModal({ visible, onClose }: Props) {
  const { lang } = useLang();
  const s = t(lang);
  const [radius, setRadius] = useState<Radius>(10);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locError, setLocError] = useState(false);
  const [locating, setLocating] = useState(false);
  const [entries, setEntries] = useState<NearbyFlagEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [live, setLive] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const locate = useCallback(async () => {
    setLocating(true);
    setLocError(false);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setLocError(true); return; }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch {
      setLocError(true);
    } finally {
      setLocating(false);
    }
  }, []);

  const load = useCallback(async (c: { lat: number; lng: number }, r: Radius) => {
    setLoading(true);
    try {
      const data = await fetchNearbyActivity(c.lat, c.lng, r);
      setEntries(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) locate();
    else {
      setEntries([]);
      setCoords(null);
      setLive(false);
    }
  }, [visible, locate]);

  useEffect(() => {
    if (coords) load(coords, radius);
  }, [coords, radius, load]);

  useEffect(() => {
    if (!visible || !coords) return;
    const ch = supabase
      .channel('nearby-flags')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'flags' }, () => {
        load(coords, radius);
      })
      .subscribe((status: string) => setLive(status === 'SUBSCRIBED'));
    channelRef.current = ch;
    return () => { supabase.removeChannel(ch); setLive(false); };
  }, [visible, coords, radius, load]);

  const renderItem = useCallback(({ item }: { item: NearbyFlagEntry; index: number }) => {
    const name = item.display_name ?? '?';
    const initial = name.charAt(0).toUpperCase();
    const bg = item.crew_color ?? avatarColor(item.user_id);
    const sName = summitName(
      { name_ko: item.summit_name_ko, name_en: item.summit_name_en, name_ja: item.summit_name_ja },
      lang,
    );
    const minAgo = timeAgoMin(item.planted_at);
    const agoStr = minAgo < 60
      ? s.nearbyAgo(minAgo)
      : s.nearbyAgo(Math.floor(minAgo / 60) * 60);

    return (
      <View style={styles.row}>
        <View style={[styles.avatar, { backgroundColor: bg }]}>
          <Text style={styles.avatarLetter}>{initial}</Text>
        </View>
        <View style={styles.rowBody}>
          <View style={styles.rowTop}>
            <Text style={styles.hikerName} numberOfLines={1}>{name}</Text>
            {item.crew_name ? (
              <View style={[styles.crewBadge, { backgroundColor: (item.crew_color ?? Colors.green) + '28' }]}>
                <Text style={[styles.crewText, { color: item.crew_color ?? Colors.green }]} numberOfLines={1}>
                  {item.crew_name}
                </Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.summitText} numberOfLines={1}>
            🚩 {sName} · {item.elevation_m}m
          </Text>
        </View>
        <View style={styles.metaCol}>
          <Text style={styles.distText}>{s.nearbyKm(item.distance_km)}</Text>
          <Text style={styles.agoText}>{agoStr}</Text>
        </View>
      </View>
    );
  }, [lang, s]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <View style={styles.titleBlock}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>{s.nearbyTitle}</Text>
              {live && <View style={styles.liveDot}><Text style={styles.liveTxt}>{s.nearbyLive}</Text></View>}
            </View>
            {coords && (
              <Text style={styles.subtitle}>{s.nearbySubtitle(radius)}</Text>
            )}
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeTxt}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.radiusRow}>
          <Text style={styles.radiusLabel}>{s.nearbyRadius}</Text>
          {RADIUS_OPTIONS.map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.radiusChip, radius === r && styles.radiusChipActive]}
              onPress={() => setRadius(r)}
              activeOpacity={0.75}
            >
              <Text style={[styles.radiusChipTxt, radius === r && styles.radiusChipTxtActive]}>
                {r}km
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {locating ? (
          <View style={styles.center}>
            <ActivityIndicator color={Colors.green} size="large" />
            <Text style={styles.centerTxt}>{s.nearbyLocating}</Text>
          </View>
        ) : locError ? (
          <View style={styles.center}>
            <Text style={styles.emptyIcon}>📍</Text>
            <Text style={styles.emptyTitle}>{s.nearbyLocError}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={locate}>
              <Text style={styles.retryTxt}>{s.nearbyRetry}</Text>
            </TouchableOpacity>
          </View>
        ) : loading ? (
          <ActivityIndicator color={Colors.green} style={styles.loader} />
        ) : entries.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyIcon}>🏔️</Text>
            <Text style={styles.emptyTitle}>{s.nearbyEmpty}</Text>
            <Text style={styles.emptySub}>{s.nearbyEmptySub}</Text>
          </View>
        ) : (
          <FlatList<NearbyFlagEntry>
            data={entries}
            keyExtractor={(item: NearbyFlagEntry) => item.flag_id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
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
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 12,
  },
  titleBlock: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 20, fontWeight: '800', color: Colors.zinc950, letterSpacing: -0.4 },
  liveDot: {
    backgroundColor: Colors.green, paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: 8,
  },
  liveTxt: { fontSize: 10, fontWeight: '800', color: Colors.white, letterSpacing: 0.5 },
  subtitle: { fontSize: 13, color: Colors.zinc500, marginTop: 2 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.zinc100, alignItems: 'center', justifyContent: 'center',
  },
  closeTxt: { fontSize: 12, color: Colors.zinc800, fontWeight: '700' },
  radiusRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, paddingBottom: 12,
  },
  radiusLabel: { fontSize: 13, fontWeight: '600', color: Colors.zinc500 },
  radiusChip: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16,
    backgroundColor: Colors.zinc100, borderWidth: 1, borderColor: Colors.zinc200,
  },
  radiusChipActive: { backgroundColor: Colors.green + '18', borderColor: Colors.green },
  radiusChipTxt: { fontSize: 13, fontWeight: '600', color: Colors.zinc500 },
  radiusChipTxtActive: { color: Colors.green },
  loader: { marginTop: 48 },
  list: { paddingHorizontal: 16, paddingBottom: 48, paddingTop: 4 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.white, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    marginBottom: 8,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  avatar: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  avatarLetter: { fontSize: 17, fontWeight: '700', color: Colors.white },
  rowBody: { flex: 1, minWidth: 0 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  hikerName: { fontSize: 14, fontWeight: '700', color: Colors.zinc950, flexShrink: 1 },
  crewBadge: {
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, flexShrink: 0,
  },
  crewText: { fontSize: 11, fontWeight: '700' },
  summitText: { fontSize: 13, color: Colors.zinc500 },
  metaCol: { alignItems: 'flex-end', marginLeft: 8 },
  distText: { fontSize: 12, fontWeight: '700', color: Colors.green, marginBottom: 2 },
  agoText: { fontSize: 11, color: Colors.zinc500 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingBottom: 48 },
  centerTxt: { marginTop: 12, fontSize: 14, color: Colors.zinc500 },
  emptyIcon: { fontSize: 52, marginBottom: 16 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Colors.zinc800, textAlign: 'center', marginBottom: 8 },
  emptySub: { fontSize: 13, color: Colors.zinc500, textAlign: 'center', lineHeight: 19 },
  retryBtn: {
    marginTop: 16, paddingHorizontal: 24, paddingVertical: 10,
    backgroundColor: Colors.green, borderRadius: 20,
  },
  retryTxt: { fontSize: 14, fontWeight: '700', color: Colors.white },
});
