-- Migration 005: Flag auto-expiry via pg_cron
-- Flags expire 7 days after planting. This migration:
-- 1. Adds a function to mark expired flags as inactive
-- 2. Schedules it hourly via pg_cron
-- 3. Updates leaderboard/profile RPCs to also filter by expires_at (safety net)

-- ── Expiry function ────────────────────────────────────────────────────────
create or replace function public.expire_stale_flags()
returns int language plpgsql security definer as $$
declare
  rows_updated int;
begin
  update public.flags
  set is_active = false
  where is_active = true
    and expires_at < now();

  get diagnostics rows_updated = row_count;
  return rows_updated;
end;
$$;

-- ── pg_cron: run every hour at :00 ────────────────────────────────────────
-- pg_cron is enabled by default on Supabase. If you get an error here,
-- enable it in the Supabase dashboard → Database → Extensions → pg_cron.
select cron.schedule(
  'expire-stale-flags',          -- job name (idempotent)
  '0 * * * *',                   -- every hour on the hour
  $$ select public.expire_stale_flags(); $$
);

-- ── Update RPCs to also filter by expires_at (belt-and-suspenders) ────────
-- crew_leaderboard: count only flags where is_active AND not yet expired
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
    count(f.id)       as flag_count,
    max(f.planted_at) as last_flag_at
  from public.crews c
  left join public.flags f
    on f.crew_id = c.id
    and f.is_active = true
    and f.expires_at > now()
  group by c.id
  order by flag_count desc, last_flag_at desc nulls last;
$$;

-- user_profile: same treatment
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
  left join public.flags f
    on f.user_id = u.id
    and f.is_active = true
    and f.expires_at > now()
  where u.id = p_user_id
  group by u.display_name, u.avatar_url, c.id, c.name, c.name_ko, c.color_hex, c.icon_type;
$$;
