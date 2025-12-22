ALTER TABLE public.feed_posts
ADD COLUMN IF NOT EXISTS scheduled_at timestamp with time zone;

ALTER TABLE public.feed_posts
ADD COLUMN IF NOT EXISTS published_at timestamp with time zone;

ALTER TABLE public.feed_posts
ADD COLUMN IF NOT EXISTS failed_at timestamp with time zone;

ALTER TABLE public.reels
ADD COLUMN IF NOT EXISTS scheduled_at timestamp with time zone;

ALTER TABLE public.reels
ADD COLUMN IF NOT EXISTS published_at timestamp with time zone;

ALTER TABLE public.reels
ADD COLUMN IF NOT EXISTS failed_at timestamp with time zone;


