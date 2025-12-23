-- Add publish result fields for feed posts (minimal, required for real IG publishing)
ALTER TABLE public.feed_posts
  ADD COLUMN IF NOT EXISTS instagram_post_id text;

ALTER TABLE public.feed_posts
  ADD COLUMN IF NOT EXISTS error_message text;


