export interface User {
  id: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
}

export interface Crew {
  id: string;
  name: string;
  name_ko: string | null;
  color_hex: string;
  icon_type: 'ME' | 'SA' | 'NK';
  description: string | null;
  invite_code?: string;
  created_by: string | null;
  created_at: string;
}

export interface CrewMember {
  user_id: string;
  crew_id: string;
  role: 'leader' | 'member';
  joined_at: string;
}

export interface Summit {
  id: string;
  name_ko: string;
  name_en: string | null;
  name_ja: string | null;
  location: { type: 'Point'; coordinates: [number, number] }; // [lng, lat]
  elevation_m: number;
  country: string;
  mountain_group: string | null;
  is_featured: boolean;
  created_at: string;
}

export interface Flag {
  id: string;
  summit_id: string;
  user_id: string;
  crew_id: string | null;
  planted_at: string;
  expires_at: string;
  is_active: boolean;
}

export interface Hike {
  id: string;
  user_id: string;
  summit_id: string | null;
  gps_track: GpsPoint[];
  started_at: string | null;
  summit_verified_at: string | null;
  flag_planted: boolean;
  created_at: string;
}

export interface GpsPoint {
  lat: number;
  lng: number;
  ts: string;
  accuracy?: number;
}

export interface CrewLeaderboardEntry {
  id: string;
  name: string;
  name_ko: string | null;
  color_hex: string;
  icon_type: string;
  flag_count: number;
  last_flag_at: string | null;
}

export interface RecentFlag {
  id: string;
  planted_at: string;
  expires_at: string;
  is_active: boolean;
  summit: { id: string; name_ko: string; name_en: string | null; elevation_m: number } | null;
}

export interface CrewMemberDetail {
  user_id: string;
  role: 'leader' | 'member';
  joined_at: string;
  display_name: string;
  avatar_url: string | null;
  flag_count: number;
}

// Map marker with flag info
export interface SummitWithFlag extends Summit {
  active_flag?: Flag & {
    crew?: Crew;
    user?: Pick<User, 'id' | 'display_name'>;
  };
}
