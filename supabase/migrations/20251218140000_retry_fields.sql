ALTER TABLE public.feed_posts
ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.feed_posts
ADD COLUMN IF NOT EXISTS last_retry_at timestamp with time zone;

ALTER TABLE public.reels
ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.reels
ADD COLUMN IF NOT EXISTS last_retry_at timestamp with time zone;


