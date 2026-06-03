import { useEffect, useRef, useState } from 'react';
import { TouchableOpacity, Text, View, StyleSheet, Animated } from 'react-native';
import { Colors } from '../constants';
import { useHikeStore, type HikeState } from '../stores/hikeStore';
import { startBroadcast, stopBroadcast, updatePosition } from '../services/liveHike';
import { distanceMeters } from '../services/gps';
import { useLang } from '../contexts/LangContext';
import { t } from '../i18n/strings';
import { type GpsPoint } from '../types';

function totalDistanceKm(track: GpsPoint[]): number {
  if (track.length < 2) return 0;
  let d = 0;
  for (let i = 1; i < track.length; i++) {
    d += distanceMeters(track[i - 1].lat, track[i - 1].lng, track[i].lat, track[i].lng);
  }
  return d / 1000;
}

export default function LiveHikeBroadcastBadge() {
  const { lang } = useLang();
  const s = t(lang);
  const phase = useHikeStore((st: HikeState) => st.phase);
  const track = useHikeStore((st: HikeState) => st.track);
  const currentLat = useHikeStore((st: HikeState) => st.currentLat);
  const currentLng = useHikeStore((st: HikeState) => st.currentLng);
  const elevationGainM = useHikeStore((st: HikeState) => st.elevationGainM);
  const nearestSummit = useHikeStore((st: HikeState) => st.nearestSummit);

  const [broadcastId, setBroadcastId] = useState<string | null>(null);
  const startTsRef = useRef<number | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const isHiking = phase === 'hiking' || phase === 'near_summit' || phase === 'verified';

  useEffect(() => {
    if (!broadcastId) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.25, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [broadcastId, pulseAnim]);

  useEffect(() => {
    if (!broadcastId || !isHiking) return;
    const id = setInterval(() => {
      if (currentLat === null || currentLng === null) return;
      if (startTsRef.current === null && track.length > 0) {
        startTsRef.current = new Date(track[0].ts).getTime();
      }
      const elapsed = startTsRef.current ? Date.now() - startTsRef.current : 0;
      updatePosition(broadcastId, currentLat, currentLng, elevationGainM, totalDistanceKm(track), elapsed);
    }, 30_000);
    return () => clearInterval(id);
  }, [broadcastId, isHiking, currentLat, currentLng, elevationGainM, track]);

  useEffect(() => {
    if (phase === 'idle' || phase === 'planted') {
      if (broadcastId) {
        stopBroadcast(broadcastId);
        setBroadcastId(null);
        startTsRef.current = null;
      }
    }
  }, [phase, broadcastId]);

  if (!isHiking) return null;

  const handleToggle = async () => {
    if (broadcastId) {
      await stopBroadcast(broadcastId);
      setBroadcastId(null);
      startTsRef.current = null;
    } else {
      const id = await startBroadcast(
        nearestSummit?.name_ko,
        nearestSummit?.name_en ?? undefined,
      );
      if (id) {
        setBroadcastId(id);
        if (track.length > 0) startTsRef.current = new Date(track[0].ts).getTime();
      }
    }
  };

  return (
    <TouchableOpacity style={styles.wrap} onPress={handleToggle} activeOpacity={0.75}>
      {broadcastId ? (
        <View style={styles.liveBadge}>
          <Animated.View style={[styles.dot, { opacity: pulseAnim }]} />
          <Text style={styles.liveText}>{s.liveBroadcastLive}</Text>
        </View>
      ) : (
        <View style={styles.goLiveBadge}>
          <Text style={styles.goLiveText}>{s.liveBroadcastGoLive}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'center', marginTop: 6 },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E53E3E',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    gap: 5,
  },
  dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: Colors.white },
  liveText: { fontSize: 11, fontWeight: '800', color: Colors.white, letterSpacing: 0.8 },
  goLiveBadge: {
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.white,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  goLiveText: { fontSize: 11, fontWeight: '700', color: Colors.white, opacity: 0.85 },
});
