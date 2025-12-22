ALTER TABLE public.feed_posts
ADD COLUMN IF NOT EXISTS platform text NOT NULL DEFAULT 'instagram';

ALTER TABLE public.reels
ADD COLUMN IF NOT EXISTS platform text NOT NULL DEFAULT 'instagram';


