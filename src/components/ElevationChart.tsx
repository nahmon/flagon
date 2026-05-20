import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants';
import { GpsPoint } from '../types';
import { distanceMeters } from '../services/gps';

const CHART_H = 110;
const MAX_BARS = 80;

interface ElevPoint {
  distKm: number;
  elevM: number;
}

function elevColor(norm: number): string {
  if (norm < 0.35) return Colors.green;
  if (norm < 0.7) return Colors.greenLight;
  return Colors.orange;
}

function syntheticElevations(n: number, peakElev: number): number[] {
  const base = Math.max(0, peakElev - Math.min(peakElev * 0.45, 650));
  return Array.from({ length: n }, (_, i) => {
    const t = i / Math.max(n - 1, 1);
    const bell = Math.exp(-((t - 0.65) ** 2) / (2 * 0.09));
    return base + (peakElev - base) * bell;
  });
}

function buildProfile(
  track: GpsPoint[],
  peakElev: number | null,
): { points: ElevPoint[]; isSynthetic: boolean } {
  if (track.length < 2) return { points: [], isSynthetic: false };

  const realCount = track.filter((p) => p.alt != null).length;
  const useReal = realCount > track.length * 0.5;
  const elevations = useReal
    ? track.map((p) => p.alt ?? 0)
    : syntheticElevations(track.length, peakElev ?? 800);

  let cumDist = 0;
  const raw: ElevPoint[] = track.map((p, i) => {
    if (i > 0)
      cumDist +=
        distanceMeters(track[i - 1].lat, track[i - 1].lng, p.lat, p.lng) / 1000;
    return { distKm: cumDist, elevM: elevations[i] };
  });

  if (raw.length <= MAX_BARS) return { points: raw, isSynthetic: !useReal };
  const step = (raw.length - 1) / (MAX_BARS - 1);
  const sampled = Array.from({ length: MAX_BARS }, (_, i) => raw[Math.round(i * step)]);
  return { points: sampled, isSynthetic: !useReal };
}

interface Props {
  track: GpsPoint[];
  summitElevationM: number | null;
}

export default function ElevationChart({ track, summitElevationM }: Props) {
  const { points, isSynthetic } = useMemo(
    () => buildProfile(track, summitElevationM),
    [track, summitElevationM],
  ) as { points: ElevPoint[]; isSynthetic: boolean };

  if (points.length === 0) return null;

  const elevs = (points as ElevPoint[]).map((p: ElevPoint) => p.elevM);
  const minE = Math.min(...elevs);
  const maxE = Math.max(...elevs);
  const range = Math.max(maxE - minE, 1);
  const totalDist = points[points.length - 1].distKm.toFixed(1);
  const gain = Math.round(Math.max(0, maxE - elevs[0]));
  const drop = Math.round(Math.max(0, elevs[0] - elevs[elevs.length - 1]));

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>고도 프로필</Text>
        {isSynthetic && <Text style={styles.synthBadge}>추정</Text>}
      </View>

      <View style={[styles.chartArea, { height: CHART_H }]}>
        {(points as ElevPoint[]).map((pt: ElevPoint, i: number) => {
          const norm = (pt.elevM - minE) / range;
          const barH = Math.max(4, Math.round(norm * (CHART_H - 14)) + 4);
          return (
            <View
              key={i}
              style={[
                styles.bar,
                { flex: 1, height: barH, backgroundColor: elevColor(norm) },
              ]}
            />
          );
        })}
      </View>

      <View style={styles.xAxisRow}>
        <Text style={styles.axisLbl}>0 km</Text>
        <Text style={styles.axisLbl}>{totalDist} km</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCell}>
          <Text style={styles.statVal}>{Math.round(minE)}m</Text>
          <Text style={styles.statLbl}>최저</Text>
        </View>
        <View style={[styles.statCell, styles.cellBorder]}>
          <Text style={styles.statVal}>{Math.round(maxE)}m</Text>
          <Text style={styles.statLbl}>최고</Text>
        </View>
        <View style={[styles.statCell, styles.cellBorder]}>
          <Text style={[styles.statVal, styles.gainText]}>+{gain}m</Text>
          <Text style={styles.statLbl}>상승</Text>
        </View>
        <View style={[styles.statCell, styles.cellBorder]}>
          <Text style={[styles.statVal, styles.dropText]}>-{drop}m</Text>
          <Text style={styles.statLbl}>하강</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.zinc100,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  title: { fontSize: 14, fontWeight: '600', color: Colors.zinc800 },
  synthBadge: {
    marginLeft: 8,
    fontSize: 10,
    fontWeight: '600',
    color: Colors.orange,
    backgroundColor: '#FFF0EA',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  chartArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: Colors.zinc100,
    borderRadius: 8,
    overflow: 'hidden',
    paddingHorizontal: 2,
    paddingTop: 4,
  },
  bar: { borderTopLeftRadius: 2, borderTopRightRadius: 2 },
  xAxisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 12,
  },
  axisLbl: { fontSize: 10, color: Colors.zinc500 },
  statsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.zinc100,
    paddingTop: 12,
  },
  statCell: { flex: 1, alignItems: 'center' },
  cellBorder: { borderLeftWidth: 1, borderLeftColor: Colors.zinc100 },
  statVal: { fontSize: 14, fontWeight: '700', color: Colors.zinc950 },
  statLbl: { fontSize: 10, color: Colors.zinc500, marginTop: 2 },
  gainText: { color: Colors.green },
  dropText: { color: Colors.orange },
});
