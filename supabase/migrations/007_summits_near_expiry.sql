-- Migration 007: Add planted_at and expires_at to summits_near RPC
-- Needed for the map summit card to show the flag expiry countdown.

create or replace function public.summits_near(lat float, lng float, radius_m float default 10000)
returns table (
  id uuid,
  name_ko text,
  name_en text,
  name_ja text,
  location jsonb,
  elevation_m int,
  country text,
  mountain_group text,
  is_featured boolean,
  created_at timestamptz,
  flag_id uuid,
  flag_planted_at timestamptz,
  flag_expires_at timestamptz,
  crew_id uuid,
  crew_color_hex text,
  crew_name text,
  crew_name_ko text,
  crew_icon_type text
) language sql stable security definer as $$
  select
    s.id,
    s.name_ko,
    s.name_en,
    s.name_ja,
    ST_AsGeoJSON(s.location)::jsonb as location,
    s.elevation_m,
    s.country,
    s.mountain_group,
    s.is_featured,
    s.created_at,
    f.id          as flag_id,
    f.planted_at  as flag_planted_at,
    f.expires_at  as flag_expires_at,
    c.id          as crew_id,
    c.color_hex   as crew_color_hex,
    c.name        as crew_name,
    c.name_ko     as crew_name_ko,
    c.icon_type   as crew_icon_type
  from public.summits s
  left join lateral (
    select * from public.flags
    where summit_id = s.id
      and is_active = true
      and expires_at > now()
    limit 1
  ) f on true
  left join public.crews c on c.id = f.crew_id
  where st_dwithin(s.location, st_point(lng, lat)::geography, radius_m)
  order by st_distance(s.location, st_point(lng, lat)::geography);
$$;
