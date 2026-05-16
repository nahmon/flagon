-- Crew leaderboard: crews ranked by active flag count
create or replace function public.crew_leaderboard()
returns table (
  id uuid,
  name text,
  name_ko text,
  color_hex text,
  icon_type text,
  flag_count bigint,
  last_flag_at timestamptz
) language sql security definer as $$
  select
    c.id,
    c.name,
    c.name_ko,
    c.color_hex,
    c.icon_type,
    count(f.id)      as flag_count,
    max(f.planted_at) as last_flag_at
  from public.crews c
  left join public.flags f on f.crew_id = c.id and f.is_active = true
  group by c.id
  order by flag_count desc, last_flag_at desc nulls last;
$$;

-- User profile summary
create or replace function public.user_profile(p_user_id uuid)
returns table (
  display_name text,
  avatar_url text,
  crew_id uuid,
  crew_name text,
  crew_name_ko text,
  crew_color_hex text,
  crew_icon_type text,
  flag_count bigint
) language sql security definer as $$
  select
    u.display_name,
    u.avatar_url,
    c.id            as crew_id,
    c.name          as crew_name,
    c.name_ko       as crew_name_ko,
    c.color_hex     as crew_color_hex,
    c.icon_type     as crew_icon_type,
    count(f.id)     as flag_count
  from public.users u
  left join public.crew_members cm on cm.user_id = u.id
  left join public.crews c on c.id = cm.crew_id
  left join public.flags f on f.user_id = u.id and f.is_active = true
  where u.id = p_user_id
  group by u.display_name, u.avatar_url, c.id, c.name, c.name_ko, c.color_hex, c.icon_type;
$$;
