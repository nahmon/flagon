import { useEffect, useRef, useState, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, Animated } from 'react-native';
import { Map, Camera, GeoJSONSource, Layer, UserLocation, type CameraRef } from '@maplibre/maplibre-react-native';
import * as Location from 'expo-location';
import { Colors, MAP, GPS } from '../../src/constants';
import { SummitWithFlag } from '../../src/types';
import { fetchSummitsNear, summitsToGeoJSON } from '../../src/services/summits';
import { plantFlag, getUserCrewId } from '../../src/services/flags';
import { useHikeStore, stayProgressPct } from '../../src/stores/hikeStore';
import { useHiking } from '../../src/hooks/useHiking';
import { requestLocationPermission, distanceMeters } from '../../src/services/gps';

const CARTO_POSITRON = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
const SEOUL: [number, number] = [MAP.DEFAULT_CENTER.lng, MAP.DEFAULT_CENTER.lat];

export default function MapScreen() {
  const cameraRef = useRef<CameraRef>(null);
  const [locationGranted, setLocationGranted] = useState(false);
  const [summits, setSummits] = useState<SummitWithFlag[]>([]);
  const [geojson, setGeojson] = useState<GeoJSON.FeatureCollection>({ type: 'FeatureCollection', features: [] });
  const [planting, setPlanting] = useState(false);
  const [selectedSummit, setSelectedSummit] = useState<SummitWithFlag | null>(null);
  const plantAnim = useRef(new Animated.Value(0)).current;

  const hike = useHiking(summits);
  const phase = useHikeStore((s) => s.phase);
  const nearestSummit = useHikeStore((s) => s.nearestSummit);
  const stayStartedAt = useHikeStore((s) => s.stayStartedAt);
  const stayElapsedMs = useHikeStore((s) => s.stayElapsedMs);

  // Load summits on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      const granted = await requestLocationPermission();
      if (!mounted) return;
      setLocationGranted(granted);

      let lat: number = MAP.DEFAULT_CENTER.lat;
      let lng: number = MAP.DEFAULT_CENTER.lng;

      if (granted) {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        lat = loc.coords.latitude;
        lng = loc.coords.longitude;
        cameraRef.current?.flyTo({ center: [lng, lat], zoom: 12, duration: 800 });
      }

      try {
        const data = await fetchSummitsNear(lat, lng);
        if (mounted) {
          setSummits(data);
          setGeojson(summitsToGeoJSON(data));
        }
      } catch (e) {
        console.error('[summits]', e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Plant flag success animation
  useEffect(() => {
    if (phase === 'planted') {
      Animated.spring(plantAnim, { toValue: 1, useNativeDriver: true, tension: 50, friction: 7 }).start();
    }
  }, [phase]);

  const refreshSummits = useCallback(async (lat: number, lng: number) => {
    try {
      const data = await fetchSummitsNear(lat, lng);
      setSummits(data);
      setGeojson(summitsToGeoJSON(data));
    } catch (e) {
      console.error('[summits refresh]', e);
    }
  }, []);

  const handlePlantFlag = useCallback(async () => {
    if (!nearestSummit || planting) return;
    setPlanting(true);
    try {
      const crewId = await getUserCrewId();
      await plantFlag(nearestSummit.id, crewId);
      useHikeStore.getState().markPlanted();
      // Refresh summits so map shows new crew color immediately
      const state = useHikeStore.getState();
      if (state.currentLat && state.currentLng) {
        refreshSummits(state.currentLat, state.currentLng);
      }
    } catch (e) {
      Alert.alert('오류', '깃발 꽂기에 실패했습니다. 다시 시도해주세요.');
      console.error('[plantFlag]', e);
    } finally {
      setPlanting(false);
    }
  }, [nearestSummit, planting, refreshSummits]);

  const handleMapPress = useCallback((e: any) => {
    const [lng, lat] = e.geometry?.coordinates ?? [];
    if (lat == null || lng == null) return;
    let best: { summit: SummitWithFlag; dist: number } | null = null;
    for (const s of summits) {
      const dist = distanceMeters(lat, lng, s.location.coordinates[1], s.location.coordinates[0]);
      if (!best || dist < best.dist) best = { summit: s, dist };
    }
    if (best && best.dist < 1000) {
      setSelectedSummit(best.summit);
    } else {
      setSelectedSummit(null);
    }
  }, [summits]);

  const stayPct = stayProgressPct(stayElapsedMs, stayStartedAt);
  const remainingMin = Math.ceil((1 - stayPct) * GPS.MIN_STAY_MINUTES);

  return (
    <View style={styles.container}>
      <Map style={styles.map} mapStyle={CARTO_POSITRON} onPress={handleMapPress}>
        <Camera
          ref={cameraRef}
          initialViewState={{ center: SEOUL, zoom: MAP.DEFAULT_ZOOM }}
        />
        {locationGranted && <UserLocation animated />}

        <GeoJSONSource id="summits" data={geojson}>
          <Layer
            id="summit-dots"
            type="circle"
            paint={{
              'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 6, 14, 10],
              'circle-color': [
                'case',
                ['!=', ['get', 'crewColor'], null], ['get', 'crewColor'],
                Colors.zinc500,
              ],
              'circle-stroke-width': 2.5,
              'circle-stroke-color': Colors.white,
            }}
          />
          <Layer
            id="summit-labels"
            type="symbol"
            minzoom={11}
            layout={{
              'text-field': ['get', 'name'],
              'text-size': 11,
              'text-offset': [0, 1.5],
              'text-anchor': 'top',
              'text-font': ['Noto Sans Regular', 'Arial Unicode MS Regular'],
            }}
            paint={{
              'text-color': Colors.zinc800,
              'text-halo-color': Colors.white,
              'text-halo-width': 1.5,
            }}
          />
        </GeoJSONSource>
      </Map>

      {/* 정상 탭 정보 카드 */}
      {selectedSummit && (phase === 'idle' || phase === 'hiking') ? (
        <View style={styles.summitCard}>
          <View style={styles.summitCardRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.summitCardName}>{selectedSummit.name_ko}</Text>
              <Text style={styles.summitCardSub}>{selectedSummit.elevation_m}m</Text>
            </View>
            {selectedSummit.active_flag?.crew ? (
              <View style={[styles.crewBadge, { backgroundColor: selectedSummit.active_flag.crew.color_hex }]}>
                <Text style={styles.crewBadgeText}>{selectedSummit.active_flag.crew.name_ko ?? selectedSummit.active_flag.crew.name}</Text>
              </View>
            ) : (
              <View style={styles.crewBadge}>
                <Text style={[styles.crewBadgeText, { color: Colors.zinc500 }]}>무주공산</Text>
              </View>
            )}
          </View>
          <TouchableOpacity style={styles.cardClose} onPress={() => setSelectedSummit(null)}>
            <Text style={styles.cardCloseText}>✕</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* 정상 인증 오버레이 */}
      {phase === 'near_summit' && nearestSummit && (
        <View style={styles.overlay}>
          <Text style={styles.overlayTitle}>{nearestSummit.name_ko} 정상 근처</Text>
          <Text style={styles.overlaySubtitle}>
            {nearestSummit.elevation_m}m · 체류 {GPS.MIN_STAY_MINUTES}분 필요
          </Text>

          {/* 진행 바 */}
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${stayPct * 100}%` }]} />
          </View>
          <Text style={styles.progressLabel}>
            {stayPct >= 1 ? '인증 완료!' : `약 ${remainingMin}분 남음`}
          </Text>
        </View>
      )}

      {/* 깃발 꽂기 버튼 */}
      {phase === 'verified' && nearestSummit && (
        <View style={styles.overlay}>
          <Text style={styles.overlayTitle}>{nearestSummit.name_ko} 정상 인증!</Text>
          <Text style={styles.overlaySubtitle}>{GPS.MIN_STAY_MINUTES}분 체류 완료</Text>
          <TouchableOpacity
            style={[styles.plantBtn, planting && styles.plantBtnDisabled]}
            onPress={handlePlantFlag}
            disabled={planting}
          >
            <Text style={styles.plantBtnText}>
              {planting ? '처리 중...' : '🚩 깃발 꽂기'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 성공 메시지 */}
      {phase === 'planted' && nearestSummit && (
        <Animated.View
          style={[
            styles.overlay,
            styles.successOverlay,
            { transform: [{ scale: plantAnim }] },
          ]}
        >
          <Text style={styles.successEmoji}>🏔️</Text>
          <Text style={styles.successTitle}>{nearestSummit.name_ko} 정복!</Text>
          <Text style={styles.successSub}>크루를 위해 깃발을 꽂았습니다</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },

  overlay: {
    position: 'absolute',
    bottom: 32,
    left: 16,
    right: 16,
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    gap: 8,
  },
  overlayTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.zinc950,
  },
  overlaySubtitle: {
    fontSize: 13,
    color: Colors.zinc500,
  },

  progressTrack: {
    height: 6,
    backgroundColor: Colors.zinc100,
    borderRadius: 3,
    marginTop: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    backgroundColor: Colors.green,
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 12,
    color: Colors.zinc500,
    textAlign: 'right',
  },

  plantBtn: {
    marginTop: 4,
    height: 52,
    backgroundColor: Colors.green,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plantBtnDisabled: {
    opacity: 0.6,
  },
  plantBtnText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },

  successOverlay: {
    alignItems: 'center',
    backgroundColor: Colors.green,
  },
  successEmoji: {
    fontSize: 48,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.white,
  },
  successSub: {
    fontSize: 14,
    color: Colors.white,
    opacity: 0.85,
  },

  summitCard: {
    position: 'absolute',
    bottom: 32,
    left: 16,
    right: 16,
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  summitCardRow: { flexDirection: 'row', alignItems: 'center' },
  summitCardName: { fontSize: 18, fontWeight: '700', color: Colors.zinc950 },
  summitCardSub: { fontSize: 13, color: Colors.zinc500, marginTop: 2 },
  crewBadge: {
    backgroundColor: Colors.zinc200,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  crewBadgeText: { fontSize: 12, fontWeight: '600', color: Colors.white },
  cardClose: { position: 'absolute', top: -8, right: -8, width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.zinc200, alignItems: 'center', justifyContent: 'center' },
  cardCloseText: { fontSize: 10, color: Colors.zinc800, fontWeight: '700' },
});
