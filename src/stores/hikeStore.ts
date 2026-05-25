import { create } from 'zustand';
import { Summit, GpsPoint } from '../types';
import { GPS } from '../constants';

export type HikePhase =
  | 'idle'          // 등산 시작 전
  | 'hiking'        // 이동 중
  | 'near_summit'   // 정상 150m 이내 — 타이머 카운트 시작
  | 'verified'      // 20분 체류 완료 — 깃발 꽂기 가능
  | 'planted';      // 깃발 꽂기 완료

export interface HikeState {
  phase: HikePhase;
  track: GpsPoint[];
  currentLat: number | null;
  currentLng: number | null;
  nearestSummit: Summit | null;
  nearestDistanceM: number | null;
  stayStartedAt: number | null;    // Date.now() when entered summit radius
  stayElapsedMs: number;           // accumulated ms at summit
  verifiedAt: number | null;       // Date.now() when summit was verified

  // Actions
  setLocation: (lat: number, lng: number, point: GpsPoint) => void;
  setSummitProximity: (summit: Summit | null, distanceM: number | null) => void;
  enterSummitRadius: (summit: Summit) => void;
  exitSummitRadius: () => void;
  tickStayTimer: () => void;
  markVerified: () => void;
  markPlanted: () => void;
  reset: () => void;
}

const STAY_REQUIRED_MS = GPS.MIN_STAY_MINUTES * 60 * 1000;

export const useHikeStore = create<HikeState>((set: (partial: Partial<HikeState> | ((s: HikeState) => Partial<HikeState>)) => void, get: () => HikeState) => ({
  phase: 'idle',
  track: [],
  currentLat: null,
  currentLng: null,
  nearestSummit: null,
  nearestDistanceM: null,
  stayStartedAt: null,
  stayElapsedMs: 0,
  verifiedAt: null,

  setLocation: (lat: number, lng: number, point: GpsPoint) =>
    set((s: HikeState) => ({
      currentLat: lat,
      currentLng: lng,
      phase: s.phase === 'idle' ? 'hiking' : s.phase,
      track: [...s.track, point],
    })),

  setSummitProximity: (summit: Summit | null, distanceM: number | null) =>
    set({ nearestSummit: summit, nearestDistanceM: distanceM }),

  enterSummitRadius: (summit: Summit) =>
    set((s: HikeState) => ({
      nearestSummit: summit,
      phase: s.phase === 'hiking' || s.phase === 'idle' ? 'near_summit' : s.phase,
      stayStartedAt: s.stayStartedAt ?? Date.now(),
    })),

  exitSummitRadius: () =>
    set((s: HikeState) => {
      if (s.phase !== 'near_summit') return {};
      const elapsed = s.stayStartedAt ? Date.now() - s.stayStartedAt : 0;
      return {
        phase: 'hiking',
        stayStartedAt: null,
        stayElapsedMs: s.stayElapsedMs + elapsed,
      };
    }),

  tickStayTimer: () => {
    const s = get();
    if (s.phase !== 'near_summit' || !s.stayStartedAt) return;
    const totalMs = s.stayElapsedMs + (Date.now() - s.stayStartedAt);
    if (totalMs >= STAY_REQUIRED_MS) {
      set({ phase: 'verified', stayElapsedMs: STAY_REQUIRED_MS });
    } else {
      // Snapshot elapsed time + reset stayStartedAt so exitSummitRadius
      // doesn't double-count, and forces a Zustand re-render for progress bar
      set({ stayElapsedMs: totalMs, stayStartedAt: Date.now() });
    }
  },

  markVerified: () => set({ phase: 'verified', verifiedAt: Date.now() }),
  markPlanted: () => set({ phase: 'planted' }),

  reset: () =>
    set({
      phase: 'idle',
      track: [],
      currentLat: null,
      currentLng: null,
      nearestSummit: null,
      nearestDistanceM: null,
      stayStartedAt: null,
      stayElapsedMs: 0,
      verifiedAt: null,
    }),
}));

export const stayProgressPct = (elapsedMs: number, startedAt: number | null): number => {
  const total = elapsedMs + (startedAt ? Date.now() - startedAt : 0);
  return Math.min(total / STAY_REQUIRED_MS, 1);
};
