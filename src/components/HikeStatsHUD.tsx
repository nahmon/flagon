import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants';
import { useHikeStore, type HikeState } from '../stores/hikeStore';
import { distanceMeters } from '../services/gps';
import { GpsPoint } from '../types';
import { useLang } from '../contexts/LangContext';
import { t } from '../i18n/strings';
import LiveHikeBroadcastBadge from './LiveHikeBroadcastBadge';

function totalDistanceKm(track: GpsPoint[]): number {
  if (track.length < 2) return 0;
  let d = 0;
  for (let i = 1; i < track.length; i++) {
    d += distanceMeters(track[i - 1].lat, track[i - 1].lng, track[i].lat, track[i].lng);
  }
  return d / 1000;
}

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function paceStr(distKm: number, elapsedMs: number): string {
  if (distKm < 0.05) return '--:--';
  const minPerKm = elapsedMs / 60_000 / distKm;
  const m = Math.floor(minPerKm);
  const s = Math.round((minPerKm - m) * 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function HikeStatsHUD() {
  const { lang } = useLang();
  const s = t(lang);
  const phase = useHikeStore((st: HikeState) => st.phase);
  const track = useHikeStore((st: HikeState) => st.track);
  const elevationGainM = useHikeStore((st: HikeState) => st.elevationGainM);

  const [elapsedMs, setElapsedMs] = useState(0);
  const startTsRef = useRef<number | null>(null);

  useEffect(() => {
    if (phase === 'idle' || phase === 'planted') {
      startTsRef.current = null;
      setElapsedMs(0);
      return;
    }
    if (track.length > 0 && startTsRef.current === null) {
      startTsRef.current = new Date(track[0].ts).getTime();
    }
  }, [phase, track]);

  useEffect(() => {
    if (phase === 'idle' || phase === 'planted' || phase === 'verified') return;
    const id = setInterval(() => {
      if (startTsRef.current !== null) {
        setElapsedMs(Date.now() - startTsRef.current);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  if (phase === 'idle' || phase === 'planted' || phase === 'verified') return null;

  const distKm = totalDistanceKm(track);
  const distDisplay = distKm < 1
    ? `${Math.round(distKm * 1000)}m`
    : s.hikeStatsKm(distKm.toFixed(2));

  return (
    <View style={styles.hud}>
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.value}>{distDisplay}</Text>
          <Text style={styles.label}>{s.hikeStatsDistance}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.stat}>
          <Text style={styles.value}>{formatElapsed(elapsedMs)}</Text>
          <Text style={styles.label}>{s.hikeStatsTime}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.stat}>
          <Text style={styles.value}>{paceStr(distKm, elapsedMs)}</Text>
          <Text style={styles.label}>{`${s.hikeStatsPace} (${s.hikeStatsPaceUnit})`}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.stat}>
          <Text style={styles.value}>{s.hikeStatsElevGain(elevationGainM)}</Text>
          <Text style={styles.label}>{s.hikeStatsElev}</Text>
        </View>
      </View>
      <LiveHikeBroadcastBadge />
    </View>
  );
}

const styles = StyleSheet.create({
  hud: {
    position: 'absolute',
    top: 120,
    left: 16,
    right: 16,
    backgroundColor: Colors.green,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 15,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  value: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: -0.3,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.white,
    opacity: 0.75,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.white,
    opacity: 0.2,
  },
});
