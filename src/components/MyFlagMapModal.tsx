import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Camera, GeoJSONSource, Layer, Map, type CameraRef } from '@maplibre/maplibre-react-native';
import { Colors, MAP } from '../constants';
import { fetchFlagMapPins, type FlagMapPin } from '../services/myFlagMap';
import { useLang } from '../contexts/LangContext';
import { t, summitName } from '../i18n/strings';

const SEOUL: [number, number] = [MAP.DEFAULT_CENTER.lng, MAP.DEFAULT_CENTER.lat];

function hoursLeft(expiresAt: string): number {
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 3_600_000));
}

function distDeg(aLng: number, aLat: number, bLng: number, bLat: number): number {
  const dx = (aLng - bLng) * Math.cos(aLat * Math.PI / 180);
  const dy = aLat - bLat;
  return Math.sqrt(dx * dx + dy * dy);
}

interface Props { visible: boolean; onClose: () => void }

export default function MyFlagMapModal({ visible, onClose }: Props) {
  const { lang } = useLang();
  const s = t(lang);
  const cameraRef = useRef<CameraRef>(null);
  const [pins, setPins] = useState<FlagMapPin[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<FlagMapPin | null>(null);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    setSelected(null);
    fetchFlagMapPins()
      .then(setPins)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [visible]);

  useEffect(() => {
    if (pins.length === 0) return;
    if (pins.length === 1) {
      cameraRef.current?.flyTo({ center: [pins[0].lng, pins[0].lat], zoom: 12, duration: 700 });
      return;
    }
    const lngs = pins.map((p: FlagMapPin) => p.lng);
    const lats = pins.map((p: FlagMapPin) => p.lat);
    const cLng = (Math.max(...lngs) + Math.min(...lngs)) / 2;
    const cLat = (Math.max(...lats) + Math.min(...lats)) / 2;
    const span = Math.max(Math.max(...lngs) - Math.min(...lngs), Math.max(...lats) - Math.min(...lats));
    const zoom = span > 5 ? 5 : span > 2 ? 7 : span > 0.5 ? 9 : 11;
    cameraRef.current?.flyTo({ center: [cLng, cLat], zoom, duration: 700 });
  }, [pins]);

  const geojson = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: pins.map((p: FlagMapPin) => ({
      type: 'Feature' as const,
      id: p.id,
      geometry: { type: 'Point' as const, coordinates: [p.lng, p.lat] },
      properties: { flagId: p.id },
    })),
  }), [pins]);

  const handleMapPress = useCallback((e: any) => {
    const [lng, lat] = e.geometry?.coordinates ?? [];
    if (lng == null || lat == null) { setSelected(null); return; }
    let best: { pin: FlagMapPin; dist: number } | null = null;
    for (const p of pins) {
      const dist = distDeg(p.lng, p.lat, lng, lat);
      if (!best || dist < best.dist) best = { pin: p, dist };
    }
    setSelected(best && best.dist < 0.025 ? best.pin : null);
  }, [pins]);

  const hours = selected ? hoursLeft(selected.expires_at) : 0;
  const expiryLabel = selected
    ? (hours < 24 ? s.flagMapExpiresHours(hours) : s.flagMapExpiresDays(Math.ceil(hours / 24)))
    : '';

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{s.flagMapTitle}</Text>
            <Text style={styles.count}>{s.flagMapCount(pins.length)}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.closeTxt}>✕</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centered}><ActivityIndicator size="large" color={Colors.green} /></View>
        ) : (
          <View style={styles.mapWrap}>
            <Map style={styles.map} mapStyle={MAP.STYLE_URLS.outdoors} onPress={handleMapPress}>
              <Camera ref={cameraRef} initialViewState={{ center: SEOUL, zoom: MAP.DEFAULT_ZOOM }} />
              {pins.length > 0 && (
                <GeoJSONSource id="myflagmap" data={geojson}>
                  <Layer
                    id="myflagmap-dots"
                    type="circle"
                    paint={{
                      'circle-radius': 10,
                      'circle-color': Colors.green,
                      'circle-stroke-width': 2.5,
                      'circle-stroke-color': Colors.white,
                    }}
                  />
                  <Layer
                    id="myflagmap-icons"
                    type="symbol"
                    layout={{
                      'text-field': '🚩',
                      'text-size': 14,
                      'text-offset': [0, -0.1],
                      'text-anchor': 'center',
                    }}
                  />
                </GeoJSONSource>
              )}
            </Map>

            {pins.length === 0 && (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>{s.flagMapEmpty}</Text>
              </View>
            )}

            {selected && (
              <View style={styles.callout}>
                <View style={styles.calloutBody}>
                  <Text style={styles.calloutName}>{summitName(selected, lang)}</Text>
                  <Text style={styles.calloutElev}>{selected.elevation_m.toLocaleString()}m</Text>
                  <Text style={[styles.calloutExpiry, { color: hours < 24 ? Colors.orange : Colors.green }]}>
                    {expiryLabel}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setSelected(null)} style={styles.calloutClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.closeTxt}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.zinc200,
    backgroundColor: Colors.white,
  },
  title: { fontSize: 18, fontWeight: '700', color: Colors.zinc950 },
  count: { fontSize: 13, color: Colors.zinc500, marginTop: 2 },
  closeBtn: { padding: 4 },
  closeTxt: { fontSize: 18, color: Colors.zinc500 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mapWrap: { flex: 1 },
  map: { flex: 1 },
  empty: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: { fontSize: 15, color: Colors.zinc500, textAlign: 'center', paddingHorizontal: 40 },
  callout: {
    position: 'absolute',
    bottom: 32,
    left: 20,
    right: 20,
    backgroundColor: Colors.white,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  calloutBody: { flex: 1 },
  calloutName: { fontSize: 16, fontWeight: '700', color: Colors.zinc950 },
  calloutElev: { fontSize: 14, color: Colors.zinc500, marginTop: 2 },
  calloutExpiry: { fontSize: 13, fontWeight: '600', marginTop: 4 },
  calloutClose: { padding: 4 },
});
