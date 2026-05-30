-- Migration 009: Short invite codes for crews
-- Replace raw UUID sharing with a human-readable 6-char alphanumeric code

ALTER TABLE public.crews ADD COLUMN IF NOT EXISTS invite_code text UNIQUE;

-- Backfill existing crews: take first 6 chars of UUID (without dashes), uppercased
UPDATE public.crews
SET invite_code = UPPER(LEFT(REPLACE(id::text, '-', ''), 6))
WHERE invite_code IS NULL;

ALTER TABLE public.crews ALTER COLUMN invite_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_crews_invite_code ON public.crews(invite_code);
