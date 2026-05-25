import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, Animated, Share } from 'react-native';
import { Map, Camera, GeoJSONSource, Layer, UserLocation, type CameraRef } from '@maplibre/maplibre-react-native';
import SummitSearchBar from '../../src/components/SummitSearchBar';
import SummitDetailSheet from '../../src/components/SummitDetailSheet';
import SummitFilterSheet, {
  SummitFilters,
  DEFAULT_FILTERS,
  countActiveFilters,
} from '../../src/components/SummitFilterSheet';
import MapStyleToggle from '../../src/components/MapStyleToggle';
import NearBySummitsList from '../../src/components/NearBySummitsList';
import * as Location from 'expo-location';
import { Colors, MAP, GPS } from '../../src/constants';
import { type MapStyleKey, loadMapStyle, saveMapStyle } from '../../src/services/mapStyle';
import { SummitWithFlag } from '../../src/types';
import { fetchSummitsNear, summitsToGeoJSON } from '../../src/services/summits';
import { plantFlag, getUserCrewId } from '../../src/services/flags';
import { supabase } from '../../src/services/supabase';
import { saveHike } from '../../src/services/hikes';
import { useHikeStore, stayProgressPct, type HikeState } from '../../src/stores/hikeStore';
import { useHiking } from '../../src/hooks/useHiking';
import { requestLocationPermission, distanceMeters } from '../../src/services/gps';
import { cacheSummits, loadCachedSummits } from '../../src/services/offlineCache';
import { useLang } from '../../src/contexts/LangContext';
import { t, summitName } from '../../src/i18n/strings';

const SEOUL: [number, number] = [MAP.DEFAULT_CENTER.lng, MAP.DEFAULT_CENTER.lat];

