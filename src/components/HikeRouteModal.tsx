import { useRef, useMemo, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import { Map, Camera, GeoJSONSource, Layer, type CameraRef } from '@maplibre/maplibre-react-native';
import { Colors, MAP } from '../constants';
import { GpsPoint } from '../types';
import ElevationChart from './ElevationChart';

export interface HikeRecord {
  id: string;
  summit_name: string | null;
  elevation_m: number | null;
  started_at: string | null;
  summit_verified_at: string | null;
  flag_planted: boolean;
  gps_track: GpsPoint[];
  created_at: string;
}

interface Props {
  visible: boolean;
  hike: HikeRecord | null;
  onClose: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GeoJSONFC = { type: 'FeatureCollection'; features: any[] };
function trackToGeoJSON(track: GpsPoint[]): GeoJSONFC {
  if (track.length < 2) return { type: 'FeatureCollection', features: [] };
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: track.map((p) => [p.lng, p.lat]) },
        properties: {},
      },
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [track[track.length - 1].lng, track[track.length - 1].lat] },
        properties: { type: 'end' },
      },
    ],
  };
}

function calcDistanceKm(track: GpsPoint[]): number {
  let total = 0;
  for (let i = 1; i < track.length; i++) {
    const a = track[i - 1];
    const b = track[i];
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const x =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    total += 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)) * 6371;
  }
  return total;
}

function trackBounds(track: GpsPoint[]): [number, number, number, number] | null {
  if (track.length === 0) return null;
  let w = track[0].lng, e = track[0].lng, s = track[0].lat, n = track[0].lat;
  for (const p of track) {
    if (p.lng < w) w = p.lng;
    if (p.lng > e) e = p.lng;
    if (p.lat < s) s = p.lat;
    if (p.lat > n) n = p.lat;
  }
  // Add 20% padding
  const dLng = (e - w) * 0.2 || 0.005;
  const dLat = (n - s) * 0.2 || 0.005;
  return [w - dLng, s - dLat, e + dLng, n + dLat];
}

function formatDuration(start: string, end: string): string {
  const mins = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60_000);
  if (mins < 60) return `${mins}분`;
  return `${Math.floor(mins / 60)}시간 ${mins % 60}분`;
}

export default function HikeRouteModal({ visible, hike, onClose }: Props) {
  const cameraRef = useRef<CameraRef>(null);
  const hasTrack = (hike?.gps_track.length ?? 0) >= 2;

  const geojson = useMemo(
    () => (hike ? trackToGeoJSON(hike.gps_track) : { type: 'FeatureCollection' as const, features: [] }),
    [hike],
  );

  const bounds = useMemo(() => (hike ? trackBounds(hike.gps_track) : null), [hike]);

  const center = useMemo<[number, number]>(() => {
    if (bounds) return [(bounds[0] + bounds[2]) / 2, (bounds[1] + bounds[3]) / 2];
    return [MAP.DEFAULT_CENTER.lng, MAP.DEFAULT_CENTER.lat];
  }, [bounds]);

  const distanceKm = useMemo(
    () => (hike ? calcDistanceKm(hike.gps_track).toFixed(1) : '0'),
    [hike],
  );

  const duration = useMemo(() => {
    if (!hike?.started_at || !hike?.summit_verified_at) return null;
    return formatDuration(hike.started_at, hike.summit_verified_at);
  }, [hike]);

  useEffect(() => {
    if (!visible || !bounds) return;
    const id = setTimeout(() => {
      cameraRef.current?.fitBounds(bounds, { padding: { top: 40, bottom: 40, left: 40, right: 40 }, duration: 600 });
    }, 300);
    return () => clearTimeout(id);
  }, [visible, bounds]);

  const dateLabel = hike?.started_at
    ? new Date(hike.started_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
    : hike?.created_at
    ? new Date(hike.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
    : '';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.handle} />

        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title} numberOfLines={1}>
              {hike?.summit_name ?? '등산 경로'}
            </Text>
            <Text style={styles.subtitle}>
              {hike?.elevation_m ? `${hike.elevation_m}m` : ''}
              {hike?.elevation_m && dateLabel ? '  ·  ' : ''}
              {dateLabel}
            </Text>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>닫기</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statVal}>{distanceKm} km</Text>
            <Text style={styles.statLbl}>이동 거리</Text>
          </View>
          {duration ? (
            <View style={[styles.stat, styles.statBorder]}>
              <Text style={styles.statVal}>{duration}</Text>
              <Text style={styles.statLbl}>소요 시간</Text>
            </View>
          ) : null}
          <View style={[styles.stat, styles.statBorder]}>
            <Text style={styles.statVal}>{hike?.flag_planted ? '🚩' : '—'}</Text>
            <Text style={styles.statLbl}>깃발</Text>
          </View>
        </View>

        <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
          <View style={styles.mapWrap}>
            {hasTrack ? (
              <Map style={styles.map} mapStyle={MAP.STYLE_URL}>
                <Camera
                  ref={cameraRef}
                  initialViewState={{ center, zoom: 13 }}
                />
                <GeoJSONSource id="hike-route" data={geojson}>
                  <Layer
                    id="hike-line"
                    type="line"
                    filter={['==', ['geometry-type'], 'LineString']}
                    layout={{ 'line-cap': 'round', 'line-join': 'round' }}
                    paint={{
                      'line-color': Colors.orange,
                      'line-width': 4,
                      'line-opacity': 0.9,
                    }}
                  />
                  <Layer
                    id="hike-end"
                    type="circle"
                    filter={['==', ['get', 'type'], 'end']}
                    paint={{
                      'circle-radius': 8,
                      'circle-color': Colors.green,
                      'circle-stroke-width': 2.5,
                      'circle-stroke-color': Colors.white,
                    }}
                  />
                </GeoJSONSource>
              </Map>
            ) : (
              <View style={styles.noRoute}>
                <Text style={styles.noRouteIcon}>🗺️</Text>
                <Text style={styles.noRouteText}>GPS 경로 데이터가 없습니다</Text>
                <Text style={styles.noRouteSub}>다음 등산부터 경로가 기록됩니다</Text>
              </View>
            )}
          </View>

          {hike && (
            <ElevationChart
              track={hike.gps_track}
              summitElevationM={hike.elevation_m}
            />
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.zinc200, alignSelf: 'center', marginTop: 8 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  headerText: { flex: 1 },
  title: { fontSize: 18, fontWeight: '700', color: Colors.zinc950 },
  subtitle: { fontSize: 13, color: Colors.zinc500, marginTop: 2 },
  closeBtn: { paddingVertical: 6, paddingHorizontal: 12, backgroundColor: Colors.zinc100, borderRadius: 8 },
  closeBtnText: { fontSize: 14, fontWeight: '600', color: Colors.zinc800 },
  statsRow: { flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: Colors.zinc100 },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  statBorder: { borderLeftWidth: 1, borderColor: Colors.zinc100 },
  statVal: { fontSize: 16, fontWeight: '700', color: Colors.zinc950 },
  statLbl: { fontSize: 11, color: Colors.zinc500, marginTop: 2 },
  scrollArea: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  mapWrap: { height: 240 },
  map: { flex: 1 },
  noRoute: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.zinc100 },
  noRouteIcon: { fontSize: 48, marginBottom: 12 },
  noRouteText: { fontSize: 16, fontWeight: '600', color: Colors.zinc800 },
  noRouteSub: { fontSize: 13, color: Colors.zinc500, marginTop: 4 },
});
