import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useHikeStore } from '../stores/hikeStore';
import { startTracking, nearestSummit, isAtSummit } from '../services/gps';
import { requestNotificationPermission, notifySummitNear, notifySummitVerified } from '../services/notifications';
import { SummitWithFlag } from '../types';
import { GPS } from '../constants';

export function useHiking(summits: SummitWithFlag[]) {
  const store = useHikeStore();
  const summitsRef = useRef(summits);
  summitsRef.current = summits;

  // Request notification permission on mount
  useEffect(() => { requestNotificationPermission(); }, []);

  // Notify when verified
  const phase = useHikeStore((s) => s.phase);
  const nearestSummitRef = useRef(useHikeStore.getState().nearestSummit);
  useEffect(() => {
    nearestSummitRef.current = useHikeStore.getState().nearestSummit;
  });
  useEffect(() => {
    if (phase === 'verified') {
      const summit = useHikeStore.getState().nearestSummit;
      if (summit) notifySummitVerified(summit.name_ko).catch(() => {});
    }
  }, [phase]);

  // Tick stay timer every 5 seconds
  useEffect(() => {
    const id = setInterval(() => {
      useHikeStore.getState().tickStayTimer();
    }, 5_000);
    return () => clearInterval(id);
  }, []);

  // GPS tracking
  useEffect(() => {
    const stop = startTracking((point, pos) => {
      const { latitude: lat, longitude: lng } = pos.coords;
      store.setLocation(lat, lng, point);

      const result = nearestSummit(lat, lng, summitsRef.current);
      if (!result) return;

      store.setSummitProximity(result.summit, result.distanceM);

      const state = useHikeStore.getState();
      if (isAtSummit(result.distanceM)) {
        if (state.phase === 'hiking' || state.phase === 'idle') {
          store.enterSummitRadius(result.summit);
          notifySummitNear(result.summit.name_ko).catch(() => {});
        }
      } else {
        if (state.phase === 'near_summit') {
          store.exitSummitRadius();
        }
      }
    });

    return stop;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Pause/resume timer on app background
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      const hike = useHikeStore.getState();
      if (state !== 'active' && hike.phase === 'near_summit') {
        hike.exitSummitRadius();
      }
    });
    return () => sub.remove();
  }, []);

  return store;
}