export default function MapScreen() {
  const { lang } = useLang();
  const s = t(lang);
  const cameraRef = useRef<CameraRef>(null);
  const [locationGranted, setLocationGranted] = useState(false);
  const [summits, setSummits] = useState<SummitWithFlag[]>([]);
  const [geojson, setGeojson] = useState<{ type: 'FeatureCollection'; features: unknown[] }>({ type: 'FeatureCollection', features: [] });
  const [planting, setPlanting] = useState(false);
  const [selectedSummit, setSelectedSummit] = useState<SummitWithFlag | null>(null);
  const [userCrewId, setUserCrewId] = useState<string | null>(null);
  const plantAnim = useRef(new Animated.Value(0)).current;

  const [isOffline, setIsOffline] = useState(false);
  const [detailSummit, setDetailSummit] = useState<SummitWithFlag | null>(null);
  const [filters, setFilters] = useState<SummitFilters>(DEFAULT_FILTERS);
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [mapStyle, setMapStyle] = useState<MapStyleKey>('outdoors');
  const [nearbyListVisible, setNearbyListVisible] = useState(false);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    loadMapStyle().then(setMapStyle).catch(() => {});
  }, []);

  const handleMapStyleToggle = useCallback((next: MapStyleKey) => {
    setMapStyle(next);
    saveMapStyle(next).catch(() => {});
  }, []);

  useEffect(() => {
    getUserCrewId().then(setUserCrewId).catch(() => {});
  }, []);

  // Apply client-side filters before rendering
  const filteredSummits = useMemo(() => summits.filter((summit: SummitWithFlag) => {
    if (filters.flagStatus === 'unclaimed' && summit.active_flag) return false;
    if (filters.flagStatus === 'own' && summit.active_flag?.crew_id !== userCrewId) return false;
    if (filters.flagStatus === 'other') {
      if (!summit.active_flag) return false;
      if (userCrewId && summit.active_flag.crew_id === userCrewId) return false;
    }
    const elev = summit.elevation_m;
    if (filters.elevation === 'low' && elev >= 500) return false;
    if (filters.elevation === 'mid' && (elev < 500 || elev > 1500)) return false;
    if (filters.elevation === 'high' && elev <= 1500) return false;
    return true;
  }), [summits, filters, userCrewId]);

  // Single source of truth: re-derive geojson whenever filtered summits, crew identity, or lang changes
  useEffect(() => {
    setGeojson(summitsToGeoJSON(filteredSummits, userCrewId, lang));
  }, [filteredSummits, userCrewId, lang]);

  const hike = useHiking(summits);
  const phase = useHikeStore((s: HikeState) => s.phase);
  const nearestSummit = useHikeStore((s: HikeState) => s.nearestSummit);
  const stayStartedAt = useHikeStore((s: HikeState) => s.stayStartedAt);
  const stayElapsedMs = useHikeStore((s: HikeState) => s.stayElapsedMs);

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
        if (mounted) setUserPos({ lat, lng });
        cameraRef.current?.flyTo({ center: [lng, lat], zoom: 12, duration: 800 });
      }

      try {
        const data = await fetchSummitsNear(lat, lng);
        if (mounted) {
          setSummits(data);
          setIsOffline(false);
          cacheSummits(data, lat, lng).catch(() => undefined);
        }
      } catch (e) {
        console.error('[summits]', e);
        if (!mounted) return;
        const cached = await loadCachedSummits().catch(() => null);
        if (cached && mounted) {
          setSummits(cached.summits);
          setIsOffline(true);
        }
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
      setIsOffline(false);
      cacheSummits(data, lat, lng).catch(() => undefined);
    } catch (e) {
      console.error('[summits refresh]', e);
    }
  }, [userCrewId]);

  // Realtime: refresh map when any flag changes
  useEffect(() => {
    const channel = supabase
      .channel('map-flags')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'flags' }, () => {
        const state = useHikeStore.getState();
        if (state.currentLat && state.currentLng) {
          refreshSummits(state.currentLat, state.currentLng);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refreshSummits]);

  const handlePlantFlag = useCallback(async () => {
    if (!nearestSummit || planting) return;
    setPlanting(true);
    try {
      const crewId = await getUserCrewId();
      await plantFlag(nearestSummit.id, crewId);

      const state = useHikeStore.getState();
      // Save GPS hike record to Supabase in background — don't block UI
      saveHike({
        summitId: nearestSummit.id,
        track: state.track,
        startedAt: state.track[0]?.ts ?? null,
        summitVerifiedAt: state.verifiedAt
          ? new Date(state.verifiedAt).toISOString()
          : null,
      }).catch((e) => console.error('[saveHike]', e));

      useHikeStore.getState().markPlanted();
      if (state.currentLat && state.currentLng) {
        refreshSummits(state.currentLat, state.currentLng);
      }
    } catch (e) {
      Alert.alert(s.error, s.errorPlanting);
      console.error('[plantFlag]', e);
    } finally {
      setPlanting(false);
    }
  }, [nearestSummit, planting, refreshSummits]);

  const handleMapPress = useCallback((e: any) => {
    const [lng, lat] = e.geometry?.coordinates ?? [];
    if (lat == null || lng == null) return;

    // Cluster tap: zoom in to expand
    const clusterFeature = (e.features ?? []).find(
      (f: any) => f.properties?.cluster === true || f.properties?.point_count != null
    );
    if (clusterFeature) {
      const [clusterLng, clusterLat] = clusterFeature.geometry?.coordinates ?? [lng, lat];
      cameraRef.current?.flyTo({ center: [clusterLng, clusterLat], zoom: 13, duration: 500 });
      return;
    }

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

  const handleSearchSelect = useCallback((summit: SummitWithFlag) => {
    const [lng, lat] = summit.location.coordinates;
    cameraRef.current?.flyTo({ center: [lng, lat], zoom: 13, duration: 600 });
    setSelectedSummit(summit);
  }, []);

  const stayPct = stayProgressPct(stayElapsedMs, stayStartedAt);
  const remainingMin = Math.ceil((1 - stayPct) * GPS.MIN_STAY_MINUTES);

  return (
    <View style={styles.container}>
      <Map style={styles.map} mapStyle={MAP.STYLE_URLS[mapStyle as keyof typeof MAP.STYLE_URLS]} onPress={handleMapPress}>
        <Camera
          ref={cameraRef}
          initialViewState={{ center: SEOUL, zoom: MAP.DEFAULT_ZOOM }}
        />
        {locationGranted && <UserLocation animated />}

        <GeoJSONSource
          id="summits"
          data={geojson}
          cluster
          clusterRadius={50}
          clusterMaxZoom={13}
        >
          {/* Cluster bubble */}
          <Layer
            id="cluster-circle"
            type="circle"
            filter={['has', 'point_count']}
            paint={{
              'circle-color': [
                'step', ['get', 'point_count'],
                Colors.greenLight, 5,
                Colors.green, 15,
                Colors.greenDark,
              ],
              'circle-radius': [
                'step', ['get', 'point_count'],
                18, 5,
                24, 15,
                30,
              ],
              'circle-stroke-width': 3,
              'circle-stroke-color': Colors.white,
            }}
          />
          {/* Cluster count label */}
          <Layer
            id="cluster-count"
            type="symbol"
            filter={['has', 'point_count']}
            layout={{
              'text-field': ['get', 'point_count_abbreviated'],
              'text-size': 13,
              'text-font': ['Noto Sans Regular', 'Arial Unicode MS Regular'],
            }}
            paint={{
              'text-color': Colors.white,
            }}
          />
          {/* Individual summit dots (unclustered) */}
          <Layer
            id="summit-dots"
            type="circle"
            filter={['!', ['has', 'point_count']]}
            paint={{
              'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 6, 14, 10],
              'circle-color': [
                'case',
                ['!=', ['get', 'crewColor'], null], ['get', 'crewColor'],
                Colors.zinc500,
              ],
              'circle-stroke-width': ['case', ['==', ['get', 'isOwnCrew'], 1], 3.5, 2.5],
              'circle-stroke-color': ['case', ['==', ['get', 'isOwnCrew'], 1], '#FFD700', Colors.white],
            }}
          />
          <Layer
            id="summit-labels"
            type="symbol"
            minzoom={11}
            filter={['!', ['has', 'point_count']]}
            layout={{
              'text-field': ['get', 'name'],
              'text-size': 11,
              'text-offset': [0, 1.5],
              'text-anchor': 'top',
              'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Regular'],
            }}
            paint={{
              'text-color': Colors.zinc800,
              'text-halo-color': Colors.white,
              'text-halo-width': 1.5,
            }}
          />
        </GeoJSONSource>
      </Map>

      {isOffline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>{s.offlineBanner}</Text>
        </View>
      )}

      <SummitSearchBar summits={filteredSummits} onSelect={handleSearchSelect} />

      <TouchableOpacity
        style={[styles.filterBtn, countActiveFilters(filters) > 0 && styles.filterBtnActive]}
        onPress={() => setFilterSheetVisible(true)}
        activeOpacity={0.8}
      >
        <Text style={[styles.filterBtnIcon, countActiveFilters(filters) > 0 && styles.filterBtnIconActive]}>
          {countActiveFilters(filters) > 0 ? `≡ ${countActiveFilters(filters)}` : '≡'}
        </Text>
      </TouchableOpacity>

      <SummitFilterSheet
        visible={filterSheetVisible}
        filters={filters}
        onFiltersChange={setFilters}
        onClose={() => setFilterSheetVisible(false)}
      />

      <MapStyleToggle current={mapStyle} onToggle={handleMapStyleToggle} topOffset={166} />

      <TouchableOpacity
        style={styles.listBtn}
        onPress={() => setNearbyListVisible(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.listBtnIcon}>☰</Text>
      </TouchableOpacity>

      <NearBySummitsList
        visible={nearbyListVisible}
        onClose={() => setNearbyListVisible(false)}
        summits={filteredSummits}
        userLat={userPos?.lat}
        userLng={userPos?.lng}
        onSelectSummit={(summit) => {
          const [lng, lat] = summit.location.coordinates;
          cameraRef.current?.flyTo({ center: [lng, lat], zoom: 14, duration: 600 });
          setDetailSummit(summit);
        }}
      />

      {/* Summit tap info card */}
      {selectedSummit && (phase === 'idle' || phase === 'hiking') ? (
        <View style={styles.summitCard}>
          <View style={styles.summitCardRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.summitCardName}>{summitName(selectedSummit, lang)}</Text>
              <Text style={styles.summitCardSub}>{selectedSummit.elevation_m}m</Text>
            </View>
            {selectedSummit.active_flag?.crew ? (
              <View style={[styles.crewBadge, { backgroundColor: selectedSummit.active_flag.crew.color_hex }]}>
                <Text style={styles.crewBadgeText}>{selectedSummit.active_flag.crew.name_ko ?? selectedSummit.active_flag.crew.name}</Text>
              </View>
            ) : (
              <View style={styles.crewBadge}>
                <Text style={[styles.crewBadgeText, { color: Colors.zinc500 }]}>{s.noOwner}</Text>
              </View>
            )}
          </View>
          {selectedSummit.active_flag?.expires_at ? (() => {
            const daysLeft = Math.ceil(
              (new Date(selectedSummit.active_flag.expires_at).getTime() - Date.now()) / 86_400_000
            );
            return (
              <Text style={styles.expiryText}>
                {daysLeft > 1 ? s.expiresInDays(daysLeft) : daysLeft === 1 ? s.expiresTomorrow : s.expiresToday}
              </Text>
            );
          })() : null}
          <TouchableOpacity style={styles.detailBtn} onPress={() => setDetailSummit(selectedSummit)}>
            <Text style={styles.detailBtnText}>자세히 보기 →</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cardClose} onPress={() => setSelectedSummit(null)}>
            <Text style={styles.cardCloseText}>✕</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <SummitDetailSheet summit={detailSummit} onClose={() => setDetailSummit(null)} />

      {/* Near summit overlay */}
      {phase === 'near_summit' && nearestSummit && (
        <View style={styles.overlay}>
          <Text style={styles.overlayTitle}>{s.summitNearTitle(summitName(nearestSummit, lang))}</Text>
          <Text style={styles.overlaySubtitle}>
            {nearestSummit.elevation_m}m · {s.stayMinRequired(GPS.MIN_STAY_MINUTES)}
          </Text>

          {/* progress bar */}
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${stayPct * 100}%` }]} />
          </View>
          <Text style={styles.progressLabel}>
            {stayPct >= 1 ? s.authComplete : s.minRemaining(remainingMin)}
          </Text>
        </View>
      )}

      {/* Plant flag button */}
      {phase === 'verified' && nearestSummit && (
        <View style={styles.overlay}>
          <Text style={styles.overlayTitle}>{s.summitVerifiedTitle(summitName(nearestSummit, lang))}</Text>
          <Text style={styles.overlaySubtitle}>{s.minutesStayed(GPS.MIN_STAY_MINUTES)}</Text>
          <TouchableOpacity
            style={[styles.plantBtn, planting && styles.plantBtnDisabled]}
            onPress={handlePlantFlag}
            disabled={planting}
          >
            <Text style={styles.plantBtnText}>
              {planting ? s.processing : `🚩 ${s.plantFlag}`}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Success overlay */}
      {phase === 'planted' && nearestSummit && (
        <Animated.View
          style={[
            styles.overlay,
            styles.successOverlay,
            { transform: [{ scale: plantAnim }] },
          ]}
        >
          <Text style={styles.successEmoji}>🏔️</Text>
          <Text style={styles.successTitle}>{s.summitConquered(summitName(nearestSummit, lang))}</Text>
          <Text style={styles.successSub}>{s.plantedForCrew}</Text>
          <View style={styles.successActions}>
            <TouchableOpacity
              style={styles.successShare}
              onPress={() => Share.share({ message: s.shareFlagPlanted(summitName(nearestSummit, lang)) })}
            >
              <Text style={styles.successShareText}>{s.shareFlag}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.successDismiss}
              onPress={() => useHikeStore.getState().reset()}
            >
              <Text style={styles.successDismissText}>{s.confirm}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },

  offlineBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.orange,
    paddingVertical: 6,
    alignItems: 'center',
    zIndex: 20,
  },
  offlineBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.white,
    letterSpacing: 0.2,
  },

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
  successActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  successShare: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: Colors.white,
    borderRadius: 20,
  },
  successShareText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.green,
  },
  successDismiss: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 20,
  },
  successDismissText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.white,
  },

  filterBtn: {
    position: 'absolute',
    top: 110,
    right: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 10,
  },
  filterBtnActive: {
    backgroundColor: Colors.green,
  },
  filterBtnIcon: {
    fontSize: 20,
    color: Colors.zinc800,
    fontWeight: '700',
  },
  filterBtnIconActive: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '700',
  },

  listBtn: {
    position: 'absolute',
    top: 162,
    right: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 10,
  },
  listBtnIcon: {
    fontSize: 18,
    color: Colors.zinc800,
    fontWeight: '700',
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
  expiryText: { fontSize: 12, color: Colors.zinc500, marginTop: 6 },
  detailBtn: { marginTop: 10, paddingVertical: 8, borderRadius: 10, backgroundColor: Colors.zinc100, alignItems: 'center' },
  detailBtnText: { fontSize: 13, fontWeight: '600', color: Colors.green },
  cardClose: { position: 'absolute', top: -8, right: -8, width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.zinc200, alignItems: 'center', justifyContent: 'center' },
  cardCloseText: { fontSize: 10, color: Colors.zinc800, fontWeight: '700' },
});
