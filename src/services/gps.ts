import * as Location from 'expo-location';
import { GPS } from '../constants';
import { GpsPoint, Summit } from '../types';

export function distanceMeters(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function nearestSummit(
  lat: number,
  lng: number,
  summits: Summit[],
): { summit: Summit; distanceM: number } | null {
  let best: { summit: Summit; distanceM: number } | null = null;
  for (const s of summits) {
    const d = distanceMeters(lat, lng, s.location.coordinates[1], s.location.coordinates[0]);
    if (!best || d < best.distanceM) best = { summit: s, distanceM: d };
  }
  return best;
}

export function isAtSummit(distanceM: number): boolean {
  return distanceM <= GPS.SUMMIT_RADIUS_M;
}

export function makeGpsPoint(pos: Location.LocationObject): GpsPoint {
  return {
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
    ts: new Date(pos.timestamp).toISOString(),
    accuracy: pos.coords.accuracy ?? undefined,
  };
}

export async function requestLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

export function startTracking(
  onPoint: (point: GpsPoint, pos: Location.LocationObject) => void,
): () => void {
  let stopped = false;
  let timeoutId: ReturnType<typeof setTimeout>;

  const tick = async () => {
    if (stopped) return;
    try {
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      if (!stopped) onPoint(makeGpsPoint(pos), pos);
    } catch {
      // silently skip failed GPS reads
    }
    if (!stopped) {
      timeoutId = setTimeout(tick, GPS.TRACK_INTERVAL_MS);
    }
  };

  tick();
  return () => {
    stopped = true;
    clearTimeout(timeoutId);
  };
}
