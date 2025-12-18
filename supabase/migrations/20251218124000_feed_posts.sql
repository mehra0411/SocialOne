-- Enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'feed_post_status') THEN
    CREATE TYPE public.feed_post_status AS ENUM ('draft', 'published', 'failed');
  END IF;
END $$;

-- Table
CREATE TABLE IF NOT EXISTS public.feed_posts (
  id uuid PRIMARY KEY,
  brand_id uuid NOT NULL REFERENCES public.brands(id),
  caption text,
  image_url text,
  status public.feed_post_status NOT NULL DEFAULT 'draft',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_feed_posts_brand_id
ON public.feed_posts (brand_id);
