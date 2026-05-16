-- FlagOn Initial Schema
-- Run this in Supabase SQL Editor

-- Enable PostGIS for GPS queries
create extension if not exists postgis;

-- ──────────────────────────────────────────
-- USERS
-- ──────────────────────────────────────────
create table public.users (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null,
  avatar_url text,
  created_at timestamptz default now() not null
);
alter table public.users enable row level security;
create policy "Users can read all profiles" on public.users for select using (true);
create policy "Users can update own profile" on public.users for update using (auth.uid() = id);

-- Auto-create user profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ──────────────────────────────────────────
-- CREWS
-- ──────────────────────────────────────────
create table public.crews (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  name_ko text,
  color_hex text not null default '#4A7C59',
  icon_type text not null default 'SA', -- ME | SA | NK
  description text,
  created_by uuid references public.users(id),
  created_at timestamptz default now() not null
);
alter table public.crews enable row level security;
create policy "Crews are public" on public.crews for select using (true);
create policy "Authenticated users can create crews" on public.crews for insert with check (auth.uid() is not null);

create table public.crew_members (
  user_id uuid references public.users(id) on delete cascade,
  crew_id uuid references public.crews(id) on delete cascade,
  role text not null default 'member' check (role in ('leader', 'member')),
  joined_at timestamptz default now() not null,
  primary key (user_id, crew_id)
);
alter table public.crew_members enable row level security;
create policy "Crew members are public" on public.crew_members for select using (true);
create policy "Users can join crews" on public.crew_members for insert with check (auth.uid() = user_id);
create policy "Users can leave crews" on public.crew_members for delete using (auth.uid() = user_id);

-- ──────────────────────────────────────────
-- SUMMITS
-- ──────────────────────────────────────────
create table public.summits (
  id uuid primary key default gen_random_uuid(),
  name_ko text not null,
  name_en text,
  name_ja text,
  location geography(point, 4326) not null,
  elevation_m integer not null,
  country text not null default 'KR',
  mountain_group text, -- 국립공원명, 산군 등
  is_featured boolean default false,
  created_at timestamptz default now() not null
);
create index summits_location_idx on public.summits using gist(location);
create index summits_country_idx on public.summits(country);
alter table public.summits enable row level security;
create policy "Summits are public" on public.summits for select using (true);

-- Helper: find summits within radius (meters)
create or replace function public.summits_near(lat float, lng float, radius_m float default 5000)
returns setof public.summits language sql stable as $$
  select * from public.summits
  where st_dwithin(location, st_point(lng, lat)::geography, radius_m)
  order by st_distance(location, st_point(lng, lat)::geography);
$$;

-- ──────────────────────────────────────────
-- FLAGS
-- ──────────────────────────────────────────
create table public.flags (
  id uuid primary key default gen_random_uuid(),
  summit_id uuid references public.summits(id) not null,
  user_id uuid references public.users(id) not null,
  crew_id uuid references public.crews(id), -- null = 개인 깃발
  planted_at timestamptz default now() not null,
  expires_at timestamptz default now() + interval '7 days' not null,
  is_active boolean default true not null
);
create index flags_summit_active_idx on public.flags(summit_id) where is_active = true;
create index flags_crew_idx on public.flags(crew_id) where is_active = true;
create index flags_expires_idx on public.flags(expires_at) where is_active = true;
alter table public.flags enable row level security;
create policy "Active flags are public" on public.flags for select using (true);
create policy "Authenticated users can plant flags" on public.flags for insert with check (auth.uid() = user_id);

-- Expire old flags when new one is planted (same summit)
create or replace function public.deactivate_old_flags()
returns trigger language plpgsql security definer as $$
begin
  update public.flags
  set is_active = false
  where summit_id = new.summit_id
    and id != new.id
    and is_active = true;
  return new;
end;
$$;
create trigger on_flag_planted
  after insert on public.flags
  for each row execute function public.deactivate_old_flags();

-- ──────────────────────────────────────────
-- HIKES (GPS 인증 기록)
-- ──────────────────────────────────────────
create table public.hikes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) not null,
  summit_id uuid references public.summits(id),
  gps_track jsonb default '[]', -- [{lat, lng, ts, accuracy}]
  started_at timestamptz,
  summit_verified_at timestamptz, -- GPS 인증 완료 시각
  flag_planted boolean default false,
  created_at timestamptz default now() not null
);
alter table public.hikes enable row level security;
create policy "Users can read own hikes" on public.hikes for select using (auth.uid() = user_id);
create policy "Users can create hikes" on public.hikes for insert with check (auth.uid() = user_id);
create policy "Users can update own hikes" on public.hikes for update using (auth.uid() = user_id);

-- ──────────────────────────────────────────
-- LEADERBOARD VIEW
-- ──────────────────────────────────────────
create or replace view public.crew_leaderboard as
select
  c.id,
  c.name,
  c.name_ko,
  c.color_hex,
  c.icon_type,
  count(f.id) as flag_count,
  max(f.planted_at) as last_flag_at
from public.crews c
left join public.flags f on f.crew_id = c.id and f.is_active = true
group by c.id
order by flag_count desc;

-- ──────────────────────────────────────────
-- SEED: 서울 주요 정상 (테스트용)
-- ──────────────────────────────────────────
insert into public.summits (name_ko, name_en, location, elevation_m, country, mountain_group, is_featured) values
('백운대', 'Baegundae', st_point(126.9862, 37.6068)::geography, 836, 'KR', '북한산', true),
('인수봉', 'Insubong', st_point(126.9841, 37.6098)::geography, 810, 'KR', '북한산', true),
('만경대', 'Mangyeongdae', st_point(126.9897, 37.6127)::geography, 799, 'KR', '북한산', false),
('관악산', 'Gwanaksan', st_point(126.9636, 37.4449)::geography, 629, 'KR', '관악', true),
('도봉산', 'Dobongsan', st_point(127.0176, 37.6896)::geography, 739, 'KR', '도봉', true),
('청계산', 'Cheongyesan', st_point(127.0561, 37.4226)::geography, 618, 'KR', '청계', true),
('수락산', 'Suraksan', st_point(127.0756, 37.6731)::geography, 638, 'KR', '수락', false),
('아차산', 'Achasan', st_point(127.1036, 37.5592)::geography, 287, 'KR', '아차', false);
