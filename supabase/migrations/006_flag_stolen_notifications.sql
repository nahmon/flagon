-- Migration 006: "Flag stolen" notification system
-- When a crew's flag is displaced by another crew, all members of the
-- losing crew receive a notification row. The app polls for unread
-- notifications on startup and fires a local push notification.

-- ── Notifications table ────────────────────────────────────────────────────
create table public.notifications (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        references public.users(id) on delete cascade not null,
  type       text        not null,   -- 'flag_stolen'
  payload    jsonb       not null default '{}',
  read_at    timestamptz,
  created_at timestamptz default now() not null
);

create index notifications_user_unread_idx
  on public.notifications(user_id)
  where read_at is null;

alter table public.notifications enable row level security;
create policy "Users can read own notifications"
  on public.notifications for select using (auth.uid() = user_id);
create policy "Users can mark own notifications read"
  on public.notifications for update using (auth.uid() = user_id);

-- ── Update deactivate_old_flags trigger to also insert notifications ───────
-- Replaces the function from migration 001.
create or replace function public.deactivate_old_flags()
returns trigger language plpgsql security definer as $$
declare
  old_flag      record;
  victim_member record;
  summit_name   text;
begin
  -- Only notify when the new flag belongs to a different crew
  select name_ko into summit_name
  from public.summits
  where id = new.summit_id;

  -- For each currently-active flag on this summit from a different crew:
  for old_flag in
    select f.*
    from public.flags f
    where f.summit_id = new.summit_id
      and f.id != new.id
      and f.is_active = true
      and f.crew_id is distinct from new.crew_id
  loop
    if old_flag.crew_id is not null then
      -- Notify every member of the displaced crew
      for victim_member in
        select cm.user_id
        from public.crew_members cm
        where cm.crew_id = old_flag.crew_id
      loop
        insert into public.notifications (user_id, type, payload)
        values (
          victim_member.user_id,
          'flag_stolen',
          jsonb_build_object(
            'summit_name',      summit_name,
            'summit_id',        new.summit_id,
            'attacker_crew_id', new.crew_id
          )
        );
      end loop;
    end if;
  end loop;

  -- Deactivate all other active flags on this summit
  update public.flags
  set is_active = false
  where summit_id = new.summit_id
    and id != new.id
    and is_active = true;

  return new;
end;
$$;
-- Trigger already exists from migration 001 (on_flag_planted) — no need to recreate.
