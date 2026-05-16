// Design tokens — AllTrails + Strava hybrid
export const Colors = {
  // Brand
  green: '#2D6A4F',
  greenLight: '#4A7C59',
  greenDark: '#1A3D2B',
  cream: '#F8F5F0',
  orange: '#FC4C02',
  orangeLight: '#FF6B35',

  // Crew
  crewMe: '#C0704A',
  crewSA: '#4A7C59',
  crewNK: '#5B7FA6',

  // Neutrals
  zinc950: '#09090B',
  zinc800: '#27272A',
  zinc500: '#71717A',
  zinc200: '#E4E4E7',
  zinc100: '#F4F4F5',
  white: '#FFFFFF',

  // Pole ornament
  poleGold: '#D4B060',
} as const;

export const Fonts = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
  // Will add Poppins for logo, Geist for body after font loading
} as const;

// GPS verification config
export const GPS = {
  SUMMIT_RADIUS_M: 150,         // 정상 인증 반경 (미터)
  MIN_STAY_MINUTES: 20,          // 최소 체류 시간
  TRACK_INTERVAL_MS: 30_000,    // GPS 기록 간격 (30초)
  NEAR_SUMMIT_RADIUS_M: 500,    // "가까워지고 있음" 알림 반경
} as const;

// Flag config
export const FLAG = {
  EXPIRY_DAYS: 7,
} as const;

// Map config (CARTO Positron)
export const MAP = {
  TILE_URL: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  DEFAULT_CENTER: { lat: 37.5665, lng: 126.9780 }, // 서울
  DEFAULT_ZOOM: 11,
  SUMMIT_VISIBLE_ZOOM: 10,
} as const;

// Supabase — fill in after creating project
export const SUPABASE = {
  URL: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
} as const;
