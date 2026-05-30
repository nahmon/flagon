-- Migration 010: Notify crew members + previous summit flaggers when a flag is planted
-- Extends the deactivate_old_flags trigger from migration 006.
-- New notification types:
--   flag_planted_crew    — a crew member planted a flag (notify other members)
--   flag_planted_summit  — someone planted on a summit you've flagged before

CREATE OR REPLACE FUNCTION public.deactivate_old_flags()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  old_flag      record;
  victim_member record;
  crew_member   record;
  prev_flagger  record;
  summit_name   text;
  planter_name  text;
BEGIN
  SELECT name_ko INTO summit_name FROM public.summits WHERE id = new.summit_id;
  SELECT display_name INTO planter_name FROM public.users WHERE id = new.user_id;

  -- 1. Notify crew members when a fellow member plants a flag
  IF new.crew_id IS NOT NULL THEN
    FOR crew_member IN
      SELECT cm.user_id FROM public.crew_members cm
      WHERE cm.crew_id = new.crew_id AND cm.user_id != new.user_id
    LOOP
      INSERT INTO public.notifications (user_id, type, payload)
      VALUES (
        crew_member.user_id,
        'flag_planted_crew',
        jsonb_build_object(
          'summit_name',  summit_name,
          'summit_id',    new.summit_id,
          'planter_id',   new.user_id,
          'planter_name', planter_name,
          'crew_id',      new.crew_id
        )
      );
    END LOOP;
  END IF;

  -- 2. Notify users who previously planted a flag on this summit (last 90 days),
  --    excluding planter and their own crew members
  FOR prev_flagger IN
    SELECT DISTINCT f.user_id
    FROM public.flags f
    WHERE f.summit_id = new.summit_id
      AND f.user_id != new.user_id
      AND f.planted_at > now() - interval '90 days'
      AND NOT EXISTS (
        SELECT 1 FROM public.crew_members cm
        WHERE cm.user_id = f.user_id
          AND cm.crew_id = new.crew_id
      )
  LOOP
    INSERT INTO public.notifications (user_id, type, payload)
    VALUES (
      prev_flagger.user_id,
      'flag_planted_summit',
      jsonb_build_object(
        'summit_name',  summit_name,
        'summit_id',    new.summit_id,
        'planter_id',   new.user_id,
        'planter_name', planter_name
      )
    );
  END LOOP;

  -- 3. Existing: notify displaced crew when their flag is taken
  FOR old_flag IN
    SELECT f.* FROM public.flags f
    WHERE f.summit_id = new.summit_id
      AND f.id != new.id
      AND f.is_active = true
      AND f.crew_id IS DISTINCT FROM new.crew_id
  LOOP
    IF old_flag.crew_id IS NOT NULL THEN
      FOR victim_member IN
        SELECT cm.user_id FROM public.crew_members cm
        WHERE cm.crew_id = old_flag.crew_id
      LOOP
        INSERT INTO public.notifications (user_id, type, payload)
        VALUES (
          victim_member.user_id,
          'flag_stolen',
          jsonb_build_object(
            'summit_name',      summit_name,
            'summit_id',        new.summit_id,
            'attacker_crew_id', new.crew_id
          )
        );
      END LOOP;
    END IF;
  END LOOP;

  -- 4. Deactivate all other active flags on this summit
  UPDATE public.flags
  SET is_active = false
  WHERE summit_id = new.summit_id
    AND id != new.id
    AND is_active = true;

  RETURN new;
END;
$$;
