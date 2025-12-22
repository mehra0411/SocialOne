-- Extend feed post status enum for scheduling-ready publishing state machine
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'feed_post_status') THEN
    ALTER TYPE public.feed_post_status ADD VALUE IF NOT EXISTS 'scheduled';
    ALTER TYPE public.feed_post_status ADD VALUE IF NOT EXISTS 'publishing';
  END IF;
END $$;

-- Extend reels status enum for publishing state machine (generation states still exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reel_status') THEN
    ALTER TYPE public.reel_status ADD VALUE IF NOT EXISTS 'scheduled';
    ALTER TYPE public.reel_status ADD VALUE IF NOT EXISTS 'publishing';
  END IF;
END $$;


