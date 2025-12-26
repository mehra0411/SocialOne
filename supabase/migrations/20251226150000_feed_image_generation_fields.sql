-- Feed image generation tracking + persisted output fields (no new tables)
-- Used to enforce abuse/cost guards and persist generation results on the draft.

ALTER TABLE public.feed_posts
  ADD COLUMN IF NOT EXISTS image_prompt text,
  ADD COLUMN IF NOT EXISTS image_mode text,
  ADD COLUMN IF NOT EXISTS image_status text,
  ADD COLUMN IF NOT EXISTS image_cost_cents integer,
  ADD COLUMN IF NOT EXISTS image_generated_at timestamp with time zone,
  -- Total generations for this draft (lifetime)
  ADD COLUMN IF NOT EXISTS image_generation_count_total integer NOT NULL DEFAULT 0,
  -- Per-day counter (to enforce brand/day limits via SUM across drafts)
  ADD COLUMN IF NOT EXISTS image_generation_day date,
  ADD COLUMN IF NOT EXISTS image_generation_count_day integer NOT NULL DEFAULT 0;


